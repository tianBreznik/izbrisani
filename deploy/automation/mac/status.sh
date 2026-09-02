#!/bin/bash
set -euo pipefail

echo "=== launchd ==="
launchctl print "gui/$(id -u)/com.izbrisani.show" 2>/dev/null | head -5 || echo "com.izbrisani.show: not loaded"
launchctl print "gui/$(id -u)/com.izbrisani.supercollider" 2>/dev/null | head -5 || echo "com.izbrisani.supercollider: not loaded"

echo ""
echo "=== health ==="
curl -sf http://127.0.0.1:3847/api/health && echo || echo "server not responding on :3847"

echo ""
echo "=== logs (tail) ==="
tail -3 /tmp/izbrisani-show.log 2>/dev/null || echo "(no show log)"
