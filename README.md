# UN Debate Show

Boilerplate for a museum exhibition: four UN-style delegate “name tag” screens, a projector view, and a central show controller. This repo is the **web simulator** — develop content and protocol here before ESP32 hardware arrives.

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3847/control.html](http://localhost:3847/control.html) and use the links to open desk and projector windows.

Development with auto-restart on server changes:

```bash
npm run dev
```

## Simulator layout

| URL | Purpose |
|-----|---------|
| `/control.html` | Staff panel — open/close channels |
| `/desk/1` … `/desk/4` | 800×480 delegate screens |
| `/projector.html` | Full-screen image for the projector |

**Keyboard (on control panel):** `1`–`4` open a channel, `Esc` closes.

For a realistic test, open four desk windows sized to 800×480 and fullscreen the projector on a second monitor.

## Show protocol

State is held by the server and broadcast over WebSocket.

| State | Behavior |
|-------|----------|
| `idle` | All desks show country + delegate only; projector is black |
| `channel_open(n)` | Desk *n* shows its essay; projector shows channel *n* image |

### HTTP API

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/state` | Current show state |
| `GET` | `/api/channels` | Channel content |
| `POST` | `/api/channel/:id/open` | Open channel |
| `POST` | `/api/channel/close` | Return to idle |
| `POST` | `/api/reload-content` | Re-read `content/channels.json` |

Physical buttons (ESP32, GPIO, etc.) can call the same `POST` endpoints later.

## Content

Edit `content/channels.json`:

```json
{
  "id": 1,
  "country": "…",
  "delegate": "…",
  "essay": "…",
  "image": "/assets/your-photo.jpg"
}
```

Put images in `public/assets/`. After editing JSON during a run, click **Reload content** on the control panel (or restart the server).

## Project structure

```
content/channels.json   # essays + image paths
server/index.js         # Express + WebSocket show controller
public/
  control.html          # operator panel
  desk.html             # delegate screen (800×480)
  projector.html        # projector output
  css/show.css
  js/client.js          # shared desk/projector client
  js/control.js
  assets/               # placeholder projector images
```

## Next steps (hardware)

1. ESP32-S3 + 7″ panels: LVGL UI mirroring `desk.html`, subscribing to the same WebSocket/API.
2. Buttons: send `POST /api/channel/:id/open` to this server on the local network.
3. Projector: dedicated machine opening `/projector.html` in kiosk mode via HDMI.

Port defaults to `3847`; override with `PORT=3000 npm start`.
