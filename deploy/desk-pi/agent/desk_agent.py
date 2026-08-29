#!/usr/bin/env python3
"""
Desk Pi button agent.

DESK_ID, SHOW_URL, BUTTON_GPIO (BCM, to GND), LED_GPIO (optional), MOCK=1.
DAP MA-8120PM Talk pads are NC: idle short, Talk opens → fire on release edge.
"""

from __future__ import annotations

import json
import math
import os
import sys
import threading
import time
import urllib.error
import urllib.request

DESK_ID = int(os.environ.get("DESK_ID", "1"))
SHOW_URL = os.environ.get("SHOW_URL", "http://127.0.0.1:3847").rstrip("/")
BUTTON_GPIO = int(os.environ.get("BUTTON_GPIO", "17"))
LED_RAW = os.environ.get("LED_GPIO", "27").strip()
LED_GPIO = int(LED_RAW) if LED_RAW else None
MOCK = os.environ.get("MOCK", "").lower() in ("1", "true", "yes")

state_lock = threading.Lock()
show_state = {"status": "idle"}


def log(msg: str) -> None:
    print(f"[desk-{DESK_ID}] {msg}", flush=True)


def api_post(path: str) -> dict:
    req = urllib.request.Request(
        f"{SHOW_URL}{path}",
        method="POST",
        data=b"{}",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=3) as res:
        return json.loads(res.read().decode("utf-8"))


def fetch_state() -> dict:
    with urllib.request.urlopen(f"{SHOW_URL}/api/state", timeout=3) as res:
        return json.loads(res.read().decode("utf-8"))


def on_button_pressed() -> None:
    try:
        result = api_post(f"/api/channel/{DESK_ID}/open")
        log(f"open → {result.get('status')} {result.get('channelId', '')}")
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        log(f"open rejected HTTP {err.code}: {body}")
    except Exception as err:  # noqa: BLE001
        log(f"open failed: {err}")


def ws_url() -> str:
    if SHOW_URL.startswith("https://"):
        return "wss://" + SHOW_URL[len("https://") :]
    if SHOW_URL.startswith("http://"):
        return "ws://" + SHOW_URL[len("http://") :]
    return "ws://" + SHOW_URL


def state_listener() -> None:
    global show_state
    try:
        import websocket
    except ImportError:
        log("websocket-client missing; polling /api/state")
        while True:
            try:
                with state_lock:
                    show_state = fetch_state()
            except Exception as err:  # noqa: BLE001
                log(f"poll state failed: {err}")
            time.sleep(1)
        return

    def on_message(_ws, message: str) -> None:
        global show_state
        try:
            msg = json.loads(message)
            if msg.get("type") == "state":
                with state_lock:
                    show_state = msg["payload"]
        except Exception as err:  # noqa: BLE001
            log(f"bad ws message: {err}")

    def on_error(_ws, err) -> None:
        log(f"ws error: {err}")

    def run() -> None:
        while True:
            try:
                ws = websocket.WebSocketApp(
                    ws_url(),
                    on_message=on_message,
                    on_error=on_error,
                )
                ws.run_forever(ping_interval=20, ping_timeout=10)
            except Exception as err:  # noqa: BLE001
                log(f"ws reconnect: {err}")
            time.sleep(1.5)

    threading.Thread(target=run, daemon=True).start()


def led_loop(led) -> None:
    t0 = time.time()
    while True:
        with state_lock:
            idle = show_state.get("status") != "channel_open"
        if led is None:
            time.sleep(0.2)
            continue
        if not idle:
            try:
                led.value = 0
            except Exception:
                pass
            time.sleep(0.05)
            continue
        phase = (time.time() - t0) * 2.0
        value = 0.15 + 0.55 * (0.5 * (1 + math.sin(phase)))
        try:
            led.value = value
        except Exception:
            try:
                led.on() if value > 0.4 else led.off()
            except Exception:
                pass
        time.sleep(0.03)


def run_gpio() -> None:
    from gpiozero import Button, PWMLED, LED

    button = Button(BUTTON_GPIO, pull_up=True, bounce_time=0.05)
    led = None
    if LED_GPIO is not None:
        try:
            led = PWMLED(LED_GPIO)
        except Exception:
            led = LED(LED_GPIO)
            log("PWMLED failed; using on/off LED")

    # DAP mic Talk pads: NC (idle = short to GND, Talk = open)
    button.when_released = on_button_pressed
    log(f"button BCM{BUTTON_GPIO} (NC); LED={LED_GPIO}; {SHOW_URL}")
    state_listener()
    led_loop(led)


def run_mock() -> None:
    log(f"MOCK — Enter = desk {DESK_ID} button")
    state_listener()
    threading.Thread(target=led_loop, args=(None,), daemon=True).start()
    while True:
        try:
            input()
        except EOFError:
            break
        on_button_pressed()


def main() -> None:
    global show_state
    log(f"start → {SHOW_URL}")
    try:
        st = fetch_state()
        with state_lock:
            show_state = st
        log(f"state: {st.get('status')}")
    except Exception as err:  # noqa: BLE001
        log(f"server not reachable yet: {err}")

    if MOCK:
        run_mock()
    else:
        try:
            run_gpio()
        except Exception as err:  # noqa: BLE001
            log(f"gpiozero failed ({err}); try MOCK=1")
            sys.exit(1)


if __name__ == "__main__":
    main()
