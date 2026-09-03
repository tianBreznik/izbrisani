# Checkpoint: séance / shadow lights (ESP32)

Status: **wired in software** on the Mac Mini show server. Hardware/network still need a live ESP32 IP and settle time.

Replaces digital shadow projectors for the exhibition. Kodak film: [`checkpoint_kodak.md`](./checkpoint_kodak.md).

---

## Behaviour

| Show state | ESP32 | Lights |
|------------|--------|--------|
| Channel **N** opens | `GET /start` then after settle `GET /dark` | Blink → dark (subtitles) |
| Kodak carousel | `GET /dark` | Stay dark |
| Idle (Esc / session-end, not in carousel) | `GET /stop?light=all` | **On** (resting) |

Per-desk `GET /stop?light=0..3` is **not** used by the show (Python helper only).

Kodak is independent — desk **4** `session-end` only (`checkpoint_kodak.md`). Séance stays **dark** through the tray loop, then returns to resting lights when idle again.

Hunt timing is **`SEANCE_SETTLE_MS`** (default **3000**). Tune with the lighting person.

Only the **Mini** talks to the ESP32 — not the desk Pis.

---

## Mac Mini env

```bash
export ESP32_URL='http://192.168.50.30'
export SEANCE_SETTLE_MS=3000
export SHELLY_URL='http://192.168.50.20'   # Kodak carousel — see checkpoint_kodak.md
npm start
```

Empty `ESP32_URL` → log stub only (safe).

Code: `server/hardware.js`.

---

## ESP32 HTTP (from their Python)

```text
GET http://ESP32_IP/start              # hunt / blink
GET http://ESP32_IP/dark               # all off (show live / kodak)
GET http://ESP32_IP/stop?light=all     # resting — lights ON
```

Also available on the ESP32 but unused by the show:

```text
GET http://ESP32_IP/stop?light=0..3    # single MOSFET (desk 1→0 … desk 4→3)
```

Firmware must match this. If paths differ, change `hardware.js` or ask them to match.

---

## Still needed from you / lighting

- [ ] **ESP32 IP** on the exhibition LAN (static or DHCP reservation). Serial Monitor print is the source of truth.
- [ ] Confirm Mini and ESP32 are on the **same network**.
- [ ] **`SEANCE_SETTLE_MS`** — how long the hunt should run before `/dark` (ask them; default 3000).
- [ ] Confirm **`/stop?light=all`** turns lights **on** (resting), and **`/dark`** turns them **off**.
- [ ] Optional: firmware should ignore a second `/start` while hunting, or we rely on Mini cancel-on-idle.

Not needed: Python REPL on a Pi — Mini Node does the same GETs.

---

## Bench test

1. ESP32 on Wi‑Fi; note IP.
2. From Mini:
   ```bash
   curl 'http://ESP32_IP/start'
   curl 'http://ESP32_IP/dark'
   curl 'http://ESP32_IP/stop?light=all'
   ```
3. `ESP32_URL=http://ESP32_IP npm start` → control **1** → hunt then dark; **Esc** → lights on.

---

## Related

- Kodak: `server/kodak-carousel.js` + `SHELLY_URL`
- Digital `/shadow/*` in repo — **not used** (ESP32 is the shadow)
