#!/bin/bash
# Optional: start SuperCollider with show patch — manual / launchd helper.
# Edit SC_PATH and SC_PATCH in show.env.local
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_LOCAL="$DIR/show.env.local"

if [[ -f "$ENV_LOCAL" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_LOCAL"
fi

: "${SC_PATH:=/Applications/SuperCollider.app/Contents/MacOS/sclang}"
: "${SC_PATCH:=$IZBRISANI_ROOT/supercollider/anatomija_pregona-2026-09-01.scd}"

if [[ ! -x "$SC_PATH" ]]; then
  echo "[sc] SuperCollider not found at SC_PATH=$SC_PATH" >&2
  echo "[sc] Open SC manually and evaluate the patch — that's fine for bench." >&2
  exit 1
fi

if [[ ! -f "$SC_PATCH" ]]; then
  echo "[sc] patch not found: $SC_PATCH" >&2
  exit 1
fi

echo "[sc] running $SC_PATCH"
exec "$SC_PATH" "$SC_PATCH"
