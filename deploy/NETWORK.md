# Show network — dedicated router (locked)

**Decision (2026-09-02):** A **physical router** provides Wi‑Fi and DHCP. Desk Pis (including desk-4) are **clients only** — no Pi access point.

```text
Router (gateway + DHCP + 2.4 GHz Wi‑Fi)
        │
        ├── Mac Mini          npm start :3847
        ├── desk-1 Pi
        ├── desk-2 Pi
        ├── desk-3 Pi
        ├── desk-4 Pi
        ├── Shelly Plug       Kodak mains
        └── ESP32             séance (required)
```

ESP32 is **not** optional — same LAN as the Mac so `ESP32_URL` works.

---

## Roles

| Device | Role on this LAN |
|--------|------------------|
| **Router** | Gateway, DHCP, Wi‑Fi (2.4 GHz for IoT) |
| **Mac Mini** | Show server only |
| **desk-1…4** | Wi‑Fi clients + pyclient |
| **Shelly** | Wi‑Fi client; fixed IP or DHCP reservation; HTTP from Mac |
| **ESP32** | Wi‑Fi client; fixed IP or DHCP reservation; HTTP from Mac |

Show brain stays on the **Mac Mini**.

---

## Two Macs (do not confuse)

| Machine | Wi‑Fi | Internet | Role |
|---------|-------|----------|------|
| **Dev laptop** (Cursor / scp) | Lab or home Wi‑Fi | Yes | Code, copy files, ssh when Pis are on lab net |
| **Mac Mini** (show server) | **Show router SSID** | Optional | `npm start` at `192.168.50.10:3847` |

- Configure the Mac Mini’s show-network profile with a **static IP** or rely on a **DHCP reservation** on the router.
- Dev laptop joins the show Wi‑Fi only briefly for on-site testing.

---

## Progress log

| Date | Note |
|------|------|
| 2026-09-01 | desk-4 Pi 4: `setup-show-ap.sh` run (superseded) |
| 2026-09-02 | **Locked:** dedicated router replaces Pi AP |
| 2026-09-02 | **TODO:** router SSID/password on staff card; DHCP reservations for Mac, Shelly, ESP32 |

---

## Addressing (suggested — configure on router)

Use one subnet consistently. Example `192.168.50.0/24`:

| Host | IP | How |
|------|-----|-----|
| **Router (gateway)** | `192.168.50.1` | Router LAN settings |
| Mac Mini | `192.168.50.10` | DHCP reservation or static on Mac |
| desk-1 | `192.168.50.11` | DHCP reservation (optional) |
| desk-2 | `192.168.50.12` | DHCP reservation (optional) |
| desk-3 | `192.168.50.13` | DHCP reservation (optional) |
| desk-4 | `192.168.50.14` | DHCP reservation (optional) |
| **Shelly** | `192.168.50.20` | **DHCP reservation on router** (recommended) |
| **ESP32** | `192.168.50.30` | DHCP reservation or static in firmware |

- **SSID / password:** set on the router; write on staff card.
- **Band:** 2.4 GHz required for Shelly + ESP32; 5 GHz optional for Mac if supported.

Every desk pyclient / agent:

```bash
SHOW_URL=http://192.168.50.10:3847
```

---

## 1. Router setup

1. Place router; power on.
2. Configure LAN (e.g. `192.168.50.1/24`).
3. Create Wi‑Fi SSID + password (2.4 GHz enabled).
4. Add **DHCP reservations** for at least:
   - Mac Mini → `.10`
   - Shelly → `.20`
   - ESP32 → `.30`
5. Optional: reservations for desk-1…4 (`.11`–`.14`) for easier SSH.

**Shelly (easiest path):** join router Wi‑Fi via Shelly app → in the **router admin UI**, reserve `192.168.50.20` for the Shelly’s MAC address. No static IP needed on the Shelly itself.

**Verify Shelly from Mac:**

```bash
curl -X POST -d '{"id":0,"on":true}'  "http://192.168.50.20/rpc/Switch.Set"
curl -X POST -d '{"id":0,"on":false}' "http://192.168.50.20/rpc/Switch.Set"
```

Tell the show server:

```bash
export SHELLY_URL=http://192.168.50.20
# or set "shellyUrl" in deploy/kodak-carousel.json
```

---

## 2. Mac Mini

1. Wi‑Fi → show SSID → password.
2. Static IP **192.168.50.10** on the Mac, **or** DHCP reservation on router.
3. Gateway = router (`192.168.50.1`).
4. Start show: `cd ~/izbrisani && npm start`
5. Check: `curl -s http://127.0.0.1:3847/api/health`

```bash
export ESP32_URL=http://192.168.50.30
export SHELLY_URL=http://192.168.50.20
```

---

## 3. Desk Pis (desk-1…4)

```bash
# On each desk Pi (GUI Wi-Fi or nmcli)
sudo nmcli dev wifi connect YOUR_SSID password 'YOUR_PASSWORD'
hostname -I
curl -s http://192.168.50.10:3847/api/health
```

Update `desk-client.service`:

```text
Environment=SHOW_URL=http://192.168.50.10:3847
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart desk-client
```

---

## 4. Shelly + ESP32

1. Shelly app / web UI → join **router Wi‑Fi** (2.4 GHz).
2. ESP32 firmware → same SSID.
3. Fixed addresses via router DHCP reservations (preferred) or device static IP with gateway `192.168.50.1`.

Kodak power is controlled by `server/kodak-carousel.js` via `SHELLY_URL` — no manual curl during the show.

---

## Staff day

1. Power **router first**; wait for Wi‑Fi up.
2. Power Mac Mini + desk Pis + panels + ESP32 + Shelly.
3. Confirm Mac health: `curl http://192.168.50.10:3847/api/health`
4. Kodak front switch **ON**; Shelly starts OFF (server turns on for desk-4 carousel).

No museum Wi‑Fi required for show operation.

---

## Checklist

- [ ] Router configured; SSID/password on staff card
- [ ] DHCP reservations: Mac `.10`, Shelly `.20`, ESP32 `.30`
- [ ] Mac on show Wi‑Fi; `npm start` OK
- [ ] desk-1…4 on show Wi‑Fi; `SHOW_URL` → `.10`
- [ ] Shelly curl ON/OFF from Mac
- [ ] ESP32 séance from Mac
- [ ] Control open → all four screens sync

---

## Deprecated

- **`deploy/desk-pi/setup-show-ap.sh`** — Pi-as-AP fallback only; do not use if a router is installed.

## Related

- `deploy/SHOW_DAY.md` — staff boot
- `deploy/checkpoint_seance.md` — ESP32
- `deploy/checkpoint_kodak.md` — Shelly + Kodak relay
- `deploy/desk-pi/pyclient/` — desk display
- `deploy/kodak-carousel.json` — `shellyUrl`, `slideCount`
