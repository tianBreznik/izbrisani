#!/bin/bash
set -euo pipefail

echo "=== desk-client@ instances ==="
systemctl list-units 'desk-client@*' --no-pager 2>/dev/null || echo "(none)"

for n in 1 2 3 4; do
  if systemctl is-enabled "desk-client@${n}" &>/dev/null; then
    echo "--- desk-client@${n} ---"
    systemctl is-active "desk-client@${n}" || true
    if [[ -f "/etc/izbrisani/desk-${n}.env" ]]; then
      grep -E '^(DESK_ID|SHOW_URL)=' "/etc/izbrisani/desk-${n}.env" || true
    fi
  fi
done
