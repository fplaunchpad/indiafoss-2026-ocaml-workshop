#!/usr/bin/env bash
# Build the three workshop parts and a small landing page.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN="$REPO_ROOT/_build/default/tools/workshop-build/bin/main.exe"
ASSET_ROOT="${ASSET_ROOT:-}"
COPY_ASSETS="${COPY_ASSETS:-0}"

(cd "$REPO_ROOT" && opam exec -- dune build tools/workshop-build/bin/main.exe >/dev/null)

if [ "$#" -gt 0 ]; then
  files=("$@")
else
  files=("$REPO_ROOT"/content/[0-9][0-9]-*.md "$REPO_ROOT/content/joy.md")
fi

mkdir -p "$REPO_ROOT/_site"
for src in "${files[@]}"; do
  [ -f "$src" ] || continue
  base="$(basename "$src" .md)"
  "$BIN" "$src" "$REPO_ROOT/_site/$base.html" "$ASSET_ROOT"
  printf 'built _site/%s.html\n' "$base"
done

if [ -f "$REPO_ROOT/tools/workshop-build/test/smoke.md" ]; then
  mkdir -p "$REPO_ROOT/_site/test"
  "$BIN" "$REPO_ROOT/tools/workshop-build/test/smoke.md" \
    "$REPO_ROOT/_site/test/smoke.html" "$ASSET_ROOT"
fi

if [ "$COPY_ASSETS" = "1" ]; then
  rm -rf "$REPO_ROOT/_site/assets"
  cp -R "$REPO_ROOT/assets" "$REPO_ROOT/_site/assets"
fi

if [ -d "$REPO_ROOT/games" ]; then
  rm -rf "$REPO_ROOT/_site/games"
  cp -R "$REPO_ROOT/games" "$REPO_ROOT/_site/games"
fi

cat > "$REPO_ROOT/_site/index.html" <<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fun and Profit with OCaml · IndiaFOSS 2026</title>
  <link rel="stylesheet" href="${ASSET_ROOT}/assets/css/chapter.css">
  <style>
    .landing { max-width: 720px; margin: 3rem auto; padding: 0 1.25rem 4rem; }
    .eyebrow { margin-bottom: .5rem; color: var(--muted); font: 600 .8rem/1.4
      ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    .landing h1 { margin: 0 0 .75rem; font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: clamp(2rem, 7vw, 3.25rem); line-height: 1.05; }
    .intro { max-width: 580px; font-size: 1.15rem; }
    .start { display: inline-block; margin: 1rem 0 2.5rem; padding: .8rem 1.2rem;
      border-radius: 8px; background: var(--accent); color: white; font-weight: 700;
      text-decoration: none; }
    .start:hover { filter: brightness(.9); }
    .landing h2 { margin-top: 0; font-size: 1.15rem; }
    .parts { display: grid; gap: .75rem; margin: 1rem 0 2.5rem; padding: 0; list-style: none; }
    .parts a { display: grid; grid-template-columns: 4.5rem 1fr; gap: .75rem;
      padding: .9rem 1rem; border: 1px solid var(--rule);
      border-radius: 8px; color: var(--accent); text-decoration: none; }
    .parts a:hover { background: var(--code-bg); }
    .part-no { color: var(--muted); font-size: .8rem; letter-spacing: .05em;
      text-transform: uppercase; }
    .part-title { display: block; font-weight: 700; }
    .part-summary { display: block; margin-top: .15rem; color: var(--text);
      font-size: .9rem; }
    .games { margin-bottom: 2.5rem; }
    .games a { grid-template-columns: minmax(4.5rem, max-content) minmax(0, 1fr); }
    @media (max-width: 480px) {
      .games a { grid-template-columns: 1fr; gap: .25rem; }
    }
    .after { padding-top: 1.5rem; border-top: 1px solid var(--rule); }
    .after ul { padding-left: 1.25rem; }
  </style>
</head>
<body class="mode-chapter">
  <main class="landing">
    <p class="eyebrow">IndiaFOSS 2026 · Beginner workshop</p>
    <h1>Fun and Profit with OCaml</h1>
    <p class="intro">New to OCaml? Start with Part 1. You can edit and run every
      example in your browser—there is nothing to install.</p>
    <a class="start" href="01-basics.html">Start the workshop →</a>
    <h2>Or jump to a part</h2>
    <ol class="parts">
      <li><a href="01-basics.html"><span class="part-no">1</span><span>
        <span class="part-title">OCaml Basics</span>
        <span class="part-summary">Values, functions, and recursion</span>
      </span></a></li>
      <li><a href="02-data-types.html"><span class="part-no">2</span><span>
        <span class="part-title">Data Types</span>
        <span class="part-summary">Variants, pattern matching, and records</span>
      </span></a></li>
      <li><a href="03-modules.html"><span class="part-no">3</span><span>
        <span class="part-title">Modules</span>
        <span class="part-summary">Signatures and abstraction</span>
      </span></a></li>
    </ol>
    <section>
      <h2>Final 45-minute game lab</h2>
      <p>Choose one game. Tic-Tac-Toe is the recommended starting point;
        Game of Life is the challenge path. Complete the numbered problems
        first—the stretch problems are optional. Joy is a third, open-ended
        option: a creative-coding sandbox that the session does not cover,
        for anyone who would rather draw than build a game.</p>
      <p><strong>Open your chosen game during the briefing. Your answers are
        saved locally in this browser as you type.</strong></p>
      <ul class="parts games">
        <li><a href="games/life_partial_list.html"><span class="part-no">Challenge</span><span>
          <span class="part-title">Conway's Game of Life</span>
          <span class="part-summary">Build a simulation using lists</span>
        </span></a></li>
        <li><a href="games/tictactoe_partial_list.html"><span class="part-no">Recommended</span><span>
          <span class="part-title">Tic-Tac-Toe</span>
          <span class="part-summary">Build a playable game step by step</span>
        </span></a></li>
        <li><a href="joy.html"><span class="part-no">Sandbox</span><span>
          <span class="part-title">Joy: Creative Coding</span>
          <span class="part-summary">Draw with code; open-ended, nothing to complete</span>
        </span></a></li>
      </ul>
    </section>
    <section class="after">
      <h2>After the workshop</h2>
      <ul>
        <li><a href="https://ocaml.org/docs">OCaml documentation and installation</a></li>
        <li><a href="https://ocaml.org/community">OCaml community</a></li>
        <li><a href="https://dev.realworldocaml.org/">Real World OCaml</a></li>
      </ul>
    </section>
  </main>
</body>
</html>
HTML

printf 'built _site/index.html\n'
