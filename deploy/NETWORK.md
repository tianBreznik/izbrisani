# Show network — zero-switch wireless (locked for now)

**Decision (2026-08-31):** No Ethernet switch. **Kodak desk Pi** runs a **Wi‑Fi access point**. Everything joins that SSID.

```text
desk-4 Pi (Kodak + AP + DHCP)
        │  2.4 GHz Wi‑Fi
        ├── Mac Mini          npm start :3847
        ├── desk-1 Pi
        ├── desk-2 Pi
        ├── desk-3 Pi
        ├── Shelly Plug       Kodak mains
        └── ESP32             séance (required)
```

ESP32 is **not** optional — same SSID as the Mac so `ESP32_URL` works.

---

## Roles

| Device | Role on this LAN |
|--------|------------------|
| **desk-4 (Pi 4 preferred)** | Wi‑Fi AP + DHCP + pyclient `DESK_ID=4` |
| **Mac Mini** | Show server only (joins AP as client) |
| **desk-1…3** | AP clients + pyclient |
| **Shelly** | AP client; fixed IP; `KODAK_POWER_*` from Mac |
| **ESP32** | AP client; fixed IP; `ESP32_URL` from Mac |

Show brain stays on the **Mac**. The Pi is the **radio**, not Node.

---

## Addressing

| Host | IP |
|------|-----|
| desk-4 AP (gateway) | `192.168.50.1` |
| Mac Mini | `192.168.50.10` (static or DHCP reservation) |
| desk-1 | `192.168.50.11` |
| desk-2 | `192.168.50.12` |
| desk-3 | `192.168.50.13` |
| Shelly | `192.168.50.20` |
| ESP32 | `192.168.50.30` |

- **SSID:** `izbrisani-show`
- **Password:** choose once (≥8 chars); write on staff card
- **Band:** 2.4 GHz only

Every desk pyclient / agent:

```bash
SHOW_URL=http://192.168.50.10:3847
```

---

## 1. Create the AP (on desk-4)

Copy script from the Mac, then run on the Pi:

```bash
# Mac (adjust user/IP if desk-4 is still on lab Wi-Fi)
scp deploy/desk-pi/setup-show-ap.sh moderna@DESK4_IP:~/

# desk-4
sudo bash ~/setup-show-ap.sh 'YOUR_PASSWORD'
# optional 2nd arg if Wi-Fi isn't auto-detected:
# sudo bash ~/setup-show-ap.sh 'YOUR_PASSWORD' wlan0
```

Script creates NetworkManager connection `izbrisani-ap` with autoconnect, address `192.168.50.1/24`, DHCP for clients.

**Verify:**

```bash
nmcli connection show --active
ip -4 addr show wlan0
# From another phone: see SSID izbrisani-show
```

**Reboot test (required):**

```bash
sudo reboot
# after boot — AP must come back without keyboard
nmcli -t -f NAME,DEVICE connection show --active
```

Use a **Pi 4**. Do not run the AP on a 3B+.

---

## 2. Join Mac Mini

1. Wi‑Fi → `izbrisani-show` → password.
2. Prefer static IP **192.168.50.10**, subnet `255.255.255.0`, router `192.168.50.1` (DNS can be `192.168.50.1` or empty).
3. Start show: `cd ~/izbrisani && npm start`
4. Check: `curl -s http://127.0.0.1:3847/api/health`

---

## 3. Join desk-1…3

```bash
# On each desk Pi (GUI Wi-Fi or nmcli)
sudo nmcli dev wifi connect izbrisani-show password 'YOUR_PASSWORD'
hostname -I   # should be 192.168.50.x
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

Optional static IPs `.11` / `.12` / `.13` via NM or `dhcpcd` — helps SSH.

---

## 4. Shelly + ESP32

1. Put each in setup mode; join `izbrisani-show`.
2. Set fixed IPs `.20` (Shelly) and `.30` (ESP32) in their apps / portals if possible.
3. On Mac:

```bash
export KODAK_POWER_ON='curl -s -X POST -d "{\"id\":0,\"on\":true}" "http://192.168.50.20/rpc/Switch.Set"'
export KODAK_POWER_OFF='curl -s -X POST -d "{\"id\":0,\"on\":false}" "http://192.168.50.20/rpc/Switch.Set"'
export ESP32_URL='http://192.168.50.30'
```

---

## Staff day

1. Power **desk-4 first** (AP up).
2. Power Mac + other desks + Shelly + ESP32.
3. Wait until Mini is on `izbrisani-show`; health check OK.
4. Kodak front switch / Shelly as usual.

No museum Wi‑Fi. No switch.

---

## Checklist

- [ ] desk-4 is a **Pi 4**
- [ ] `setup-show-ap.sh` run; SSID/password on staff card
- [ ] Reboot desk-4 → AP returns
- [ ] Mac on AP at `.10`; `npm start` OK
- [ ] desk-1…3 on AP; `SHOW_URL` → `.10`
- [ ] Shelly on AP; power curl from Mac
- [ ] ESP32 on AP; séance from Mac
- [ ] Control open → all four screens sync

---

## Later (not now)

- Hybrid: Ethernet for Mac/desks + Wi‑Fi AP for Shelly/ESP32.
- Move show server onto desk-4 (not planned).

## Related

- `deploy/desk-pi/setup-show-ap.sh` — AP installer
- `deploy/SHOW_DAY.md` — staff boot
- `deploy/checkpoint_seance.md` — ESP32
- `deploy/checkpoint_kodak.md` — Shelly
- `deploy/desk-pi/pyclient/` — desk display
