# Vendored ocaml-joy core

Source: https://github.com/Sudha247/ocaml-joy, `svg` branch, `core/`
library. MIT license (see LICENSE).

These sources serve two purposes: `ocaml-mdx` typechecks and executes
the Joy code cells in `content/06-joy.md` against them at build time, and
`tools/build-joy.sh` compiles them (with js_of_ocaml) into
`assets/x-ocaml/joy_core.js`, the toplevel payload the browser cells on
the Joy page actually run. The upstream prebuilt payload is not used:
it targets a different OCaml version than our x-ocaml worker. Refresh
the sources and rebuild the payload with `tools/update-joy.sh`.
