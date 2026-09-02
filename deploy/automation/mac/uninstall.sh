#!/bin/bash
# Remove show launchd agents — back to manual npm start.
set -euo pipefail

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
UID_GUI="gui/$(id -u)"

for label in com.izbrisani.show com.izbrisani.supercollider; do
  plist="$LAUNCH_AGENTS/${label}.plist"
  launchctl bootout "$UID_GUI/$label" 2>/dev/null || true
  if [[ -f "$plist" ]]; then
    rm -f "$plist"
    echo "removed $plist"
  fi
done

echo "uninstalled — use: cd izbrisani && npm start"
