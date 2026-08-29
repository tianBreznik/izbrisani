# Exhibition inventory (meeting)

Date: 2026-08-06  
Architecture: **1× Mac Mini + 4× desk Raspberry Pi**  
Buttons on each desk → desk Pi GPIO. Kodak via Mac-side USB relay. No Pico.

Status columns are for meeting notes: **HAVE / NEED / TBD**.

---

## A. Confirmed in project scope

| Item | Qty | Status | Notes |
|------|-----|--------|-------|
| Mac Mini | 1 | HAVE | Main hub |
| Kodak Ektalite **500** + IR remote (CAT 873 5086) | 1 | HAVE | **No 12-pin** — lamp = front NO LIGHT/ON switch only |
| Old conference mics (PTT buttons) | 3–4 | HAVE | Dry-contact continuity test required |
| Software repo (`izbrisani`) | 1 | HAVE | Runs on Mac |

---

## B. Desk node computing

| Item | Qty | Status | Notes |
|------|-----|--------|------|
| Raspberry Pi 4 (4GB) or Pi 5 (4GB) | **4** (+1 spare) | NEED | Prefer identical; avoid 3B+ |
| Official Pi PSU | **5** | NEED | Pi4: 5V 3A USB-C; Pi5: 27W |
| microSD 32–64GB (A2) | **5** | NEED | 4 desks + spare image |
| Heatsink/fan case | **4–5** | NEED | For long runtime stability |

---

## C. Desk screens + cases (locked: Waveshare HDMI)

| Item | Qty | Status | Notes |
|------|-----|--------|------|
| **Waveshare 7inch HDMI LCD (C)** 1024×600 IPS | **4** (+1 spare) | NEED | Preferred for custom 3D case (no plastic shell) |
| *Alt:* **Waveshare 7inch HDMI LCD (H) with case** | same qty | — | Only if temporary case needed before print |
| HDMI cable (Pi → screen) | **5** | NEED | Short |
| USB power for panel | **5** | NEED | Usually micro-USB; do **not** connect touch USB if present |
| 3D-printed desk cases / bezels | **4** | TBD | Measure one panel first |
| M3 screws / standoffs | 1 kit | NEED | Match panel holes |
| PETG filament | — | HAVE | Already available |

> Touch on (C)/(H) is unused: leave touch cable unplugged. GPIO stays free for desk buttons.

---

## D. Buttons / GPIO (per desk)

| Item | Qty | Status | Notes |
|------|-----|--------|------|
| Mic/button at desk | **4** | HAVE | PTT as dry contact |
| Hook-up wire (22–24 AWG) | ~10–20 m | NEED | Short desk runs |
| Dupont / jumper wires | 1 pack | NEED | Pi GPIO |
| Heat-shrink tubing | small pack | NEED | Insulation |
| Cable labels | 1 set | NEED | Desk mapping |
| Resistors (220Ω–1kΩ) | 8–16 | TBD | Only if LEDs are used |
| LEDs (if not using mic lamps) | 4 | TBD | Idle glow optional |

Default GPIO target: **button BCM17**, **LED BCM27**, GND common (HDMI panel → GPIO free for buttons).

---

## E. Kodak control (Mac side)

**Plan A (locked):** **wired remote Forward** + USB relay (1 ch) on Mac Mini. Forward only. IR kit = backup.

| Item | Qty | Status | Notes |
|------|-----|--------|------|
| Kodak **wired remote** (6-pin) | **1** | **HAVE** | **Plan A** — tap Forward switch; stays plugged in |
| Kodak Ektalite IR kit | **1** | **HAVE** | CAT **873 5086** — backup only |
| **2-ch USB relay** (opto-isolated) | **1** | **HAVE** | **Plan A** — use **1 ch** across Forward (COM+NO) |
| **USB IR blaster** (Mac) | — | SKIP | Not needed unless wired path fails |

Details: **`deploy/checkpoint_kodak.md`**.

Do **not** switch 230 V from Pi pins.

---

## F. Audio / spoken essays

| Item | Qty | Status | Notes |
|------|-----|--------|------|
| Directional speakers | **4** | TBD | One per desk |
| Bass speaker | 1 | TBD | |
| Audio cables / DACs | TBD | TBD | Depends on speaker type |
| Spoken essay audio files | 4 | TBD | Not yet wired in software |

---

## G. Usually available in museum (check before buying)

- Ethernet cables + switch/router  
- Basic tools (multimeter, screwdrivers, strippers, soldering iron)  
- Cable management consumables (gaffer, zip ties)  

---

## H. Software readiness checklist

| Item | Status |
|------|--------|
| Mac Mini runs `npm start` | |
| Desk kiosk (`/desk/N`) autostart | |
| Desk GPIO agent (`desk_agent`) | |
| Kodak relay commands (`KODAK_RELAY_ON/OFF`) | |
| Spoken audio playback | **not built yet** |

---

## Meeting decisions needed

| Decision | Owner | Deadline |
|----------|-------|----------|
| Approve 4(+1) desk Pi procurement | | |
| Approve 5× Waveshare 7\" HDMI LCD (C) | | |
| Confirm Kodak switching interface with technician | | |
| Confirm audio hardware path | | |
| Assign purchasing responsibility | | |
