#!/usr/bin/env bash
# Validate, build, and smoke-test the workshop site.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

python3 tools/check-links.py
opam exec -- dune runtest
# Exercise the exact checked-out assets, not a possibly stale _site/assets
# directory left by an earlier preview or production-copy build.
COPY_ASSETS=1 tools/build-site.sh
python3 tools/check-game-cells.py

PORT="${PORT:-8765}"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory _site >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in 1 2 3 4 5; do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/test/smoke.html" && break
  sleep 0.3
done

node tools/playwright-check.mjs "http://127.0.0.1:$PORT/test/smoke.html"
node tools/playwright-overflow-check.mjs "http://127.0.0.1:$PORT"
node tools/playwright-chapter-layout-check.mjs "http://127.0.0.1:$PORT"
node tools/playwright-games-check.mjs "http://127.0.0.1:$PORT"

printf 'All workshop checks passed.\n'
