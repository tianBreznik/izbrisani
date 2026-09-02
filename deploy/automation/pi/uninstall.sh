#!/bin/bash
# Remove desk-client@N — back to foreground python3.
# Usage: sudo ./uninstall.sh 2   (or omit arg to remove all 1–4)
set -euo pipefail

DESK_ID="${1:-}"

stop_one() {
  local n="$1"
  systemctl disable --now "desk-client@${n}" 2>/dev/null || true
  rm -f "/etc/izbrisani/desk-${n}.env"
  echo "removed desk-client@${n}"
}

if [[ -n "$DESK_ID" ]]; then
  stop_one "$DESK_ID"
else
  for n in 1 2 3 4; do stop_one "$n"; done
  rm -f /etc/systemd/system/desk-client@.service
  rmdir /etc/izbrisani 2>/dev/null || true
  systemctl daemon-reload
fi

echo "uninstalled — use foreground: DESK_ID=N SHOW_URL=... python3 desk_client.py"
