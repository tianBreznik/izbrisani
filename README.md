# anatomija pregona

Show controller for the **anatomija pregona** exhibition installation.

**Architecture:** Mac Mini hub + 4 desk Raspberry Pis + Kodak (6-pin relay) + ESP32 séance lights.

## Quick start (Mac Mini / laptop)

```bash
npm install
npm start                 # API + desk pages (no GUI required)
# in another Terminal / SSH session:
npm run control           # operator: keys 1–4 open, Esc close
```

Mac Mini — no browser control panel. Operator is a **terminal TUI** (`server/control-cli.js`). Desk Pis still load Chromium kiosks from this server.

| Piece | Role |
|-------|------|
| `npm start` | Show server `:3847` — desk HTML + API + WebSocket |
| `npm run control` | Mac operator (TTY) |
| `/desk/1` … `/desk/4` | Desk Pi Chromium kiosks only |

## Docs

- [`INVENTORY.md`](./INVENTORY.md) — meeting BOM / tools  
- [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — architecture  
- [`deploy/README.md`](./deploy/README.md) — deploy index  
- [`deploy/PHYSICAL.md`](./deploy/PHYSICAL.md) — wiring  
- [`deploy/CHECKLIST.md`](./deploy/CHECKLIST.md) — on-site checklist  
- [`deploy/desk-pi/`](./deploy/desk-pi/) — kiosk + GPIO agent  
- [`deploy/checkpoint_kodak.md`](./deploy/checkpoint_kodak.md) — Kodak Plan A/B  

## Content

Edit `content/channels.json` (`essay`, later `audio`).

## Physical I/O

- **Desk buttons:** `deploy/desk-pi/agent/` on each Pi
- **Kodak:** Plan A 6-pin relay — see `deploy/checkpoint_kodak.md`
- **Séance lights (ESP32):** `ESP32_URL` + `SEANCE_SETTLE_MS` — see `deploy/checkpoint_seance.md`

```bash
npm start
npm run control
MOCK=1 DESK_ID=1 SHOW_URL=http://127.0.0.1:3847 python3 deploy/desk-pi/agent/desk_agent.py
```
