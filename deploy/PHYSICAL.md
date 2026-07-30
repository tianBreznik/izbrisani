# Physical install — wiring & layout

Mac Mini hub + 4 desk Pis (buttons on desks) + 2 shadow projectors + Kodak USB relay.

**No Pico required.** Desk buttons use each Pi’s GPIO. Kodak uses a USB relay on the Mac.

---

## 1. Topology

```text
Mac Mini
  ├── npm start (:3847)
  ├── /shadow/1 /shadow/2 → 2 projectors
  ├── USB relay → Kodak
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

## 3. Kodak (Mac Mini)

```text
Show server hardware.js
  → env KODAK_RELAY_ON / KODAK_RELAY_OFF
  → USB relay module
  → Kodak control or IEC (per technician)
```

Example:

```bash
export KODAK_RELAY_ON='usbrelay R1=1'
export KODAK_RELAY_OFF='usbrelay R1=0'
npm start
```

Until a relay is plugged in, the server **logs** ON/OFF only (safe stub).

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
