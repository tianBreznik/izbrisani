#!/usr/bin/env bash
# Start show server (if needed) + desk_client.py on all four Pis.
# Passwordless after: ./setup-ssh-keys.sh
#
#   ./start-all.sh

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/fleet-common.sh"
fleet_load_env

SHOW_URL="${SHOW_URL:?set SHOW_URL in desks.env.local}"
PYTHON="${PYTHON:-/usr/bin/python3}"

echo "SHOW_URL=$SHOW_URL"
echo "REMOTE_DIR=$REMOTE_DIR"

if ! fleet_ensure_show_server; then
  exit 1
fi

fleet_require_keys || exit 1

ok=0
fail=0

while IFS= read -r entry; do
  id="${entry%%:*}"
  host="${entry#*:}"
  echo ""
  echo "→ start desk $id on $host"

  if ! fleet_ssh "$host" bash -s <<EOF
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
    echo "✗ desk $id failed"
    fail=$((fail + 1))
  else
    echo "✓ desk $id"
    ok=$((ok + 1))
  fi
done < <(fleet_pairs)

echo ""
echo "done — desks $ok / 4  (failed $fail)"
[[ "$fail" -eq 0 ]]
