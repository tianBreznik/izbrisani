# Desk pyclient (pygame)

Lightweight desk display for **Pi 3B+** (and Pi 4). Replaces Chromium kiosk + separate `desk_agent.py` with one process:

- WebSocket state from Mac Mini
- WebVTT subtitles + MP3 audio
- GPIO mic button → `POST /api/channel/N/open`
- Auto-close when playback ends

## Pi 3B+ install

On the desk Pi (SSH or keyboard), with Mac Mini server running:

```bash
# System packages (prefer apt pygame on Pi)
sudo apt update
sudo apt install -y python3-pygame python3-gpiozero python3-lgpio python3-websocket

mkdir -p ~/izbrisani-pyclient
# Copy from Mac (adjust IP):
#   scp deploy/desk-pi/pyclient/desk_client.py moderna@DESK_IP:~/izbrisani-pyclient/
```

### Disable Chromium kiosk (avoid two clients fighting)

```bash
mv ~/.config/autostart/desk-kiosk.desktop ~/.config/autostart/desk-kiosk.desktop.off 2>/dev/null || true
```

### Foreground test

**Best:** open **Terminal on the Pi desktop** (keyboard + monitor), not SSH:

```bash
cd ~/izbrisani-pyclient
DESK_ID=2 SHOW_URL=http://MAC_IP:3847 GPIOZERO_PIN_FACTORY=lgpio python3 desk_client.py
```

**Over SSH** the desktop may be running but X11 is not wired to your session — use:

```bash
DISPLAY=:0 SDL_VIDEODRIVER=x11 DESK_ID=2 SHOW_URL=http://MAC_IP:3847 GPIOZERO_PIN_FACTORY=lgpio \
  python3 desk_client.py
```

If X11 still fails (or no desktop), try direct framebuffer:

```bash
SDL_VIDEODRIVER=kmsdrm DESK_ID=2 SHOW_URL=http://MAC_IP:3847 GPIOZERO_PIN_FACTORY=lgpio \
  python3 desk_client.py
```

Pi must be **logged into the desktop** (autologin), not stuck at the login screen.

Press channel **2** on Mac `npm run control` — subtitles should appear.  
Mic Talk button should open/close the channel (same wiring as `desk_agent.py`).

Without GPIO (display-only test):

```bash
NO_GPIO=1 DESK_ID=2 SHOW_URL=http://MAC_IP:3847 python3 desk_client.py
```

### systemd (after foreground test OK)

Edit `desk-client.service` — set `DESK_ID`, `SHOW_URL`, user paths — then:

```bash
sudo cp desk-client.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now desk-client
sudo journalctl -u desk-client -f
```

Service needs **desktop session** (`DISPLAY=:0`). Pi must autologin to LXDE.

## Dev on Mac / laptop

Server running locally:

```bash
cd deploy/desk-pi/pyclient
pip3 install pygame websocket-client
MOCK=1 WINDOWED=1 DESK_ID=1 SHOW_URL=http://127.0.0.1:3847 python3 desk_client.py
```

Press **Enter** to simulate button; use `npm run control` keys 1–4.

## Env reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `DESK_ID` | `1` | Channel / desk number |
| `SHOW_URL` | `http://127.0.0.1:3847` | Mac Mini base URL |
| `BUTTON_GPIO` | `17` | BCM pin (mic PTT) |
| `LED_GPIO` | `27` | Optional idle LED |
| `MOCK=1` | off | Enter = button; windowed |
| `WINDOWED=1` | off | 1024×600 window |
| `NO_GPIO=1` | off | Skip button thread |
| `DISPLAY_WIDTH` / `HEIGHT` | `1024` / `600` | Waveshare resolution |

## Mixed fleet

| Desk | Board | Client |
|------|-------|--------|
| Pi 4 | Chromium kiosk **or** pyclient | either works |
| Pi 3B+ | **pyclient** | recommended |

Same Mac Mini server; no server changes needed.

## Checklist

→ **[`CHECKLIST.md`](./CHECKLIST.md)** — install, **quick retest** (control + mic), **systemd + reboot**, Pi 4 migration

**Fleet plan:** 3B+ requires pyclient; migrate Pi 4s to pyclient after desk-2 retest + reboot pass (same stack, runs lighter than Chromium).
