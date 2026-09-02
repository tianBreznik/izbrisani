#!/usr/bin/env bash
# Stop desk_client.py on all four Pis.
# Passwordless after: ./setup-ssh-keys.sh
#
#   ./stop-all.sh
#
# Optional: STOP_SERVER=1 ./stop-all.sh  — also stop local npm show server

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/fleet-common.sh"
fleet_load_env

fleet_require_keys || exit 1

while IFS= read -r host; do
  echo "→ stop on $host"
  if fleet_ssh "$host" 'pkill -f desk_client.py; sleep 0.3; pgrep -af desk_client.py || echo stopped'; then
    :
  else
    echo "  (ssh failed — host down or wrong IP?)"
  fi
done < <(fleet_hosts)

if [[ "${STOP_SERVER:-}" == "1" ]]; then
  if [[ -f "$HERE/logs/show-server.pid" ]]; then
    pid="$(cat "$HERE/logs/show-server.pid" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "→ stop show server pid $pid"
      kill "$pid" 2>/dev/null || true
    fi
  fi
  # Also free port if a stray node holds it
  if command -v lsof >/dev/null; then
    pids="$(lsof -ti :3847 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "→ kill port 3847: $pids"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
    fi
  fi
fi

echo "done"
