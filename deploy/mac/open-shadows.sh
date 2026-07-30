#!/bin/bash
# Open control + two shadow windows (Chrome on macOS).
# Usage: ./open-shadows.sh
# Optional: SHOW_URL=http://127.0.0.1:3847

set -euo pipefail
BASE="${SHOW_URL:-http://127.0.0.1:3847}"

open -na "Google Chrome" --args --new-window "${BASE}/control.html"
sleep 1
open -na "Google Chrome" --args --new-window "${BASE}/shadow/1"
sleep 1
open -na "Google Chrome" --args --new-window "${BASE}/shadow/2"

echo "Opened control + shadow/1 + shadow/2"
echo "Drag each shadow window to its projector display, then View → Enter Full Screen"
