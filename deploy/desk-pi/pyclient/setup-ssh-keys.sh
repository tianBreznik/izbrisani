#!/usr/bin/env bash
# One-time: install an SSH key on all four desk Pis (password once per Pi).
# After this, push-all / start-all / stop-all run without password prompts.
#
#   ./setup-ssh-keys.sh

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/fleet-common.sh"
fleet_load_env

SSH_KEY="${SSH_KEY:-$HOME/.ssh/izbrisani_ed25519}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "generating $SSH_KEY"
  ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "izbrisani-fleet"
fi

echo "public key: $SSH_KEY.pub"
echo "copying to each Pi (enter that Pi's password when asked)…"
echo ""

ok=0
fail=0
while IFS= read -r host; do
  echo "→ $host"
  if ssh-copy-id -i "$SSH_KEY.pub" \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=8 \
    "$host"; then
    if ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=8 "$host" "true"; then
      echo "  ✓ key works"
      ok=$((ok + 1))
    else
      echo "  ✗ key installed but BatchMode login failed"
      fail=$((fail + 1))
    fi
  else
    echo "  ✗ ssh-copy-id failed"
    fail=$((fail + 1))
  fi
  echo ""
done < <(fleet_hosts)

echo "done — $ok ok, $fail failed"
echo "then: ./push-all.sh && ./start-all.sh"
[[ "$fail" -eq 0 ]]
