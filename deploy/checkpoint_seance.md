# Checkpoint: séance / shadow lights (ESP32)

Status: **wired in software** on the Mac Mini show server. Hardware/network still need a live ESP32 IP and settle time.

Replaces digital shadow projectors for the exhibition. Kodak film: [`checkpoint_kodak.md`](./checkpoint_kodak.md) — **Plan A:** 6-pin + USB relay; **Plan B:** IR blaster.

---

## Behaviour

| Show state | ESP32 |
|------------|--------|
| Channel **N** opens (desk 1–4) | `GET /start` then after settle `GET /stop?light=N-1` |
| Idle (Esc / session-end) | `GET /stop?light=all` |

Kodak is independent — desk **4** `session-end` only (`checkpoint_kodak.md`). Not tied to channel open/close.

Desk **1→4** maps to MOSFET **0→3** (same as the Python helper: `stop(light_num - 1)`).

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
GET http://ESP32_IP/start
GET http://ESP32_IP/stop?light=0   # desk 1
GET http://ESP32_IP/stop?light=1   # desk 2
GET http://ESP32_IP/stop?light=2   # desk 3
GET http://ESP32_IP/stop?light=3   # desk 4
GET http://ESP32_IP/stop?light=all
```

Firmware must match this. If paths differ, change `hardware.js` or ask them to match.

---

## Still needed from you / lighting

- [ ] **ESP32 IP** on the exhibition LAN (static or DHCP reservation). Serial Monitor print is the source of truth — `192.168.1.50` in the script is a placeholder.
- [ ] Confirm Mini and ESP32 are on the **same network** (Mini Ethernet + ESP32 Wi‑Fi to that SSID, or both on the show switch).
- [ ] **`SEANCE_SETTLE_MS`** — how long the hunt should run before the winning light (ask them; default 3000).
- [ ] Confirm **`/stop?light=all`** really turns everything off (vs four separate stops).
- [ ] Confirm light **0–3** are physically the same order as desks **1–4** (swap MOSFETs or mapping if not).
- [ ] Optional: firmware should ignore a second `/start` while hunting, or we rely on Mini cancel-on-idle.

Not needed: Python REPL on a Pi — Mini Node does the same GETs.

---

## Bench test

1. ESP32 on Wi‑Fi; note IP.
2. From Mini: `curl 'http://ESP32_IP/start'` then `curl 'http://ESP32_IP/stop?light=0'`
3. `ESP32_URL=http://ESP32_IP npm start` → control **1** → hunt then light 1; **Esc** → all off.

---

## Related

- Kodak: `server/kodak-carousel.js` + `SHELLY_URL`
- Digital `/shadow/*` in repo — **not used** (ESP32 is the shadow)
