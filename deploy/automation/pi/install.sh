#!/bin/bash
# Install desk-client@N systemd unit (opt-in). Argument: desk number 1–4.
# Usage: sudo ./install.sh 2
set -euo pipefail

DESK_ID="${1:-}"
if [[ ! "$DESK_ID" =~ ^[1-4]$ ]]; then
  echo "usage: sudo $0 <desk-id 1-4>" >&2
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_LOCAL="$DIR/desk-${DESK_ID}.env.local"
ENV_EXAMPLE="$DIR/desk.env.example"
CONF_DIR="/etc/izbrisani"
CONF_FILE="$CONF_DIR/desk-${DESK_ID}.env"

if [[ -f "$ENV_LOCAL" ]]; then
  SRC="$ENV_LOCAL"
elif [[ -f "$ENV_EXAMPLE" ]]; then
  echo "warning: using desk.env.example — copy to desk-${DESK_ID}.env.local and edit" >&2
  SRC="$ENV_EXAMPLE"
else
  echo "missing env file" >&2
  exit 1
fi

mkdir -p "$CONF_DIR"
cp "$SRC" "$CONF_FILE"
chmod 644 "$CONF_FILE"
# Ensure DESK_ID matches instance
if grep -q '^DESK_ID=' "$CONF_FILE"; then
  sed -i "s/^DESK_ID=.*/DESK_ID=${DESK_ID}/" "$CONF_FILE"
else
  echo "DESK_ID=${DESK_ID}" >> "$CONF_FILE"
fi

cp "$DIR/desk-client@.service.example" /etc/systemd/system/desk-client@.service
systemctl daemon-reload
systemctl enable "desk-client@${DESK_ID}"
systemctl restart "desk-client@${DESK_ID}"

echo "installed desk-client@${DESK_ID} — run: systemctl status desk-client@${DESK_ID}"
