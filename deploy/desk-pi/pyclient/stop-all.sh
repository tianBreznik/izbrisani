#!/usr/bin/env bash
# Stop desk_client.py on all four Pis.
#
# Usage:
#   ./deploy/desk-pi/pyclient/stop-all.sh

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${DESKS_ENV:-$HERE/desks.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE — copy desks.env.example → desks.env.local and set IPs" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

hosts=(
  "${DESK_1:?}"
  "${DESK_2:?}"
  "${DESK_3:?}"
  "${DESK_4:?}"
)

for host in "${hosts[@]}"; do
  echo "→ stop on $host"
  ssh "$host" "pkill -f desk_client.py || true"
done

echo "done"
