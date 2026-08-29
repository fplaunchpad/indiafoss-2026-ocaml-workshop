# Fun and Profit with OCaml

Source for the interactive beginner workshop offered at IndiaFOSS 2026.
The published workshop is at
<https://fplaunchpad.org/indiafoss-2026-ocaml-workshop/>.

The workshop has three parts:

1. OCaml basics
2. Data types and pattern matching
3. Modules and abstraction

Every OCaml block is editable and runnable in the browser. Each page can
also switch into a reveal.js slide deck for the live session.

## Build locally

```sh
opam switch create . 5.4.0
opam install . --deps-only --with-test
npm install

tools/build-site.sh
python3 -m http.server 8765
```

Open <http://localhost:8765/_site/>.

## Test

```sh
tools/run-tests.sh
```

This validates the Markdown code blocks, tests the static-site builder,
renders the site, and runs the browser smoke checks.

## Project layout

- `content/` — the three workshop parts and their navigation labels
- `tools/workshop-build/` — Markdown-to-HTML builder
- `assets/x-ocaml/` — prebuilt in-browser OCaml runtime
- `assets/reveal/`, `assets/katex/`, `assets/css/` — presentation assets
- `tools/build-site.sh` — complete site build

## Sources and licensing

The workshop adapts material from KC Sivaramakrishnan's
[OCaml tutorial for Abstraction 2019](https://github.com/kayceesrk/ocaml-tutorial/tree/master)
and reuses parts of the static-site infrastructure originally developed for
[Functional Programming with OCaml](https://github.com/fplaunchpad/ocaml_nptel).
See [LICENSE](LICENSE) and [LICENSES.md](LICENSES.md) for details.
