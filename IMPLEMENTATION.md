# anatomija pregona — Implementation Plan (Handoff)

Last updated: 2026-07-29  
Purpose: summary for another Cursor agent (including iOS) to continue work.

---

## Locked architecture (current)

```text
Mac Mini (hub)
  ├── Node show server (:3847)
  ├── /shadow/1 + /shadow/2 → 2 digital projectors
  ├── /control.html (operator; ?force=1)
  ├── USB relay → Kodak (KODAK_RELAY_ON / OFF)
  └── Ethernet → 4 desk Pis

Desk Pi ×4
  ├── Chromium kiosk → /desk/N
  ├── desk_agent.py → desk button GPIO → POST /api/channel/N/open
  ├── optional LED (sine when idle)
  └── 7″ HDMI (3D-printed case)
```

**No Pico.** Buttons live on each desk → that Pi’s GPIO. Kodak is Mac-side relay only.

Exclusive: any desk press while a channel is live gets `409 channel_busy` (same or other desk). Session ends when audio/subtitles finish (`requestClose`) or operator closes (control Esc / `POST /api/channel/close`). Control panel uses `?force=1` to override.

See also: [`SHOW_DAY.md`](./SHOW_DAY.md) — staff power-on / launchd + systemd.

---

## Project intent

- One channel open at a time (“mic live”).
- Inputs: mic/button **on each desk** → desk Pi companion → API.
- Outputs synced: desk text, Kodak on/off, ESP32 séance lights, audio (TBD). Optional `/shadow/*` HTML.
- Idle: name plate + standby; Kodak off; ESP32 `/stop?light=all`; button LEDs sine.

---

## Show protocol

| State | Desks | Shadows | Kodak |
|-------|-------|---------|-------|
| `idle` | name plate + “standby” | black | off |
| `channel_open(n)` | desk *n* essay | projector `channels[n].shadow` shows `shadowMedia` | on |
| `channel_close` | idle | black | off |

Default mapping in `content/channels.json`: channels **1–2 → shadow 1**, **3–4 → shadow 2**.

---

## Hardware BOM (locked direction)

| Item | Qty | Notes |
|------|-----|--------|
| Mac Mini | 1 | Confirmed hub |
| Desk Pi 4/5 | 4 (+1 spare) | Not 3B+ for production |
| 7″ HDMI IPS | 4 (+1) | Waveshare 7″ HDMI LCD (C) or Elecrow 7″ 1024×600 |
| 3D-printed cases | 4 | Measure panel before final CAD |
| Pi Pico | — | **Not required** (deprecated path in `firmware/pico/`) |
| USB relay | 1 | Kodak on Mac Mini |
| Switch + Ethernet | 1 + cables | Prefer wired LAN |
| Shadow projectors | 2 | From Mac displays |
| Kodak Ektalite | 1 | Analog; relay only |

**Not using:** spotlights, e-ink/reMarkable, ESP32 desks, 10″ monitors.

---

## Software in repo

| Path | Role |
|------|------|
| `server/index.js` | Hub API + WebSocket; listens `0.0.0.0:3847` |
| `server/hardware.js` | Kodak USB relay via `KODAK_RELAY_ON` / `OFF` |
| `deploy/desk-pi/agent/` | Desk GPIO companion |
| `content/channels.json` | Essays + `shadow` + `shadowMedia` |
| `public/desk.html` | Name-tag UI for Pis |
| `public/shadow.html` | Mac Mini projector outputs |
| `public/control.html` | Operator + log |
| `deploy/README.md` | Mac + Pi deploy notes |

### API

- `GET /api/state`, `GET /api/channels`
- `POST /api/channel/:id/open`, `POST /api/channel/close`
- `POST /api/reload-content`
- WebSocket: `state`, `channels`

---

## Next implementation steps

1. Bench: Mac `npm start` + shadows + `MOCK=1` desk agent.
2. Wire real GPIO on one Pi; systemd enable agent.
3. Set `KODAK_RELAY_ON/OFF` when USB relay arrives.
4. Desk local audio when live.
5. `launchd` multi-display shadows on Mac.
6. 3D case after one 7″ panel measured.

---

## Open questions

1. Mac Mini ports / adapters for 2 projectors?
2. Kodak model / lamp control method? → **500 confirmed** — no 12-pin; see `deploy/checkpoint_kodak.md`
3. Exact artist shadow mapping (override JSON if needed)?
4. Generative ambient (Tina)?
5. Mic LED glow hardware?

---

## Related

- Workspace: `/Users/Tian/izbrisani`
- Main hub: **Mac Mini**; desks: **4 Pis + 7″ HDMI + 3D cases**
