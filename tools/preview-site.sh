#!/usr/bin/env bash
# Build (or fully test) the workshop, then serve it for local review.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${PORT:-8765}"
RUN_TESTS=0
OPEN_BROWSER=0

usage() {
  printf '%s\n' \
    'Usage: tools/preview-site.sh [--test] [--open] [--port PORT]' \
    '' \
    '  --test       Run the complete test suite before serving.' \
    '  --open       Open the preview in the default browser.' \
    '  --port PORT  Serve on PORT (default: 8765).'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --test)
      RUN_TESTS=1
      shift
      ;;
    --open)
      OPEN_BROWSER=1
      shift
      ;;
    --port)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      PORT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$PORT" in
  ''|*[!0-9]*) printf 'Port must be a number: %s\n' "$PORT" >&2; exit 2 ;;
esac

cd "$REPO_ROOT"
export PORT
if [ "$RUN_TESTS" = "1" ]; then
  tools/run-tests.sh
else
  tools/build-site.sh
fi

URL="http://localhost:$PORT/_site/"
printf '\nWorkshop preview: %s\nPress Ctrl-C to stop.\n\n' "$URL"

if [ "$OPEN_BROWSER" = "1" ]; then
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  else
    printf 'No browser-opening command found; open the URL above manually.\n' >&2
  fi
fi

exec python3 -m http.server "$PORT" --directory "$REPO_ROOT"
