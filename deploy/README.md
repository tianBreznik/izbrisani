# Deploy index

## Architecture (current)

```text
Mac Mini = show server + 2 shadows + USB Kodak relay
Desk Pi ×4 = kiosk /desk/N + GPIO button agent (+ speaker later)
```

**No Pico.** Buttons are on each desk → that Pi’s GPIO.

## Docs

| File | Purpose |
|------|---------|
| [`PHYSICAL.md`](./PHYSICAL.md) | Wiring |
| [`CHECKLIST.md`](./CHECKLIST.md) | On-site checklist |
| [`desk-pi/README.md`](./desk-pi/README.md) | Kiosk imaging |
| [`desk-pi/setup-kiosk.sh`](./desk-pi/setup-kiosk.sh) | Autostart Chromium |
| [`desk-pi/agent/`](./desk-pi/agent/) | **GPIO companion** |
| [`mac/open-shadows.sh`](./mac/open-shadows.sh) | Open control + shadows |

## Mac Mini

```bash
npm install
npm start
# optional Kodak:
# KODAK_RELAY_ON='…' KODAK_RELAY_OFF='…' npm start
bash deploy/mac/open-shadows.sh
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
