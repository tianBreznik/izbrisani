#!/usr/bin/env bash
# Push desk_client.py to all four Pis (cat | ssh).
# Passwordless after: ./setup-ssh-keys.sh
#
#   ./push-all.sh

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/fleet-common.sh"
fleet_load_env

SRC="$HERE/desk_client.py"
if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi

fleet_require_keys

echo "REMOTE_DIR=$REMOTE_DIR"
echo "SSH_KEY=$SSH_KEY"

while IFS= read -r host; do
  echo "→ push → $host:$REMOTE_DIR/desk_client.py"
  fleet_ssh "$host" "mkdir -p '$REMOTE_DIR'"
  cat "$SRC" | fleet_ssh "$host" "cat > '$REMOTE_DIR/desk_client.py'"
  fleet_ssh "$host" "wc -c '$REMOTE_DIR/desk_client.py'"
done < <(fleet_hosts)

echo "done — all four Pis updated"
