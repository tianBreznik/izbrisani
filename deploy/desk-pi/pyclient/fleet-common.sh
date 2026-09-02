# Shared helpers for push-all / start-all / stop-all / setup-ssh-keys.
# Sourced after HERE= is set by the caller.

fleet_load_env() {
  if [[ -z "${HERE:-}" ]]; then
    echo "fleet_load_env: HERE not set" >&2
    return 1
  fi
  ENV_FILE="${DESKS_ENV:-$HERE/desks.env.local}"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "missing $ENV_FILE — copy desks.env.example → desks.env.local and set IPs" >&2
    return 1
  fi
  # shellcheck disable=SC1090
  source "$ENV_FILE"

  PI_USER="${PI_USER:-moderna}"
  case "${REMOTE_DIR:-}" in
    /home/*) ;;
    *) REMOTE_DIR="/home/${PI_USER}/izbrisani-pyclient" ;;
  esac

  REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
  SSH_KEY="${SSH_KEY:-$HOME/.ssh/izbrisani_ed25519}"
  CONTROL_DIR="${SSH_CONTROL_DIR:-$HOME/.ssh/izbrisani-ctl}"
  mkdir -p "$CONTROL_DIR"
  chmod 700 "$CONTROL_DIR" 2>/dev/null || true
}

fleet_hosts() {
  echo "${DESK_1:?}"
  echo "${DESK_2:?}"
  echo "${DESK_3:?}"
  echo "${DESK_4:?}"
}

fleet_pairs() {
  echo "1:${DESK_1:?}"
  echo "2:${DESK_2:?}"
  echo "3:${DESK_3:?}"
  echo "4:${DESK_4:?}"
}

fleet_ssh() {
  local host="$1"
  shift
  local opts=(
    -o ConnectTimeout=8
    -o StrictHostKeyChecking=accept-new
    -o ControlMaster=auto
    -o "ControlPath=$CONTROL_DIR/%r@%h:%p"
    -o ControlPersist=600
  )
  if [[ -f "$SSH_KEY" ]]; then
    opts+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
  fi
  if [[ "${FLEET_SSH_PASSWORD:-}" != "1" ]]; then
    opts+=(-o BatchMode=yes)
  fi
  ssh "${opts[@]}" "$host" "$@"
}

fleet_require_keys() {
  if ! fleet_ssh "${DESK_1:?}" "true" 2>/dev/null; then
    echo "" >&2
    echo "SSH key auth failed (would prompt for a password on each Pi)." >&2
    echo "One-time setup from this machine:" >&2
    echo "  cd $HERE && ./setup-ssh-keys.sh" >&2
    echo "" >&2
    echo "Or temporarily allow passwords: FLEET_SSH_PASSWORD=1 ./start-all.sh" >&2
    return 1
  fi
}

fleet_ensure_show_server() {
  local health="${SHOW_URL:?}/api/health"
  if curl -sf --max-time 2 "$health" >/dev/null; then
    echo "show server already up — $SHOW_URL"
    return 0
  fi
  if curl -sf --max-time 2 "http://127.0.0.1:3847/api/health" >/dev/null; then
    echo "show server up on http://127.0.0.1:3847 (SHOW_URL=$SHOW_URL — Pis must reach that IP)"
    return 0
  fi

  if [[ ! -f "$REPO_ROOT/package.json" ]]; then
    echo "cannot find repo at $REPO_ROOT — start npm manually" >&2
    return 1
  fi

  mkdir -p "$HERE/logs"
  local log="$HERE/logs/show-server.log"
  echo "starting show server: cd $REPO_ROOT && npm start"
  echo "  log → $log"
  (
    cd "$REPO_ROOT"
    nohup npm start >"$log" 2>&1 &
    echo $! >"$HERE/logs/show-server.pid"
  )

  local i
  for i in $(seq 1 40); do
    if curl -sf --max-time 1 "http://127.0.0.1:3847/api/health" >/dev/null; then
      echo "show server ready"
      return 0
    fi
    sleep 0.5
  done
  echo "show server failed to become ready — tail $log:" >&2
  tail -n 40 "$log" >&2 || true
  return 1
}
