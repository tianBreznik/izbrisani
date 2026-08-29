# Deprecated. Desk Pi GPIO agent is the real path.
import sys
import time
from machine import Pin

BUTTONS = {
    1: Pin(2, Pin.IN, Pin.PULL_UP),
    2: Pin(3, Pin.IN, Pin.PULL_UP),
    3: Pin(4, Pin.IN, Pin.PULL_UP),
    4: Pin(5, Pin.IN, Pin.PULL_UP),
}

LEDS = {
    1: Pin(6, Pin.OUT),
    2: Pin(7, Pin.OUT),
    3: Pin(8, Pin.OUT),
    4: Pin(9, Pin.OUT),
}

DEBOUNCE_MS = 40
LONG_CLOSE_MS = 2000


def emit(line):
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def set_leds_idle_glow(phase_on):
    for led in LEDS.values():
        led.value(1 if phase_on else 0)


def main():
    emit("PICO_READY")
    last = {ch: 1 for ch in BUTTONS}
    press_started = {ch: None for ch in BUTTONS}
    glow = False
    glow_t = time.ticks_ms()

    while True:
        now = time.ticks_ms()
        if time.ticks_diff(now, glow_t) > 500:
            glow = not glow
            glow_t = now
            if all(pin.value() for pin in BUTTONS.values()):
                set_leds_idle_glow(glow)
            else:
                for led in LEDS.values():
                    led.value(0)

        for ch, pin in BUTTONS.items():
            raw = pin.value()
            if raw != last[ch]:
                time.sleep_ms(DEBOUNCE_MS)
                raw = pin.value()
                if raw != last[ch]:
                    last[ch] = raw
                    if raw == 0:
                        press_started[ch] = now
                        emit("OPEN:%d" % ch)
                    else:
                        started = press_started[ch]
                        press_started[ch] = None
                        if started is not None and time.ticks_diff(now, started) >= LONG_CLOSE_MS:
                            emit("CLOSE")

        time.sleep_ms(10)


main()
