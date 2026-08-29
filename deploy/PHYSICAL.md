# Physical install — wiring & layout

Mac Mini hub + 4 desk Pis (buttons on desks) + ESP32 séance lights + Kodak Ektalite (wired remote Forward).

**No Pico required.** Desk buttons use each Pi’s GPIO. Kodak control: see [`checkpoint_kodak.md`](./checkpoint_kodak.md).

---

## 1. Topology

```text
Mac Mini
  ├── npm start (:3847)
  ├── ESP32 séance lights (HTTP)
  ├── Kodak Ektalite (wired remote Forward + USB relay)
  └── Ethernet → switch → desk-1 … desk-4

Desk N
  ├── Chromium kiosk → /desk/N
  ├── desk_agent.py → GPIO button + optional LED
  ├── Mic/button on desk → short wire → Pi GPIO
  └── HDMI → 7″ panel
```

---

## 2. Desk button wiring (per Pi)

| BCM pin | Function |
|---------|----------|
| **17** | PTT / button (to GND when pressed) |
| **GND** | Button return |
| **27** | Optional LED (PWM idle glow) |

Keep runs **short** (button in the same desk / 3D case / mic base).

Mic PTT: continuity-test first; dry contact only; isolate from XLR audio.

Agent: `deploy/desk-pi/agent/` — `POST /api/channel/N/open` on press.

---

## 3. Kodak Ektalite (Mac Mini)

Inventory: **wired remote** (6-pin) + **USB relay**. IR kit 873 5086 = backup.

**Plan A (locked):** Mac → **USB relay ch1 COM+NO** → parallel across wired remote **Forward** switch. Forward only. See [`checkpoint_kodak.md`](./checkpoint_kodak.md).

```text
Show server hardware.js
  → KODAK_FORWARD pulse (when algorithm says)
  → Plan A: relay across wired remote Forward
```

Until env vars are set, the server **logs** stubs only (safe).

---

## 3b. Séance / shadow lights (ESP32)

Same show state as Kodak. Mini HTTP to ESP32 on the LAN:

```text
channel N open → GET /start → wait SEANCE_SETTLE_MS → GET /stop?light=N-1
idle           → GET /stop?light=all
```

```bash
export ESP32_URL='http://192.168.1.50'
export SEANCE_SETTLE_MS=3000
npm start
```

See [`checkpoint_seance.md`](./checkpoint_seance.md). Digital `/shadow/1` `/shadow/2` optional.

---

## 4. Network / power / shadows

Unchanged: dedicated switch; Mac dual display → shadows; label cables; PDU for Mac + 4 Pi + panels + 2 projectors + Kodak.

See also `CHECKLIST.md`.

---

## 5. Bring-up order

1. Mac `npm start` + shadows  
2. One desk kiosk + `MOCK=1` agent on Mac/laptop to test API  
3. Desk-1 with real GPIO button  
4. Remaining desks  
5. Kodak relay last  

Exclusive rule: while a channel is live, other desk buttons get `409` (ignored). Same desk press again toggles close. Control panel uses `?force=1` to override.
