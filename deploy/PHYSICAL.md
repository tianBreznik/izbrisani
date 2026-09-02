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
  └── Wi‑Fi (show router) → desk-1 … desk-4, Shelly, ESP32

Desk N
  ├── desk_client.py (pygame + GPIO Talk)
  ├── Mic/button → BCM17 + GND (+ pull-up if needed)
  └── HDMI → 7″ panel
```

---

## 2. Desk button wiring (per Pi)

| BCM pin | Function |
|---------|----------|
| **17** | PTT / button (to GND when pressed; external pull-up if needed) |
| **GND** | Button return |
| **27** | Optional LED (PWM idle glow) |

Keep runs **short** (button in the same desk / 3D case / mic base).

Mic PTT: continuity-test first; dry contact only; isolate from XLR audio.

Pyclient: `deploy/desk-pi/pyclient/desk_client.py` — `POST /api/channel/N/open` on **press only**; release ignored.

---

## 3. Kodak Ektalite (Mac Mini)

Inventory: **wired remote** (6-pin) + **USB relay**. IR kit 873 5086 = backup.

**Plan A (locked):** Mac → **USB relay ch1 COM+NO** → parallel across wired remote **Forward** switch. Forward only. See [`checkpoint_kodak.md`](./checkpoint_kodak.md).

```text
Desk 4 session-end (natural)
  → server/kodak-carousel.js
  → Shelly ON → 80× Forward (USB relay ch1) → Shelly OFF
```

See [`checkpoint_kodak.md`](./checkpoint_kodak.md). Set `SHELLY_URL` on Mac.

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

See [`checkpoint_seance.md`](./checkpoint_seance.md). Digital shadow projectors — **not used**.

---

## 4. Network / power

Dedicated show router (see [`NETWORK.md`](./NETWORK.md)); PDU for Mac + 4 Pi + panels + ESP32 + Shelly + Kodak.

See also `CHECKLIST.md`.

---

## 5. Bring-up order

1. Router + Mac `npm start` + SuperCollider  
2. One desk pyclient (`MOCK=1` or browser `?talk=1`) to test API  
3. Desk-1 with real GPIO + pull-up  
4. Remaining desks  
5. Kodak relay + Shelly last  

Exclusive rule: while a channel is live, **any** desk button press is ignored (`409 channel_busy`). Session ends when monologue/subtitles finish or operator closes. Control panel uses `?force=1` to override.
