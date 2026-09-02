#!/usr/bin/env bash
# One-time: install an SSH key on all four desk Pis (password once per Pi).
# After this, push-all / start-all / stop-all run without password prompts.
#
#   ./setup-ssh-keys.sh
#
# Uses a plain `ssh` + append to authorized_keys (works on old macOS where
# ssh-copy-id is missing or rejects -o flags).

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/fleet-common.sh"
fleet_load_env || exit 1

SSH_KEY="${SSH_KEY:-$HOME/.ssh/izbrisani_ed25519}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "generating $SSH_KEY (no passphrase)"
  ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "izbrisani-fleet"
fi
if [[ ! -f "$SSH_KEY.pub" ]]; then
  echo "missing $SSH_KEY.pub" >&2
  exit 1
fi

PUB="$(cat "$SSH_KEY.pub")"
echo "public key: $SSH_KEY.pub"
echo "You will be asked for each Pi's password once."
echo ""

ok=0
fail=0

install_key() {
  local host="$1"
  local ip="${host##*@}"

  # Hotspot/DHCP often reuses IPs → stale host keys. Drop them quietly.
  ssh-keygen -R "$ip" >/dev/null 2>&1 || true
  ssh-keygen -R "$host" >/dev/null 2>&1 || true

  # Password auth allowed here (this is the one-time setup).
  # Append pubkey if not already present.
  ssh \
    -o PreferredAuthentications=password,keyboard-interactive,publickey \
    -o PubkeyAuthentication=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    "$host" \
    "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF '$PUB' ~/.ssh/authorized_keys 2>/dev/null || echo '$PUB' >> ~/.ssh/authorized_keys && echo KEY_INSTALLED"
}

verify_key() {
  local host="$1"
  ssh \
    -i "$SSH_KEY" \
    -o IdentitiesOnly=yes \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=8 \
    "$host" \
    "echo KEY_OK && whoami && hostname"
}

while IFS= read -r host; do
  [[ -z "$host" ]] && continue
  echo "→ $host"
  if out="$(install_key "$host" 2>&1)"; then
    echo "$out" | tail -n 3 | sed 's/^/  /'
    if vout="$(verify_key "$host" 2>&1)"; then
      echo "  ✓ $vout"
      ok=$((ok + 1))
    else
      echo "  ✗ key copy seemed to work, but passwordless login failed:"
      echo "$vout" | sed 's/^/    /'
      fail=$((fail + 1))
    fi
  else
    echo "  ✗ could not SSH / install key:"
    echo "$out" | sed 's/^/    /'
    echo "  Check: Pi on, same Wi‑Fi, user/IP in desks.env.local, password correct."
    fail=$((fail + 1))
  fi
  echo ""
done < <(fleet_hosts)

echo "done — $ok ok, $fail failed"
if [[ "$fail" -gt 0 ]]; then
  echo ""
  echo "Fix failing hosts, then re-run: ./setup-ssh-keys.sh"
  echo "Already-ok Pis will just say the key is already installed."
  exit 1
fi
echo "Next: ./push-all.sh && ./start-all.sh"
