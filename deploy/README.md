# Deploy index

## Architecture (current)

```text
Mac Mini = show server + SuperCollider (8ch) + terminal operator + ESP32 séance + Kodak
Desk Pi ×4 = Chromium kiosk /desk/N + GPIO button agent
```

**No Pico.** Buttons are on each desk → that Pi’s GPIO. Mac has **no GUI** — use `npm run control`.

## Docs

| File | Purpose |
|------|---------|
| [`PHYSICAL.md`](./PHYSICAL.md) | Wiring |
| [`CHECKLIST.md`](./CHECKLIST.md) | On-site checklist |
| [`desk-pi/README.md`](./desk-pi/README.md) | Kiosk imaging |
| [`desk-pi/setup-kiosk.sh`](./desk-pi/setup-kiosk.sh) | Autostart Chromium |
| [`desk-pi/agent/`](./desk-pi/agent/) | **GPIO companion** |
| [`checkpoint_kodak.md`](./checkpoint_kodak.md) | Kodak Plan A: 6-pin relay; Plan B: IR blaster |
| [`checkpoint_seance.md`](./checkpoint_seance.md) | ESP32 séance lights |
| [`checkpoint_audio.md`](./checkpoint_audio.md) | SuperCollider 8ch + OSC monologues |
| [`sc-osc-map.json`](./sc-osc-map.json) | OSC addresses (confirm with Tisa) |
| [`mac/open-shadows.sh`](./mac/open-shadows.sh) | Legacy — not needed on Mac Mini |

## Mac Mini

```bash
npm install
npm start                 # leave running (SSH ok)
# second session:
npm run control           # keys 1–4 / Esc — SHOW_URL optional
# optional Kodak / séance / OSC env on the npm start process:
# KODAK_FORWARD='…' ESP32_URL='…' AUDIO_BACKEND=osc npm start
```

## Each desk Pi

1. Kiosk: `sudo bash setup-kiosk.sh N MAC_IP`  
2. Agent: copy `desk-pi/agent/`, set `DESK_ID` + `SHOW_URL`, enable systemd  

## Test agent without hardware

```bash
cd deploy/desk-pi/agent
MOCK=1 DESK_ID=1 SHOW_URL=http://127.0.0.1:3847 python3 desk_agent.py
# press Enter = button
```
