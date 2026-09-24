#!/usr/bin/env python3
"""Render cheatsheets/**/*.mdx into plain static HTML pages.

This is intentionally separate from the tools/workshop-build pipeline
that renders content/*.md chapters (that pipeline has strict
frontmatter/div rules tightly coupled to the interactive OCaml quiz
cells). Cheat sheets are plain reference pages: a title, a few
headings, paragraphs, code blocks, lists, and links. A small
hand-rolled Markdown-to-HTML converter is enough; no new dependency
is introduced.

Usage: tools/gen-cheatsheets.py [--src DIR] [--out DIR]

Defaults: --src cheatsheets, --out _site/cheatsheets, both resolved
relative to the repository root (the parent of this file's directory).
"""

from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split a leading `---\\n...\\n---` YAML-ish block off the body.

    Only single-line `key: "value"` / `key: value` entries are
    supported -- the cheat sheets only ever set `title`.
    """
    meta: dict = {}
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            block = text[4:end]
            body = text[end + 4 :].lstrip("\n")
            for line in block.splitlines():
                if ":" not in line:
                    continue
                key, _, value = line.partition(":")
                value = value.strip().strip('"').strip("'")
                meta[key.strip()] = value
            return meta, body
    return meta, text


INLINE_CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
ITALIC_RE = re.compile(r"\*([^*]+)\*")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def render_inline(text: str) -> str:
    text = html.escape(text, quote=False)
    # Links first so escaped brackets inside link text still work.
    text = LINK_RE.sub(lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', text)
    text = BOLD_RE.sub(lambda m: f"<strong>{m.group(1)}</strong>", text)
    text = ITALIC_RE.sub(lambda m: f"<em>{m.group(1)}</em>", text)
    text = INLINE_CODE_RE.sub(lambda m: f"<code>{m.group(1)}</code>", text)
    return text


def render_markdown(body: str) -> str:
    lines = body.splitlines()
    out: list[str] = []
    i = 0
    paragraph: list[str] = []
    list_items: list[str] = []

    def flush_paragraph():
        if paragraph:
            out.append("<p>" + render_inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    def flush_list():
        if list_items:
            out.append("<ul>")
            for item in list_items:
                out.append("<li>" + render_inline(item) + "</li>")
            out.append("</ul>")
            list_items.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            flush_list()
            lang = stripped[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            code = html.escape("\n".join(code_lines), quote=False)
            cls = f' class="language-{lang}"' if lang else ""
            out.append(f"<pre><code{cls}>{code}</code></pre>")
            continue

        if not stripped:
            flush_paragraph()
            flush_list()
            i += 1
            continue

        heading_match = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if heading_match:
            flush_paragraph()
            flush_list()
            level = len(heading_match.group(1))
            out.append(f"<h{level}>{render_inline(heading_match.group(2))}</h{level}>")
            i += 1
            continue

        if stripped.startswith("- "):
            flush_paragraph()
            list_items.append(stripped[2:])
            i += 1
            continue

        if list_items and not paragraph:
            # Lazy continuation of the list item above (an indented or
            # wrapped line with no blank line separating it).
            list_items[-1] += " " + stripped
            i += 1
            continue

        paragraph.append(stripped)
        i += 1

    flush_paragraph()
    flush_list()
    return "\n".join(out)


def sibling_pages(dir_path: Path) -> list[tuple[str, str]]:
    """(href, title) for every non-index .mdx file directly inside
    `dir_path`, sorted by filename. Used to build the cheat-sheet
    sidebar -- deliberately reading straight off the filesystem rather
    than the real content/*.md manifest, since cheat sheets are not
    wired into the workshop outline.
    """
    pages = []
    for f in sorted(dir_path.glob("*.mdx")):
        if f.name == "index.mdx":
            continue
        meta, _ = parse_frontmatter(f.read_text(encoding="utf-8"))
        title = meta.get("title") or f.stem.replace("-", " ").title()
        pages.append((f.with_suffix(".html").name, title))
    return pages


def _lab_chapter_number(dir_name: str) -> int | None:
    """The numeric chapter prefix of this lab's real chapter page
    (e.g. "tic-tac-toe" -> content/04-tic-tac-toe.md -> 4), found via
    the same content/*-<dir_name>.md glob as `chapter_href` below.
    None if there's no matching chapter file, or its stem has no
    leading digits.
    """
    href = chapter_href(dir_name)
    if href is None:
        return None
    m = re.match(r"^(\d+)", href)
    return int(m.group(1)) if m else None


def discover_labs(src_root: Path) -> list[Path]:
    """Every lab subdirectory directly under `src_root` that has at
    least one cheat-sheet page, sorted by the numeric chapter prefix
    of its real chapter page under content/ (e.g. tic-tac-toe's 04
    before game-of-life's 05) -- the same ordering the rest of the
    site uses -- falling back to alphabetical-by-name for any lab with
    no matching chapter file, so nothing crashes if this is ever used
    for a cheat-sheet directory that doesn't map to a content/*.md
    file. Deliberately generic -- a third lab's cheatsheets/<name>/
    directory is picked up automatically, with no lab name hardcoded
    anywhere.
    """
    dirs = [d for d in src_root.iterdir() if d.is_dir() and any(d.glob("*.mdx"))]

    def sort_key(d: Path) -> tuple[int, int | str]:
        number = _lab_chapter_number(d.name)
        return (0, number) if number is not None else (1, d.name)

    return sorted(dirs, key=sort_key)


def lab_title(dir_path: Path) -> str:
    """A short label for the sidebar header, e.g. 'Tic-Tac-Toe lab'."""
    index = dir_path / "index.mdx"
    if index.is_file():
        meta, _ = parse_frontmatter(index.read_text(encoding="utf-8"))
        title = meta.get("title", "")
        prefix = "Cheat sheets: "
        if title.startswith(prefix):
            return title[len(prefix) :]
        if title:
            return title
    return dir_path.name.replace("-", " ").title()


def render_sidebar(src_root: Path, current_dir: Path, current_name: str) -> str:
    """The shared cheat-sheet nav for *every* lab under `src_root`, one
    group per lab. Built with the same markup and class names as the
    real chapter sidebar (`render_sidebar` in
    tools/workshop-build/lib/emit.ml) so assets/css/chapter.css styles
    it identically -- that sidebar groups its "Game lab" entries the
    same way this one groups each lab: a `sidebar-title sidebar-group`
    header followed by its own `sidebar-parts` list. Populated by
    reading every lab directory straight off the filesystem, not the
    real chapter manifest.
    """
    buf = ['<aside class="sidebar chapter-only">']
    buf.append('  <nav class="sidebar-nav" aria-label="Cheat sheets">')
    buf.append('    <div class="sidebar-title">Cheat sheets</div>')

    def item(href: str, label: str, current: bool) -> str:
        cls = ' class="current"' if current else ""
        return f'      <li{cls}><a href="{html.escape(href)}">{html.escape(label)}</a></li>'

    for lab_dir in discover_labs(src_root):
        pages = sibling_pages(lab_dir)
        if not pages:
            continue
        same_lab = lab_dir == current_dir
        prefix = "" if same_lab else f"../{lab_dir.name}/"
        label = html.escape(lab_title(lab_dir))
        buf.append(f'    <div class="sidebar-title sidebar-group">{label}</div>')
        buf.append('    <ul class="sidebar-parts">')
        for href, page_title in pages:
            current = same_lab and href == current_name
            buf.append(item(prefix + href, page_title, current))
        buf.append("    </ul>")

    buf.append("  </nav>")
    buf.append("</aside>")
    return "\n".join(buf)


# Same page shell as a real chapter page (see `head` / `header_bar` /
# `render_sidebar` / `render_body` in tools/workshop-build/lib/emit.ml):
# the same stylesheet, the same `.page-header` / `.sidebar` /
# `.sidebar-nav` / `.sidebar-parts` / `article.chapter` markup and class
# names, so assets/css/chapter.css lays it out and themes it the same
# way. Deliberately dropped: the Run/Run-all/Clear-outputs/Reset-cells
# toolbar and the slide-mode toggle, since cheat sheets have no
# interactive cells or slide deck.
#
# chapter.css has no dark-mode rules at all (grep confirms zero
# `prefers-color-scheme` occurrences) -- real chapter pages are always
# rendered with the light palette, in any OS/browser color scheme. To
# be the *same* theme, this page does the same: no `color-scheme`
# opt-in and no dark palette of its own, so there is nothing left that
# could go dark and unreadable (the earlier code-block contrast bug
# was exactly that kind of drift). The only supplementary rule below
# is `.back`, a small link chapter.css has no equivalent for.
PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="{asset_root}assets/css/chapter.css">
<style>
  .back {{
    display: inline-block;
    margin: 0 0 1rem;
    font-size: 0.85rem;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--muted);
    text-decoration: none;
  }}
  .back:hover {{ text-decoration: underline; color: var(--accent); }}
</style>
</head>
<body class="mode-chapter">
  <header class="page-header">
    <button class="sidebar-collapse chapter-only" type="button" title="Show or hide the cheat sheet index" aria-label="Toggle cheat sheet index">&#9776;</button>
    <a class="home-link" href="{asset_root}index.html" title="Workshop landing page" aria-label="Workshop landing page">&#x2302;</a>
    <div class="part-meta">Cheat sheet</div>
    <h1 class="part-title">{title}</h1>
  </header>
{sidebar}
<article class="chapter">
<a class="back" href="{back_href}">&larr; {back_label}</a>
{content}
</article>
<script>
  (function () {{
    var KEY = 'indiafoss-ocaml-sidebar-hidden';
    var body = document.body;
    function apply(hidden) {{ body.classList.toggle('sidebar-hidden', hidden); }}
    try {{ apply(localStorage.getItem(KEY) === '1'); }} catch (e) {{}}
    var btn = document.querySelector('.sidebar-collapse');
    if (btn) {{
      btn.addEventListener('click', function () {{
        var hidden = !body.classList.contains('sidebar-hidden');
        apply(hidden);
        try {{ localStorage.setItem(KEY, hidden ? '1' : '0'); }} catch (e) {{}}
      }});
    }}
  }})();
</script>
</body>
</html>
"""


def chapter_href(dir_name: str) -> str | None:
    """The real chapter page this lab's cheat sheets belong to, found
    by matching content/*-<dir_name>.md (e.g. "tic-tac-toe" ->
    content/04-tic-tac-toe.md -> "04-tic-tac-toe.html"). There is no
    cheat-sheet overview/index page -- each cheat sheet links straight
    back to the lab itself.
    """
    matches = sorted((REPO_ROOT / "content").glob(f"*-{dir_name}.md"))
    if not matches:
        return None
    return matches[0].stem + ".html"


def render_file(src: Path, src_root: Path, out_root: Path) -> Path:
    text = src.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    title = meta.get("title") or src.stem.replace("-", " ").title()
    content_html = render_markdown(body)

    rel = src.relative_to(src_root)
    out_path = (out_root / rel).with_suffix(".html")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Depth from this page back up to the _site root: one level for
    # cheatsheets/ itself, plus one per subdirectory in `rel` -- i.e.
    # len(rel.parts) (the last part is the filename, which is exactly
    # the one subdirectory level cheatsheets/ itself contributes).
    depth = len(rel.parts)
    asset_root = "../" * depth

    chapter = chapter_href(src.parent.name)
    if chapter:
        back_href = asset_root + chapter
        back_label = "Back to the lab"
    else:
        back_href = asset_root + "index.html" if depth else "index.html"
        back_label = "Workshop home"

    out_name = out_path.name
    sidebar_html = render_sidebar(src_root, src.parent, out_name)

    page = PAGE_TEMPLATE.format(
        title=html.escape(title, quote=True),
        content=content_html,
        back_href=back_href,
        back_label=back_label,
        asset_root=asset_root,
        sidebar=sidebar_html,
    )
    out_path.write_text(page, encoding="utf-8")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", default=str(REPO_ROOT / "cheatsheets"))
    parser.add_argument("--out", default=str(REPO_ROOT / "_site" / "cheatsheets"))
    args = parser.parse_args()

    src_root = Path(args.src).resolve()
    out_root = Path(args.out).resolve()

    if not src_root.is_dir():
        print(f"no cheatsheets source directory at {src_root}, skipping")
        return

    mdx_files = sorted(src_root.rglob("*.mdx"))
    if not mdx_files:
        print(f"no .mdx files found under {src_root}")
        return

    for src in mdx_files:
        out_path = render_file(src, src_root, out_root)
        print(f"built {out_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
