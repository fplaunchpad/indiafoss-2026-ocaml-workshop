#!/usr/bin/env bash
# Build assets/x-ocaml/joy_core.js: the Joy toplevel payload that the
# Joy page (content/joy.md, frontmatter key [toplevel_load]) side-loads
# into the x-ocaml worker through the runtime's src-load attribute.
#
# The payload is compiled from vendor/joy/core, the same sources that
# ocaml-mdx validates content/joy.md against, and with the same opam
# switch that builds the x-ocaml worker, so the embedded .cmi files
# match the worker's OCaml version. (A payload built by a different
# OCaml fails in the browser with "joy_core.cmi is not a compiled
# interface for this version of OCaml".)
#
# It is the concatenation of two js_of_ocaml outputs:
#   1. the compiled bytecode of joy_core.cma, and
#   2. a pseudo-filesystem registering each .cmi under /static/cmis/,
#      where the jsoo toplevel looks interfaces up.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"
opam exec -- dune build vendor/joy/core/joy_core.cma

OBJ="$REPO_ROOT/_build/default/vendor/joy/core"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

opam exec -- js_of_ocaml compile "$OBJ/joy_core.cma" -o "$TMP/code.js"

args=()
for f in "$OBJ"/.joy_core.objs/byte/*.cmi; do
  args+=("$f:/static/cmis/$(basename "$f")")
done
opam exec -- js_of_ocaml build-fs -o "$TMP/fs.js" "${args[@]}"

cat "$TMP/code.js" "$TMP/fs.js" > "$REPO_ROOT/assets/x-ocaml/joy_core.js"
ls -la "$REPO_ROOT/assets/x-ocaml/joy_core.js"
