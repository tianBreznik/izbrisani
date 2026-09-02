#!/usr/bin/env bash
# Push desk_client.py to all four Pis via SSH (cat | ssh — works when scp is broken).
#
# Usage (from anywhere):
#   ./deploy/desk-pi/pyclient/push-all.sh
#
# Requires desks.env.local (copy from desks.env.example).

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/desk_client.py"
ENV_FILE="${DESKS_ENV:-$HERE/desks.env.local}"

if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE — copy desks.env.example → desks.env.local and set IPs" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

REMOTE_DIR="${REMOTE_DIR:-~/izbrisani-pyclient}"

hosts=(
  "${DESK_1:?set DESK_1 in $ENV_FILE}"
  "${DESK_2:?set DESK_2 in $ENV_FILE}"
  "${DESK_3:?set DESK_3 in $ENV_FILE}"
  "${DESK_4:?set DESK_4 in $ENV_FILE}"
)

for host in "${hosts[@]}"; do
  echo "→ push $SRC → $host:$REMOTE_DIR/desk_client.py"
  ssh "$host" "mkdir -p $REMOTE_DIR"
  # Avoid scp path quirks on old macOS — stream over SSH.
  cat "$SRC" | ssh "$host" "cat > $REMOTE_DIR/desk_client.py"
  ssh "$host" "wc -c $REMOTE_DIR/desk_client.py"
done

echo "done — all four Pis updated"
