#!/usr/bin/env python3
"""
Native desk display client (pygame) — lightweight alternative to Chromium kiosk.

Combines subtitle playback + GPIO button in one process (Pi 3B+ friendly).

Env:
  DESK_ID          1–4
  SHOW_URL         http://MAC_IP:3847
  BUTTON_GPIO      BCM pin (default 17)
  BUTTON_COOLDOWN_MS  ignore extra edges after a press (default 400)
  LED_GPIO         optional BCM pin for idle glow
  MOCK=1           Enter = button; windowed if no fullscreen
  WINDOWED=1       1024×600 window (dev / desktop)
  NO_GPIO=1        display only, no button thread
  SDL_VIDEODRIVER  x11 | kmsdrm | fbcon (auto-tried if unset)
  DISPLAY          :0 when using X11 from SSH
  GPIOZERO_PIN_FACTORY=lgpio
"""

from __future__ import annotations

import json
import math
import os
import queue
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

DESK_ID = int(os.environ.get("DESK_ID", "1"))
SHOW_URL = os.environ.get("SHOW_URL", "http://127.0.0.1:3847").rstrip("/")
BUTTON_GPIO = int(os.environ.get("BUTTON_GPIO", "17"))
BUTTON_COOLDOWN_S = max(0.0, float(os.environ.get("BUTTON_COOLDOWN_MS", "400")) / 1000.0)
LED_RAW = os.environ.get("LED_GPIO", "27").strip()
LED_GPIO = int(LED_RAW) if LED_RAW else None
MOCK = os.environ.get("MOCK", "").lower() in ("1", "true", "yes")
WINDOWED = os.environ.get("WINDOWED", "").lower() in ("1", "true", "yes") or MOCK
NO_GPIO = os.environ.get("NO_GPIO", "").lower() in ("1", "true", "yes")
WIDTH = int(os.environ.get("DISPLAY_WIDTH", "1024"))
HEIGHT = int(os.environ.get("DISPLAY_HEIGHT", "600"))

# Match show.css desk subtitle styling (1024×600)
FONT_SIZE = int(os.environ.get("FONT_SIZE", str(round(HEIGHT * 0.036))))
LINE_HEIGHT = 1.38
TEXT_COLOR = (236, 236, 230)  # #ecece6
SHADOW_COLOR = (0, 0, 0)
ERROR_COLOR = (204, 68, 68)
MAX_TEXT_WIDTH = 880
H_PAD = 48
SUBTITLE_Y_RATIO = 0.55
# Waveshare bezel — slightly above pure black so idle screen blends on IPS.
DISPLAY_BG_COLOR = (17, 17, 17)


def log(msg: str) -> None:
    print(f"[desk-{DESK_ID}] {msg}", flush=True)


def ws_url() -> str:
    if SHOW_URL.startswith("https://"):
        return "wss://" + SHOW_URL[len("https://") :]
    if SHOW_URL.startswith("http://"):
        return "ws://" + SHOW_URL[len("http://") :]
    return "ws://" + SHOW_URL


def abs_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return SHOW_URL + path


def http_get_json(path: str) -> Any:
    with urllib.request.urlopen(SHOW_URL + path, timeout=8) as res:
        return json.loads(res.read().decode("utf-8"))


def http_get_text(url: str) -> str:
    with urllib.request.urlopen(url, timeout=8) as res:
        return res.read().decode("utf-8")


def http_post(path: str) -> dict:
    req = urllib.request.Request(
        SHOW_URL + path,
        method="POST",
        data=b"{}",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        return json.loads(res.read().decode("utf-8"))


def parse_vtt_time(raw: str) -> float:
    parts = raw.strip().split(":")
    if len(parts) == 3:
        return (
            float(parts[0]) * 3600
            + float(parts[1]) * 60
            + float(parts[2].replace(",", "."))
        )
    if len(parts) == 2:
        return float(parts[0]) * 60 + float(parts[1].replace(",", "."))
    return 0.0


def parse_vtt(text: str) -> list[dict[str, Any]]:
    cues: list[dict[str, Any]] = []
    normalized = text.lstrip("\ufeff").replace("\r", "")
    for block in normalized.split("\n\n"):
        lines = [ln for ln in block.split("\n") if ln.strip()]
        if not lines or lines[0].startswith("WEBVTT"):
            continue
        idx = 0
        if "-->" in lines[0]:
            idx = 0
        elif len(lines) > 1 and "-->" in lines[1]:
            idx = 1
        else:
            continue
        start_raw, end_raw = [p.strip() for p in lines[idx].split("-->", 1)]
        body = "\n".join(lines[idx + 1 :]).strip()
        if not body:
            continue
        cues.append(
            {
                "start": parse_vtt_time(start_raw),
                "end": parse_vtt_time(end_raw),
                "text": body,
            }
        )
    cues.sort(key=lambda c: c["start"])
    return cues


def cue_at(cues: list[dict[str, Any]], t: float) -> dict[str, Any] | None:
    for cue in reversed(cues):
        if t >= cue["start"] and t < cue["end"]:
            return cue
    return None


def session_elapsed_s(updated_at_ms: Any) -> float:
    """Seconds since channel open, from server updatedAt (ms epoch).

    All desks share the same timeline so slow VTT fetch / Pi 3 vs Pi 4
    start times do not desync subtitles. Assumes LAN clocks are roughly NTP'd.
    """
    try:
        opened = float(updated_at_ms)
    except (TypeError, ValueError):
        return 0.0
    if opened <= 0:
        return 0.0
    return max(0.0, (time.time() * 1000.0 - opened) / 1000.0)


@dataclass
class PlayerState:
    session_key: str
    cues: list[dict[str, Any]]
    end_at: float
    has_audio: bool
    clock0: float
    closing: bool = False
    error: str | None = None


class ShowClient:
    def __init__(self) -> None:
        self.channels: list[dict[str, Any]] = []
        self.state: dict[str, Any] = {"status": "idle"}
        self.events: queue.SimpleQueue[tuple[str, Any]] = queue.SimpleQueue()
        self.player: PlayerState | None = None
        self.player_generation = 0
        self.close_abort_gen = 0
        self.current_cue_text = ""
        self.screen_message = ""
        self.screen_error = False
        self.audio_path: str | None = None
        self._last_button_at = 0.0

    def channel_for_id(self, channel_id: int) -> dict[str, Any] | None:
        return next((c for c in self.channels if c.get("id") == channel_id), None)

    def live_channel(self) -> dict[str, Any] | None:
        if self.state.get("status") != "channel_open":
            return None
        cid = self.state.get("channelId")
        try:
            cid = int(cid)
        except (TypeError, ValueError):
            return None
        return self.channel_for_id(cid)

    def session_key(self) -> str:
        return f"{self.state.get('channelId')}:{self.state.get('updatedAt', 0)}"

    def is_open(self) -> bool:
        """True when any desk has a live channel (global show state from server)."""
        return self.state.get("status") == "channel_open" and self.live_channel() is not None

    def is_owner(self) -> bool:
        """True when this Pi's desk opened the live channel (informational only)."""
        if self.state.get("status") != "channel_open":
            return False
        try:
            return int(self.state.get("channelId")) == DESK_ID
        except (TypeError, ValueError):
            return False

    def on_button_pressed(self) -> None:
        # self.state is the global show state (WebSocket from Mac) — any live channel
        # blocks Talk on every desk, not only the desk that opened it.
        if self.is_open():
            return
        now = time.monotonic()
        if now - self._last_button_at < BUTTON_COOLDOWN_S:
            return
        self._last_button_at = now
        try:
            result = http_post(f"/api/channel/{DESK_ID}/open")
            log(f"open → {result.get('status')} {result.get('channelId', '')}")
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", errors="replace")
            log(f"open rejected HTTP {err.code}: {body}")
        except Exception as err:  # noqa: BLE001
            log(f"open failed: {err}")

    def stop_player(self) -> None:
        self.close_abort_gen += 1
        self.player = None
        self.current_cue_text = ""
        self.screen_message = ""
        self.screen_error = False
        try:
            import pygame

            if pygame.mixer.get_init():
                pygame.mixer.music.stop()
        except Exception:
            pass
        if self.audio_path and os.path.exists(self.audio_path):
            try:
                os.remove(self.audio_path)
            except OSError:
                pass
        self.audio_path = None

    def start_player(
        self, ch: dict[str, Any], session_key: str, play_audio: bool = False
    ) -> None:
        self.stop_player()
        gen = self.player_generation = self.player_generation + 1

        try:
            sub_url = abs_url(ch.get("subtitles"))
            cues = parse_vtt(http_get_text(sub_url)) if sub_url else []
        except Exception as err:  # noqa: BLE001
            if gen != self.player_generation:
                return
            self.screen_message = f"subtitles error: {err}"
            self.screen_error = True
            return

        if gen != self.player_generation:
            return
        if not cues:
            self.screen_message = "no subtitles"
            self.screen_error = True
            return

        end_at = cues[-1]["end"]
        audio_url = abs_url(ch.get("audio")) if play_audio else None
        has_audio = bool(audio_url)
        elapsed = session_elapsed_s(self.state.get("updatedAt"))
        if end_at > 0 and elapsed >= end_at:
            # Opened so long ago the story is already over — wait for idle.
            self.player = PlayerState(
                session_key=session_key,
                cues=cues,
                end_at=end_at,
                has_audio=False,
                clock0=time.monotonic() - elapsed,
                closing=True,
            )
            self.paint_cue(cue_at(cues, end_at - 0.001))
            return

        self.player = PlayerState(
            session_key=session_key,
            cues=cues,
            end_at=end_at,
            has_audio=has_audio,
            clock0=time.monotonic() - elapsed,
        )
        self.paint_cue(cue_at(cues, elapsed))

        if has_audio and audio_url:
            try:
                import pygame

                with urllib.request.urlopen(audio_url, timeout=15) as res:
                    suffix = ".mp3" if ".mp3" in audio_url else ".audio"
                    fd, path = tempfile.mkstemp(suffix=suffix)
                    with os.fdopen(fd, "wb") as tmp:
                        tmp.write(res.read())
                if gen != self.player_generation:
                    os.remove(path)
                    return
                self.audio_path = path
                if not pygame.mixer.get_init():
                    pygame.mixer.init(frequency=44100)
                # Recompute after download so seek matches owner/followers.
                elapsed = session_elapsed_s(self.state.get("updatedAt"))
                if end_at > 0 and elapsed >= end_at:
                    os.remove(path)
                    self.audio_path = None
                    self.player.has_audio = False
                    self.player.closing = True
                    self.paint_cue(cue_at(cues, end_at - 0.001))
                    return
                pygame.mixer.music.load(path)
                pygame.mixer.music.play()
                if elapsed > 0.05:
                    try:
                        pygame.mixer.music.set_pos(elapsed)
                    except Exception as err:  # noqa: BLE001
                        log(f"audio seek skipped: {err}")
                self.player.clock0 = time.monotonic() - elapsed
            except Exception as err:  # noqa: BLE001
                if gen != self.player_generation:
                    return
                # Keep wall-clock subtitles so the session can still auto-close.
                self.player.has_audio = False
                self.screen_error = False
                log(f"audio error (subtitles continue): {err}")
                self.paint_cue(cue_at(cues, session_elapsed_s(self.state.get("updatedAt"))))
                return

        if gen != self.player_generation:
            return

    def paint_cue(self, cue: dict[str, Any] | None) -> None:
        text = cue["text"] if cue else ""
        if text == self.current_cue_text and not self.screen_error:
            return
        self.current_cue_text = text
        self.screen_message = text
        self.screen_error = False

    def sync_render(self) -> None:
        ch = self.live_channel()
        if not self.is_open() or not ch:
            self.stop_player()
            self.screen_message = ""
            self.screen_error = False
            return

        sk = self.session_key()
        # Same session: keep playing, or hold last cue if already closing.
        # Do NOT restart on hardware re-broadcasts when closing=True.
        if self.player and self.player.session_key == sk:
            return
        # All desks show the live channel's VTT; audio plays on the Mac Mini only.
        self.start_player(ch, sk, play_audio=False)

    def tick_player(self) -> None:
        if not self.player or self.player.closing:
            return
        p = self.player
        if p.error:
            return

        t = time.monotonic() - p.clock0
        if p.end_at > 0 and t >= p.end_at:
            self.player.closing = True
            self.paint_cue(cue_at(p.cues, p.end_at - 0.001))
            return

        self.paint_cue(cue_at(p.cues, t))

    def apply_state(self, state: dict[str, Any]) -> None:
        self.state = state
        self.sync_render()

    def apply_channels(self, channels: list[dict[str, Any]]) -> None:
        self.channels = channels
        if self.is_open():
            self.stop_player()
        self.sync_render()

    def ws_thread(self) -> None:
        try:
            import websocket
        except ImportError:
            log("websocket-client missing — polling /api/state")
            while True:
                try:
                    self.events.put(("state", http_get_json("/api/state")))
                except Exception as err:  # noqa: BLE001
                    log(f"poll failed: {err}")
                time.sleep(1)
            return

        def on_message(_ws: Any, message: str) -> None:
            try:
                msg = json.loads(message)
                if msg.get("type") == "state":
                    self.events.put(("state", msg["payload"]))
                elif msg.get("type") == "channels":
                    self.events.put(("channels", msg["payload"]["channels"]))
            except Exception as err:  # noqa: BLE001
                log(f"bad ws message: {err}")

        def on_error(_ws: Any, err: Any) -> None:
            log(f"ws error: {err}")

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

    def gpio_thread(self) -> None:
        try:
            from gpiozero import Button, LED, PWMLED
        except Exception as err:  # noqa: BLE001
            log(f"gpiozero import failed: {err} — install python3-gpiozero python3-lgpio")
            return

        try:
            button = Button(BUTTON_GPIO, pull_up=True, bounce_time=0.2)
        except Exception as err:  # noqa: BLE001
            log(f"Button(BCM{BUTTON_GPIO}) failed: {err} — pin busy or no permission?")
            return

        button.when_pressed = self.on_button_pressed
        log(f"button BCM{BUTTON_GPIO} (Talk shorts to GND, cooldown {int(BUTTON_COOLDOWN_S*1000)}ms)")

        try:
            idle_pressed = button.is_pressed
            log(f"button idle is_pressed={idle_pressed} (expect False; True = stuck short or wrong NC/NO)")
        except Exception as err:  # noqa: BLE001
            log(f"button read failed: {err}")

        led = None
        if LED_GPIO is not None:
            try:
                led = PWMLED(LED_GPIO)
            except Exception:
                led = LED(LED_GPIO)
                log("PWMLED failed; using on/off LED")

        t0 = time.time()
        while True:
            idle = self.state.get("status") != "channel_open"
            if led is not None:
                if not idle:
                    try:
                        led.value = 0
                    except Exception:
                        pass
                else:
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

    def mock_input_thread(self) -> None:
        log("MOCK — press Enter = desk button")
        while True:
            try:
                input()
            except EOFError:
                break
            self.on_button_pressed()

    def load_font(self, pygame: Any) -> Any:
        for name in ("arial", "Arial", "Liberation Sans", "DejaVu Sans", "FreeSans"):
            path = pygame.font.match_font(name)
            if path:
                return pygame.font.Font(path, FONT_SIZE)
        return pygame.font.SysFont("sans", FONT_SIZE)

    def wrap_text(self, font: Any, text: str, max_width: int) -> list[str]:
        if not text:
            return []
        lines: list[str] = []
        for paragraph in text.split("\n"):
            words = paragraph.split()
            if not words:
                lines.append("")
                continue
            current = words[0]
            for word in words[1:]:
                trial = current + " " + word
                if font.size(trial)[0] <= max_width:
                    current = trial
                else:
                    lines.append(current)
                    current = word
            lines.append(current)
        return lines

    def render_subtitle(self, pygame: Any, font: Any, text: str, error: bool) -> Any:
        color = ERROR_COLOR if error else TEXT_COLOR
        max_w = min(MAX_TEXT_WIDTH, WIDTH - 2 * H_PAD)
        lines = self.wrap_text(font, text, max_w)
        if not lines:
            return None

        line_px = int(FONT_SIZE * LINE_HEIGHT)
        total_h = line_px * len(lines)
        surf = pygame.Surface((WIDTH, total_h), pygame.SRCALPHA)

        for i, line in enumerate(lines):
            y = i * line_px
            if not error:
                for dx, dy in (
                    (1, 0),
                    (-1, 0),
                    (0, 1),
                    (0, -1),
                    (1, 1),
                    (-1, -1),
                    (1, -1),
                    (-1, 1),
                ):
                    shadow = font.render(line, True, SHADOW_COLOR)
                    surf.blit(shadow, (WIDTH // 2 - shadow.get_width() // 2 + dx, y + dy))
            rendered = font.render(line, True, color)
            surf.blit(rendered, (WIDTH // 2 - rendered.get_width() // 2, y))
        return surf

    def init_pygame_display(self, pygame: Any) -> Any:
        """Try X11 (desktop) then direct framebuffer drivers used on Pi OS."""
        if os.environ.get("SDL_VIDEODRIVER"):
            drivers = [os.environ["SDL_VIDEODRIVER"]]
        else:
            drivers = []
            if os.environ.get("DISPLAY") or os.path.exists("/tmp/.X11-unix/X0"):
                os.environ.setdefault("DISPLAY", ":0")
                drivers.append("x11")
            drivers.extend(["kmsdrm", "fbcon"])

        flags = 0 if WINDOWED else pygame.FULLSCREEN
        last_err: Exception | None = None

        for driver in drivers:
            os.environ["SDL_VIDEODRIVER"] = driver
            try:
                if pygame.get_init():
                    pygame.quit()
                pygame.init()
                pygame.display.set_caption(f"desk {DESK_ID}")
                screen = pygame.display.set_mode((WIDTH, HEIGHT), flags)
                log(f"display ok — SDL_VIDEODRIVER={driver} DISPLAY={os.environ.get('DISPLAY', '')}")
                return screen
            except pygame.error as err:
                last_err = err
                log(f"display driver {driver} failed: {err}")
            except Exception as err:  # noqa: BLE001
                last_err = err
                log(f"display driver {driver} failed: {err}")

        log(
            "no display driver worked — if SSH: run on Pi desktop Terminal, or "
            "DISPLAY=:0 SDL_VIDEODRIVER=x11 python3 desk_client.py"
        )
        if last_err:
            raise last_err
        raise RuntimeError("no display available")

    def run_pygame(self) -> None:
        import pygame

        screen = self.init_pygame_display(pygame)
        clock = pygame.time.Clock()
        font = self.load_font(pygame)

        while True:
            while True:
                try:
                    kind, payload = self.events.get_nowait()
                except queue.Empty:
                    break
                if kind == "state":
                    self.apply_state(payload)
                elif kind == "channels":
                    self.apply_channels(payload)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit(0)
                if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit(0)

            self.tick_player()

            screen.fill(DISPLAY_BG_COLOR)
            if (self.is_open() or self.screen_message) and self.screen_message:
                sub = self.render_subtitle(
                    pygame, font, self.screen_message, self.screen_error
                )
                if sub:
                    y_center = int(HEIGHT * SUBTITLE_Y_RATIO)
                    screen.blit(sub, (0, y_center - sub.get_height() // 2))

            pygame.display.flip()
            clock.tick(30)

    def init(self) -> None:
        data = http_get_json("/api/channels")
        self.channels = data.get("channels", [])
        self.state = http_get_json("/api/state")
        log(f"ready — {len(self.channels)} channels, state={self.state.get('status')}")

    def main(self) -> None:
        log(f"pyclient → {SHOW_URL}")
        try:
            self.init()
        except Exception as err:  # noqa: BLE001
            log(f"server not reachable yet: {err}")

        threading.Thread(target=self.ws_thread, daemon=True).start()

        if NO_GPIO:
            pass
        elif MOCK:
            threading.Thread(target=self.mock_input_thread, daemon=True).start()
        else:
            threading.Thread(target=self.gpio_thread, daemon=True).start()

        self.sync_render()
        self.run_pygame()


if __name__ == "__main__":
    ShowClient().main()
