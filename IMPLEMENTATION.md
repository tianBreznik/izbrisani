# anatomija pregona — Implementation summary

Last updated: 2026-09-02

---

## Architecture (current)

```text
Mac Mini (hub)
  ├── Node show server (:3847)
  ├── SuperCollider (8ch) — ambient + monologue OSC
  ├── USB HID relay → Kodak Forward (ch1)
  ├── Shelly Plug → Kodak mains (carousel power)
  └── Wi‑Fi → desk Pis, Shelly, ESP32

Desk Pi ×4
  ├── desk_client.py (pygame subtitles + GPIO Talk)
  ├── 7″ HDMI 1024×600 (3D-printed case)
  └── Talk → POST /api/channel/N/open (press only)
```

**No Pico.** Buttons on each desk → that Pi’s GPIO. Kodak is Mac-side only.

**Channel rule:** one live channel at a time. Desk Talk while live → ignored. Session ends on VTT timer (`session-end`) or operator Esc (`manual`). Control panel may `?force=1` for ops override only.

See [`deploy/SHOW_DAY.md`](./deploy/SHOW_DAY.md), [`deploy/NETWORK.md`](./deploy/NETWORK.md).

---

## Outputs per state

| State | All desk screens | Audio (SC 8ch) | ESP32 séance | Kodak |
|-------|------------------|----------------|--------------|-------|
| `idle` | black | ambient loop | lights on (`/stop?light=all`) | Shelly off |
| `channel_open(n)` | desk *n* subtitles | monologue *n* | hunt → `/dark` | — |
| desk 4 `session-end` / `kodak` | idle / kodak busy | stop | stay `/dark` | Shelly ON → pulses → Shelly OFF |

Shadow projectors (`/shadow/*`) — **not used** in current show.

---

## Key software paths

| Path | Role |
|------|------|
| `server/index.js` | API + WebSocket |
| `server/hardware.js` | séance + Kodak carousel hook |
| `server/sc-osc.js` | SC OSC; VTT timer ends session |
| `server/kodak-carousel.js` | desk 4 session-end carousel |
| `deploy/desk-pi/pyclient/desk_client.py` | Pi display + button |
| `public/js/client.js` | browser bench desk windows |
| `content/channels.json` | channels + VTT + audio paths |

---

## Resolved (no further software work)

| Item | Status |
|------|--------|
| SC `/done` inbound | Not needed — VTT fallback is show path |
| SC `/shower/stop` handling in patch | Not required for show |
| Generative ambient | Done (Tisa) |
| 3D desk cases | Printed |
| Shadow mapping | Not used |
| Spoken essays | `vox-01`…`vox-04` + OSC |

---

## Remaining (hardware / deploy)

- Router + Shelly + ESP32 on show LAN; `SHELLY_URL`, `ESP32_URL` on Mac
- Kodak relay wiring + carousel bench test
- Pyclient deployed to all four Pis (systemd)
- Mic **pull-up resistors** on soldered Talk lines
- Soak test

---

## Related

- Workspace: `/Users/Tian/izbrisani`
- Deploy: `deploy/README.md`, `deploy/CHECKLIST.md`
