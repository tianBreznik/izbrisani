#!/usr/bin/env bash
# Start desk_client.py on all four Pis over SSH (display on each Pi desktop).
#
# Usage:
#   ./deploy/desk-pi/pyclient/start-all.sh
#
# Requires desks.env.local. Mac must already be running: npm start

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${DESKS_ENV:-$HERE/desks.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE — copy desks.env.example → desks.env.local and set IPs" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

SHOW_URL="${SHOW_URL:?set SHOW_URL in $ENV_FILE}"
REMOTE_DIR="${REMOTE_DIR:-/home/moderna/izbrisani-pyclient}"
PYTHON="${PYTHON:-python3}"

if [[ "$REMOTE_DIR" == "~"* ]]; then
  remote_user="${PI_USER:-moderna}"
  REMOTE_DIR="/home/${remote_user}${REMOTE_DIR:1}"
fi

pairs=(
  "1:${DESK_1:?}"
  "2:${DESK_2:?}"
  "3:${DESK_3:?}"
  "4:${DESK_4:?}"
)

for entry in "${pairs[@]}"; do
  id="${entry%%:*}"
  host="${entry#*:}"
  echo "→ start desk $id on $host"
  ssh -f "$host" "cd '$REMOTE_DIR' && \
    pkill -f 'python3 desk_client.py' 2>/dev/null || true; \
    pkill -f 'desk_client.py' 2>/dev/null || true; \
    DISPLAY=:0 SDL_VIDEODRIVER=x11 \
    DESK_ID=$id SHOW_URL=$SHOW_URL \
    GPIOZERO_PIN_FACTORY=lgpio \
    nohup $PYTHON desk_client.py >\$HOME/desk_client.log 2>&1 &"
done

echo "done — clients launching (logs: ~/desk_client.log on each Pi)"
echo "check: ssh … 'tail -n 20 ~/desk_client.log'"
