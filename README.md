# Fun and Profit with OCaml

Source for the interactive beginner workshop offered at IndiaFOSS 2026.
The published workshop is at
<https://fplaunchpad.org/indiafoss-2026-ocaml-workshop/>.

The workshop has three parts:

1. OCaml basics
2. Data types and pattern matching
3. Modules and abstraction

It also includes interactive Game of Life and Tic-Tac-Toe exercises contributed
by [Smayan Agarwal](https://github.com/SmayanAgarwal) in
[PR #3](https://github.com/fplaunchpad/indiafoss-2026-ocaml-workshop/pull/3).
The three-hour session reserves its final 45 minutes for participants to choose
and work on one of these games; stretch problems can be continued afterward.

Every OCaml block is editable and runnable in the browser. Each page can
also switch into a reveal.js slide deck for the live session.

## Build locally

```sh
opam switch create . 5.4.0
opam install . --deps-only --with-test
npm install

tools/preview-site.sh
```

Open <http://localhost:8765/_site/>.

Use `tools/preview-site.sh --test` to run every check before serving,
`--open` to open the browser automatically, or `--port 9000` to choose
a different port.

## Test

```sh
tools/run-tests.sh
```

This validates the Markdown code blocks, tests the static-site builder,
renders the site, and runs the browser smoke checks.

## Project layout

- `content/` — the three workshop parts
- `tools/workshop-build/` — Markdown-to-HTML builder
- `assets/x-ocaml/` — prebuilt in-browser OCaml runtime
- `assets/reveal/`, `assets/katex/`, `assets/css/` — presentation assets
- `games/` — standalone interactive practice exercises
- `tools/build-site.sh` — complete site build
- `tools/preview-site.sh` — build and serve a local preview

## Sources and licensing

The workshop adapts material from KC Sivaramakrishnan's
[OCaml tutorial for Abstraction 2019](https://github.com/kayceesrk/ocaml-tutorial/tree/master)
and reuses parts of the static-site infrastructure originally developed for
[Functional Programming with OCaml](https://github.com/fplaunchpad/ocaml_nptel).
See [LICENSE](LICENSE) and [LICENSES.md](LICENSES.md) for details.
