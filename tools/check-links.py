#!/usr/bin/env python3
"""Validate workshop links, heading anchors, and asset references.

Heading ids on the rendered pages are assigned client-side by the
slugify() in tools/workshop-build/lib/emit.ml:

    lowercase
    -> drop every char not [a-z0-9 \\s -]   (underscores, backticks,
                                            colons, parens all vanish)
    -> whitespace runs to '-'
    -> collapse '-' runs, trim leading/trailing '-'
    -> truncate to 80 chars
    -> '-2', '-3', ... suffix on collision (document order)

This script recomputes those ids from the markdown sources (h2-h4
only: that is the set the client-side anchor pass targets) and then
checks every internal link in content/*.md:

    [text](02-data-types.html#anchor)  file + anchor must resolve
    [text](02-data-types.html)         file must resolve
    [text](#anchor)                    same-file anchor
    /assets/... refs                   file must exist on disk

It also checks the ../-relative links in games/*.html
(href="../02-data-types.html#anchor" and the like), which point
back into the built workshop pages and would otherwise break
silently when a heading is renamed.

Exit 0 when everything resolves; exit 1 with a failure list otherwise.
"""

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(REPO, "content")
GAMES = os.path.join(REPO, "games")

# Pages emitted by tools/build-site.sh rather than from lectures/.
BUILT_PAGES = {"index.html"}


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    s = s.strip("-")
    return s[:80]


def strip_inline_markdown(s: str) -> str:
    """Approximate the rendered textContent of a heading line."""
    s = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", s)  # images -> alt
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)  # links -> text
    s = s.replace("`", "")
    s = re.sub(r"\*\*?|__?", "", s)
    s = re.sub(r"<[^>]+>", "", s)  # raw html tags
    return s.strip()


def frontmatter_field(lines, key):
    in_fm = False
    for i, line in enumerate(lines):
        if i == 0 and line.strip() == "---":
            in_fm = True
            continue
        if in_fm:
            if line.strip() == "---":
                return None
            m = re.match(rf"^{key}:\s*(.+)$", line)
            if m:
                return m.group(1).strip().strip("\"'")
    return None


def heading_ids(md_path: str) -> set:
    """All ids the anchor pass will assign on this page, in order."""
    with open(md_path, encoding="utf-8") as f:
        text = f.read()
    lines = text.split("\n")

    texts = []
    in_fence = False
    in_fm = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if i == 0 and stripped == "---":
            in_fm = True
            continue
        if in_fm:
            if stripped == "---":
                in_fm = False
            continue
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = re.match(r"^(#{2,4})\s+(.*)$", line)
        if m:
            texts.append(strip_inline_markdown(m.group(2)))

    seen = {}
    ids = set()
    for t in texts:
        base = slugify(t)
        if not base:
            continue
        if base in seen:
            n = 2
            while f"{base}-{n}" in seen:
                n += 1
            base = f"{base}-{n}"
        seen[base] = True
        ids.add(base)
    return ids


def internal_links(md_path: str):
    """Yield (lineno, target, anchor) for internal links; skip externals."""
    with open(md_path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    in_fence = False
    for lineno, line in enumerate(lines, 1):
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for m in re.finditer(r"\]\(([^)\s]+)\)", line):
            url = m.group(1)
            if re.match(r"^[a-z]+:", url):  # http:, https:, mailto:
                continue
            if url.startswith("#"):
                yield lineno, None, url[1:]
            elif ".html" in url:
                target, _, anchor = url.partition("#")
                yield lineno, target.lstrip("./"), anchor or None
            elif url.startswith("/assets/") or url.startswith("assets/"):
                yield lineno, url, "ASSET"
        for m in re.finditer(r'(?:src|href)="(/assets/[^"]+)"', line):
            yield lineno, m.group(1), "ASSET"


def game_links(html_path: str):
    """Yield (lineno, target, anchor) for ../-relative hrefs in a game page."""
    with open(html_path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    for lineno, line in enumerate(lines, 1):
        for m in re.finditer(r'href="\.\./([^"#]+)(?:#([^"]+))?"', line):
            yield lineno, m.group(1), m.group(2)


def main():
    md_files = sorted(
        f for f in os.listdir(CONTENT)
        if re.match(r"\d\d-.*\.md$", f)
    )
    ids_by_page = {f: heading_ids(os.path.join(CONTENT, f)) for f in md_files}
    pages = {f[:-3] + ".html" for f in md_files}

    failures = []
    for f in md_files:
        for lineno, target, anchor in internal_links(os.path.join(CONTENT, f)):
            where = f"content/{f}:{lineno}"
            if anchor == "ASSET":
                rel = target.split("?")[0].lstrip("/")
                if not os.path.exists(os.path.join(REPO, rel)):
                    failures.append(f"{where}: missing asset {target}")
                continue
            if target is None:  # same-page anchor
                if anchor not in ids_by_page[f]:
                    failures.append(f"{where}: dead same-page anchor #{anchor}")
                continue
            base = os.path.basename(target)
            if base in BUILT_PAGES:
                continue
            if base not in pages:
                failures.append(f"{where}: link to unknown page {target}")
                continue
            if anchor:
                src_md = base[:-5] + ".md"
                if anchor not in ids_by_page.get(src_md, set()):
                    failures.append(
                        f"{where}: dead anchor {base}#{anchor}"
                    )

    game_files = sorted(
        f for f in os.listdir(GAMES) if f.endswith(".html")
    ) if os.path.isdir(GAMES) else []
    n_game_links = 0
    for f in game_files:
        for lineno, target, anchor in game_links(os.path.join(GAMES, f)):
            n_game_links += 1
            where = f"games/{f}:{lineno}"
            base = os.path.basename(target)
            if base in BUILT_PAGES:
                continue
            if base not in pages:
                failures.append(f"{where}: link to unknown page ../{target}")
                continue
            if anchor:
                src_md = base[:-5] + ".md"
                if anchor not in ids_by_page.get(src_md, set()):
                    failures.append(f"{where}: dead anchor {base}#{anchor}")

    if failures:
        print(f"check-links: {len(failures)} failure(s)")
        for x in failures:
            print("  " + x)
        return 1
    n_links = sum(1 for f in md_files for _ in internal_links(os.path.join(CONTENT, f)))
    print(
        f"check-links: OK ({len(md_files)} pages, {n_links} internal refs, "
        f"{n_game_links} game-page refs)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
