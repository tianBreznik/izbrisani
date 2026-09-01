#!/usr/bin/env python3
"""
Bench-test mic PTT → Pi GPIO before blaming desk_client.

Usage (on the desk Pi, mic wired to BCM17 + GND):
  GPIOZERO_PIN_FACTORY=lgpio python3 gpio-test.py

Hold Talk — you should see PRESS lines. Release — RELEASE.
Short pins 9+11 with a jumper — same result (proves Pi + software without mic).

Env: BUTTON_GPIO (default 17), BUTTON_NC=1 for NC switches.
"""

from __future__ import annotations

import os
import signal
import sys
import time

BUTTON_GPIO = int(os.environ.get("BUTTON_GPIO", "17"))
BUTTON_NC = os.environ.get("BUTTON_NC", "").lower() in ("1", "true", "yes")

print(f"gpio-test BCM{BUTTON_GPIO} pull_up=True mode={'NC' if BUTTON_NC else 'NO'}")
print(f"GPIOZERO_PIN_FACTORY={os.environ.get('GPIOZERO_PIN_FACTORY', '(default)')}")
print("Hold Talk or short GPIO→GND. Ctrl+C to quit.\n")

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

# Initial level — pull-up idle should read "released" (open circuit).
try:
    print(f"idle is_pressed={button.is_pressed}  (expect False with NO switch up)")
except Exception as err:
    print(f"Cannot read pin: {err}", file=sys.stderr)
    sys.exit(1)


def on_press() -> None:
    print(f"  PRESS   t={time.monotonic():.2f}")


def on_release() -> None:
    print(f"  RELEASE t={time.monotonic():.2f}")


if BUTTON_NC:
    button.when_released = on_press
    button.when_pressed = on_release
else:
    button.when_pressed = on_press
    button.when_released = on_release

signal.pause()
