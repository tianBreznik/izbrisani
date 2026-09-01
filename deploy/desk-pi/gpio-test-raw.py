#!/usr/bin/env python3
"""
Raw GPIO17 monitor — shows exactly what the Pi pin sees (not edge events).

Same physics as a multimeter between GPIO17 and GND:
  HIGH (1) = open circuit  (Talk UP on a NO switch)
  LOW  (0) = short to GND   (Talk held, or jumper on pins 9+11)

Usage on desk Pi (stop desk-client first):
  sudo systemctl stop desk-client desk-agent
  GPIOZERO_PIN_FACTORY=lgpio python3 gpio-test-raw.py

Physical wiring: pin 9 = GND, pin 11 = GPIO17 (BCM), inner row.
"""

from __future__ import annotations

import os
import sys
import time

BCM = int(os.environ.get("BUTTON_GPIO", "17"))
INTERVAL = float(os.environ.get("GPIO_POLL_MS", "50")) / 1000.0

print(f"raw monitor BCM{BCM} (physical pin 11 = GPIO17, pin 9 = GND)")
print("Pull-up enabled. LOW = shorted to GND (like meter beep). Ctrl+C to quit.\n")


def run_lgpio() -> None:
    import lgpio

    chip = lgpio.gpiochip_open(0)
    lgpio.gpio_claim_input(chip, BCM, lgpio.SET_PULL_UP)
    last = None
    try:
        while True:
            v = lgpio.gpio_read(chip, BCM)
            if v != last:
                state = "LOW " if v == 0 else "HIGH"
                word = "PRESSED (short to GND)" if v == 0 else "OPEN (no continuity to GND)"
                print(f"  GPIO{BCM} = {v} ({state})  — {word}")
                last = v
            time.sleep(INTERVAL)
    finally:
        lgpio.gpio_free(chip, BCM)
        lgpio.gpiochip_close(chip)


def run_gpiozero() -> None:
    from gpiozero import DigitalInputDevice

    pin = DigitalInputDevice(BCM, pull_up=True)
    last = None
    try:
        while True:
            v = 0 if pin.value == 0 else 1
            if v != last:
                state = "LOW " if v == 0 else "HIGH"
                word = "PRESSED (short to GND)" if v == 0 else "OPEN (no continuity to GND)"
                print(f"  GPIO{BCM} = {v} ({state})  — {word}")
                last = v
            time.sleep(INTERVAL)
    finally:
        pin.close()


def main() -> None:
    factory = os.environ.get("GPIOZERO_PIN_FACTORY", "").lower()
    try:
        if factory == "lgpio" or not factory:
            try:
                run_lgpio()
                return
            except ImportError:
                pass
        run_gpiozero()
    except KeyboardInterrupt:
        print("\nbye")
    except Exception as err:
        print(f"failed: {err}", file=sys.stderr)
        print("Try: sudo apt install python3-lgpio python3-gpiozero", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
