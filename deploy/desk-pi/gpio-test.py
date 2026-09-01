#!/usr/bin/env python3
"""
Bench-test mic PTT → Pi GPIO before blaming desk_client.

Usage (on the desk Pi, mic wired to BCM17 + GND):
  sudo systemctl stop desk-client desk-agent
  GPIOZERO_PIN_FACTORY=lgpio python3 gpio-test.py

Default mode polls the pin every 50ms and prints when the level changes.
Edges only fire on *changes* — if you're already PRESSED, Talk won't print again.

Short physical pins 9+11 with a jumper — should flip to PRESSED.
Talk up (NO switch) → RELEASED. Talk held → PRESSED.

Env:
  BUTTON_GPIO (default 17)
  BUTTON_NC=1 for NC switches (fire on open)
  GPIO_POLL=0  use edge-only mode (old behaviour)
"""

from __future__ import annotations

import os
import signal
import sys
import time

BUTTON_GPIO = int(os.environ.get("BUTTON_GPIO", "17"))
BUTTON_NC = os.environ.get("BUTTON_NC", "").lower() in ("1", "true", "yes")
POLL = os.environ.get("GPIO_POLL", "1").lower() not in ("0", "false", "no")

print(f"gpio-test BCM{BUTTON_GPIO} pull_up=True mode={'NC' if BUTTON_NC else 'NO'}")
print(f"GPIOZERO_PIN_FACTORY={os.environ.get('GPIOZERO_PIN_FACTORY', '(default)')}")
print(f"mode={'poll (prints on level change)' if POLL else 'edge only'}")
print("Ctrl+C to quit.\n")

try:
    from gpiozero import Button
except Exception as err:
    print(f"gpiozero import failed: {err}", file=sys.stderr)
    print("Try: sudo apt install python3-gpiozero python3-lgpio", file=sys.stderr)
    sys.exit(1)

try:
    button = Button(BUTTON_GPIO, pull_up=True, bounce_time=0.05)
except Exception as err:
    print(f"Button({BUTTON_GPIO}) failed: {err}", file=sys.stderr)
    print("Check: user in 'gpio' group? another process using the pin?", file=sys.stderr)
    sys.exit(1)

try:
    idle = button.is_pressed
    print(f"now: {'PRESSED' if idle else 'RELEASED'}  is_pressed={idle}")
    if BUTTON_NC:
        print("  (NC: expect PRESSED when Talk is UP / circuit open)")
    else:
        print("  (NO: expect RELEASED when Talk is UP / circuit open)")
except Exception as err:
    print(f"Cannot read pin: {err}", file=sys.stderr)
    sys.exit(1)

print()


def label(pressed: bool) -> str:
    return "PRESSED " if pressed else "RELEASED"


def on_press() -> None:
    print(f"  edge PRESS   t={time.monotonic():.2f}")


def on_release() -> None:
    print(f"  edge RELEASE t={time.monotonic():.2f}")


if BUTTON_NC:
    button.when_released = on_press
    button.when_pressed = on_release
else:
    button.when_pressed = on_press
    button.when_released = on_release


def poll_loop() -> None:
    last = button.is_pressed
    print(f"  level {label(last)}")
    while True:
        cur = button.is_pressed
        if cur != last:
            print(f"  level {label(cur)}")
            last = cur
        time.sleep(0.05)


if POLL:
    try:
        poll_loop()
    except KeyboardInterrupt:
        print("\nbye")
else:
    signal.pause()
