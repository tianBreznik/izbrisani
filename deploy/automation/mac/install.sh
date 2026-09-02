#!/bin/bash
# Install show launchd agents (opt-in). Does not modify repo or global system beyond LaunchAgents.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

if [[ ! -f "$DIR/show.env.local" ]]; then
  echo "Create $DIR/show.env.local from show.env.example first." >&2
  exit 1
fi

chmod +x "$DIR/start-show-server.sh" "$DIR/start-supercollider.sh"

install_plist() {
  local src="$1"
  local name="$2"
  local dest="$LAUNCH_AGENTS/$name"
  sed "s|__AUTOMATION_MAC__|$DIR|g" "$src" > "$dest"
  echo "installed $dest"
  launchctl bootout "gui/$(id -u)/${name%.plist}" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$dest"
  launchctl enable "gui/$(id -u)/${name%.plist}" 2>/dev/null || true
}

mkdir -p "$LAUNCH_AGENTS"
install_plist "$DIR/com.izbrisani.show.plist.example" "com.izbrisani.show.plist"

if [[ "${INSTALL_SC:-0}" == "1" ]]; then
  install_plist "$DIR/com.izbrisani.supercollider.plist.example" "com.izbrisani.supercollider.plist"
else
  echo "skipped SuperCollider launchd (set INSTALL_SC=1 to include)"
fi

echo "done — run ./status.sh or: curl -s http://127.0.0.1:3847/api/health"
