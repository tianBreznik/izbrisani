#!/usr/bin/env bash
# Start desk_client.py on all four Pis over SSH (display on each Pi desktop).
#
# Usage:
#   ./deploy/desk-pi/pyclient/start-all.sh
#
# Requires desks.env.local. Mac must already be running: npm start

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
PYTHON="${PYTHON:-/usr/bin/python3}"

case "${REMOTE_DIR:-}" in
  /home/*) ;;
  *) REMOTE_DIR="/home/${PI_USER}/izbrisani-pyclient" ;;
esac

echo "REMOTE_DIR=$REMOTE_DIR SHOW_URL=$SHOW_URL"

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
  echo "→ start desk $id on $host"

  # Run a small remote script: kill old client, start new one under nohup,
  # then report whether a process is listening. Avoid ssh -f (easy to
  # return before the remote command actually launches).
  if ! ssh -o ConnectTimeout=8 "$host" bash -s <<EOF
set -e
cd '$REMOTE_DIR'
test -f desk_client.py
pkill -f '[d]esk_client.py' 2>/dev/null || true
sleep 0.3
export DISPLAY=:0
export SDL_VIDEODRIVER=x11
export DESK_ID=$id
export SHOW_URL='$SHOW_URL'
export GPIOZERO_PIN_FACTORY=lgpio
nohup $PYTHON -u desk_client.py >\$HOME/desk_client.log 2>&1 &
sleep 0.8
if pgrep -af desk_client.py >/dev/null; then
  echo "RUNNING: \$(pgrep -af desk_client.py | head -1)"
  tail -n 8 \$HOME/desk_client.log || true
  exit 0
fi
echo "NOT RUNNING — last log:"
tail -n 30 \$HOME/desk_client.log || true
exit 1
EOF
  then
    echo "✗ desk $id failed (ssh or remote start)"
    fail=$((fail + 1))
  else
    echo "✓ desk $id"
    ok=$((ok + 1))
  fi
done

echo ""
echo "done — started $ok / 4  (failed $fail)"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
