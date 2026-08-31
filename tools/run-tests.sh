#!/usr/bin/env bash
# Validate, build, and smoke-test the workshop site.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

python3 tools/check-links.py
python3 tools/check-game-cells.py \
  games/life_partial_list.html \
  games/tictactoe_partial_list.html
opam exec -- dune runtest
tools/build-site.sh

PORT="${PORT:-8765}"
python3 -m http.server "$PORT" --directory . >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in 1 2 3 4 5; do
  curl -sf -o /dev/null "http://localhost:$PORT/_site/test/smoke.html" && break
  sleep 0.3
done

node tools/playwright-check.mjs "http://localhost:$PORT/_site/test/smoke.html"
node tools/playwright-overflow-check.mjs "http://localhost:$PORT/_site"
node tools/playwright-games-check.mjs "http://localhost:$PORT/_site"

printf 'All workshop checks passed.\n'
