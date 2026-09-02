#!/bin/bash
# Start show server in foreground — does NOT install launchd.
# Usage: ./start-show-server.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_LOCAL="$DIR/show.env.local"
ENV_EXAMPLE="$DIR/show.env.example"

if [[ -f "$ENV_LOCAL" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_LOCAL"
elif [[ -f "$ENV_EXAMPLE" ]]; then
  echo "[show] warning: using show.env.example — copy to show.env.local and edit" >&2
  # shellcheck source=/dev/null
  source "$ENV_EXAMPLE"
else
  echo "[show] missing show.env.local" >&2
  exit 1
fi

: "${IZBRISANI_ROOT:?set IZBRISANI_ROOT in show.env.local}"
: "${NODE_BIN:=$(command -v node)}"

cd "$IZBRISANI_ROOT"
export AUDIO_BACKEND="${AUDIO_BACKEND:-osc}"
export SHELLY_URL="${SHELLY_URL:-}"
export ESP32_URL="${ESP32_URL:-}"
export SEANCE_SETTLE_MS="${SEANCE_SETTLE_MS:-3000}"

echo "[show] starting $NODE_BIN server/index.js in $IZBRISANI_ROOT"
echo "[show] AUDIO_BACKEND=$AUDIO_BACKEND SHELLY_URL=${SHELLY_URL:-<empty>} ESP32_URL=${ESP32_URL:-<empty>}"
exec "$NODE_BIN" server/index.js
