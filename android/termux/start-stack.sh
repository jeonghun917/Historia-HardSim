#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
: "${OPEN_HISTORIA_DIR:?Set OPEN_HISTORIA_DIR to your integrated Open Historia checkout.}"

LLM_LOG="${TMPDIR:-/tmp}/historia-hardsim-llm.log"
WEB_LOG="${TMPDIR:-/tmp}/historia-hardsim-web.log"
WEB_CMD="${HARDSIM_WEB_CMD:-node server/server.js}"

cleanup() {
  [[ -n "${LLM_PID:-}" ]] && kill "$LLM_PID" 2>/dev/null || true
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$ROOT/android/termux/start-local-llm.sh" >"$LLM_LOG" 2>&1 &
LLM_PID=$!

(
  cd "$OPEN_HISTORIA_DIR"
  bash -lc "$WEB_CMD"
) >"$WEB_LOG" 2>&1 &
WEB_PID=$!

printf 'Historia HardSim local stack started.\n'
printf 'LLM endpoint: http://127.0.0.1:%s/v1\n' "${HARDSIM_LLM_PORT:-11434}"
printf 'LLM log: %s\nWeb log: %s\n' "$LLM_LOG" "$WEB_LOG"
printf 'Open the local Open Historia address printed in the web log.\n'
printf 'Press Ctrl+C to stop both processes.\n'

wait "$WEB_PID"
