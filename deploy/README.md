# Deploy index

## Architecture (current)

```text
Mac Mini = show server + SuperCollider (8ch) + ESP32 séance + Kodak (Shelly + USB relay)
Desk Pi ×4 = desk_client.py (pygame subtitles + GPIO Talk)
```

**No Pico.** Buttons on each desk → that Pi’s GPIO. Mac has **no GUI** — use `npm run control` for ops.

## Docs

| File | Purpose |
|------|---------|
| [`PHYSICAL.md`](./PHYSICAL.md) | Wiring |
| [`CHECKLIST.md`](./CHECKLIST.md) | On-site checklist |
| [`NETWORK.md`](./NETWORK.md) | Dedicated router + IPs |
| [`desk-pi/pyclient/`](./desk-pi/pyclient/) | **Production desk client** |
| [`desk-pi/agent/`](./desk-pi/agent/) | Legacy GPIO-only agent |
| [`checkpoint_kodak.md`](./checkpoint_kodak.md) | Kodak carousel + Shelly |
| [`checkpoint_seance.md`](./checkpoint_seance.md) | ESP32 séance lights |
| [`checkpoint_audio.md`](./checkpoint_audio.md) | SuperCollider 8ch + OSC |
| [`automation/`](./automation/) | **Opt-in boot** — test tomorrow without changing current setup |

## Mac Mini

```bash
npm install
npm start                 # leave running (SSH ok)
# second session:
npm run control           # keys 1–4 / Esc — SHOW_URL optional
# optional on npm start:
# SHELLY_URL=http://192.168.50.20 ESP32_URL=http://192.168.50.30 AUDIO_BACKEND=osc
```

## Each desk Pi

Pyclient: see [`desk-pi/pyclient/CHECKLIST.md`](./desk-pi/pyclient/CHECKLIST.md) — `desk_client.py` + `desk-client.service`.

## Test without hardware

```bash
# Browser bench (Mac): open /desk/1?talk=1 … /desk/4?talk=1
# Or pyclient mock:
MOCK=1 DESK_ID=1 SHOW_URL=http://127.0.0.1:3847 python3 deploy/desk-pi/pyclient/desk_client.py
```
