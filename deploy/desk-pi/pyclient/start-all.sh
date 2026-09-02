#!/usr/bin/env bash
# Start desk_client.py on all four Pis — same command that works by hand.
#
# Usage (from this directory):
#   ./start-all.sh

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${DESKS_ENV:-$HERE/desks.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE — copy desks.env.example → desks.env.local and set IPs" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

SHOW_URL="${SHOW_URL:?set SHOW_URL in $ENV_FILE}"
PI_USER="${PI_USER:-moderna}"
# Non-interactive SSH often has a tiny PATH — always use absolute python.
PY="/usr/bin/python3"

case "${REMOTE_DIR:-}" in
  /home/*) ;;
  *) REMOTE_DIR="/home/${PI_USER}/izbrisani-pyclient" ;;
esac

echo "REMOTE_DIR=$REMOTE_DIR"
echo "SHOW_URL=$SHOW_URL"
echo "python=$PY"

pairs=(
  "1:${DESK_1:?}"
  "2:${DESK_2:?}"
  "3:${DESK_3:?}"
  "4:${DESK_4:?}"
)

ok=0
fail=0

for entry in "${pairs[@]}"; do
  id="${entry%%:*}"
  host="${entry#*:}"
  echo ""
  echo "→ desk $id @ $host"

  # Exact same env + argv as a manual Pi desktop / SSH launch.
  remote_cmd="cd ${REMOTE_DIR} && \
pkill -f desk_client.py 2>/dev/null || true; \
DISPLAY=:0 SDL_VIDEODRIVER=x11 DESK_ID=${id} SHOW_URL=${SHOW_URL} GPIOZERO_PIN_FACTORY=lgpio \
nohup ${PY} desk_client.py >\$HOME/desk_client.log 2>&1 & \
sleep 1; \
pgrep -af desk_client.py || (echo FAILED; tail -n 40 \$HOME/desk_client.log; exit 1)"

  echo "   cmd: DISPLAY=:0 SDL_VIDEODRIVER=x11 DESK_ID=${id} SHOW_URL=${SHOW_URL} GPIOZERO_PIN_FACTORY=lgpio ${PY} desk_client.py"

  if ssh -o ConnectTimeout=8 "$host" "$remote_cmd"; then
    echo "✓ desk $id"
    ok=$((ok + 1))
  else
    echo "✗ desk $id"
    fail=$((fail + 1))
  fi
done

echo ""
echo "done — started $ok / 4  (failed $fail)"
[[ "$fail" -eq 0 ]]
