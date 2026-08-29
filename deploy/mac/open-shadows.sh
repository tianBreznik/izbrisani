#!/bin/bash
# Opens control + shadow/1 + shadow/2 in Chrome. SHOW_URL optional.

set -euo pipefail
BASE="${SHOW_URL:-http://127.0.0.1:3847}"

open -na "Google Chrome" --args --new-window "${BASE}/control.html"
sleep 1
open -na "Google Chrome" --args --new-window "${BASE}/shadow/1"
sleep 1
open -na "Google Chrome" --args --new-window "${BASE}/shadow/2"

echo "Opened control + shadow/1 + shadow/2"
echo "Drag each shadow window to its projector display, then View → Enter Full Screen"
