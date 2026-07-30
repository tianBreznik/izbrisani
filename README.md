# UN Debate Show

Show controller for a museum UN-debate installation.

**Architecture:** Mac Mini hub + 4 desk Raspberry Pis + 2 shadow projectors + Kodak (relay).

## Quick start (Mac Mini / laptop)

```bash
npm install
npm start
```

| URL | Role |
|-----|------|
| http://localhost:3847/control.html | Operator |
| http://localhost:3847/shadow/1 | Shadow projector 1 |
| http://localhost:3847/shadow/2 | Shadow projector 2 |
| http://localhost:3847/desk/1 … `/desk/4` | Name-tag screens |

Keys on control: `1`–`4` open, `Esc` close.

## Docs

- [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — architecture / handoff  
- [`deploy/README.md`](./deploy/README.md) — deploy index  
- [`deploy/PHYSICAL.md`](./deploy/PHYSICAL.md) — wiring & layout  
- [`deploy/CHECKLIST.md`](./deploy/CHECKLIST.md) — on-site checklist  
- [`deploy/desk-pi/`](./deploy/desk-pi/) — load kiosk onto Pis  
- [`firmware/pico/`](./firmware/pico/) — mic buttons  

## Content

Edit `content/channels.json` (`essay`, `shadow`, `shadowMedia`, later `audio`).

## Physical I/O

- **Desk buttons:** `deploy/desk-pi/agent/` on each Pi (not Pico)
- **Kodak:** `KODAK_RELAY_ON` / `KODAK_RELAY_OFF` when starting the Mac server

```bash
npm start
MOCK=1 DESK_ID=1 SHOW_URL=http://127.0.0.1:3847 python3 deploy/desk-pi/agent/desk_agent.py
```
