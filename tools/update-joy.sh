#!/usr/bin/env bash
# Refresh the vendored ocaml-joy core sources (vendor/joy/core/) from
# the svg branch of https://github.com/Sudha247/ocaml-joy, then rebuild
# the browser payload from them (tools/build-joy.sh), so the sources
# mdx validates content/06-joy.md against and the code the browser cells
# run stay identical.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RAW=https://raw.githubusercontent.com/Sudha247/ocaml-joy/svg

core_files=(
  backend.ml backend_svg.ml backend_svg.mli base_joy.ml
  color.ml color.mli noise.ml noise.mli
  shape.ml shape.mli transform.ml transform.mli util.ml util.mli
)

for f in "${core_files[@]}"; do
  curl -sfL "$RAW/core/$f" -o "$REPO_ROOT/vendor/joy/core/$f"
  echo "vendor/joy/core/$f"
done
curl -sfL "$RAW/LICENSE" -o "$REPO_ROOT/vendor/joy/LICENSE"
echo "vendor/joy/LICENSE"

"$SCRIPT_DIR/build-joy.sh"
