# Checkpoint: desk mic PTT → Pi GPIO

Status: **End-to-end proven in lab** (2026-08-26).

```text
Talk (alligator clips on mic pads)
  → Pi inner-row pins 11 + 9 (BCM17 + GND)
  → desk_agent.py (foreground)
  → POST /api/channel/1/open
  → Mac/laptop npm start
  → channel_open / idle (+ Kodak/séance stubs in hardware.js)
```

**Still to do next lab:** permanent solder (clips only so far) → **systemd `desk-agent`** → stable network (`SHOW_URL`).

**Mic model:** DAP Audio **MA-8120PM** Paging Microphone V1  
**RJ45:** not for amp or Pi Ethernet — **repurpose as a 8-pin cable connector** only (see § C2).

**Lab wiring (2026-08-31):** soldering Talk switch pad → RJ45 pin so one Cat5 run reaches the desk Pi (reuse existing RJ45 hole in base). Multimeter: button pad ↔ chosen RJ45 pin **beeps only while Talk held** = correct.

`desk_agent.py` **is** the real desk software (not a throwaway test client).

---

## Goal

```text
Mic PTT (dry contact)
  → Pi BCM17 + GND
  → desk_agent.py
  → POST /api/channel/N/open
  → show server (Mac Mini or laptop)
```

While any channel is live, press again on **any** desk → ignored (`409 channel_busy`). Idle when monologue/subtitles end or operator closes.

---

## Lab findings (2026-08-26)

| Finding | Detail |
|---------|--------|
| Dry contact | Two pads under Talk in the 6-pin block area; **only** short while Talk held |
| Pi header | Pins **9 (GND)** and **11 (GPIO17)** are on the **inner** row (toward SoC), not the outer edge row |
| Direct short 9↔11 | Proves GPIO + agent without the mic |
| Bad solder | Permanent ~0 Ω between Duponts with Talk **up** → stuck “pressed”; Talk does nothing |
| False PRESS/RELEASE on plug-in | Joint intermittent or pads not fully open when released |
| Alligator clips | **Worked** — full toggle `open → channel_open 1` / `idle` on Pi + Mac logs |
| Lab Wi‑Fi | Client isolation / no Mac→Pi SSH; hotspot OK; Pi can often **pull** files from Mac (`python3 -m http.server`) even when SSH fails |
| Agent install | Was missing on Pi; copied via HTTP from Mac `deploy/desk-pi/agent/` |
| Deps on Pi | `python3-gpiozero`, `python3-lgpio`, `python3-websocket` (apt; avoid pip “externally managed”) |
| `GPIOZERO_PIN_FACTORY=lgpio` | Use if Button events are flaky |

Example hotspot IPs that day: Mac `172.20.10.4`, Pi `172.20.10.3`.

---

## A. Tools

- Multimeter (continuity / Ω)
- Female Dupont → Pi header (cut F–F jumper; solder/clip other end to mic)
- Alligator clips (lab proof before permanent solder)
- Iron + solder **wire** (not paste); IPA to clean; optional flux while soldering
- Pi power off while seating header wires

---

## B. Find the two switch contacts

1. Unplug XLR and RJ45 (RJ45 unused for this show).
2. Meter on candidate pads — **wires off Pi**.
3. Released → **open (OL)**. Held Talk → **~0 Ω**. Release → open.

| Button | Continuity |
|--------|------------|
| Down | Beep / ~0 Ω |
| Up | Open (not a few ohms) |

If Dupont ends read ~0 Ω with Talk **up**, fix bridge / wrong pads before plugging into the Pi.

---

## C. Wire to Pi 4

| Mic | Physical pin | BCM |
|-----|--------------|-----|
| Contact A | **11** (inner row) | **GPIO 17** |
| Contact B | **9** (inner row) | **GND** |

Polarity does not matter. Pin 1 is at the SD-card / display end of the header.

```text
Mic PTT ─── pin 11 (GPIO17)
       └─── pin 9  (GND)
```

**Permanent joint (next lab):** tin pad + wire, hook/wrap for grip, solder one pad at a time, hot-glue strain relief, remeter Dupont ends, then plug in.

### C2. RJ45 pass-through (current build — desk mic base)

Use the **RJ45 jack as a mechanical connector**, not network:

```text
Talk switch pad ──solder──► RJ45 pin N  (switched leg)
Other switch pad ──────────► RJ45 pin M  (return / GND)
        │                           │
        └── Cat5 (2 conductors) ────┘
                    │
              Pi GPIO header
         pin 11 (GPIO17) + pin 9 (GND)
```

**“One wire” on the board** = one new solder from the Talk pad to an RJ45 pin; the **return** still needs a second path (second RJ45 pin, or existing board GND tied to another RJ45 pin you meter once).

| Test | Pass |
|------|------|
| Talk **up** | Open (OL) between signal RJ45 pin and GND RJ45 pin |
| Talk **held** | Beep (~0 Ω) between those two RJ45 pins |
| Mic **unpowered** | No amp, no XLR — dry contact only |

**Do not:** plug this RJ45 into the Pi’s Ethernet port, a switch, or the MA-8120 amp. Only the **two chosen pins** go to GPIO17 + GND.

Label each desk: which RJ45 pins = signal / GND (same pinout on all four mics).

---

## C3. **HIGHEST PRIORITY — external pull-up (desk-2 lab finding)**

**Symptom:** Screw ↔ screw with Talk **up** reads **~1–1.3 kΩ** (not OL). Talk **held** &lt;10 Ω.  
`gpio-test-raw.py` starts **LOW / PRESSED** immediately; Talk does nothing (both states read LOW).

**Cause:** ~1 kΩ leak in parallel with the switch. Pi internal pull-up (~50 kΩ) loses → pin ~0.07 V.  
**Fix:** **1 kΩ** pull-up (or **470–560 Ω** for extra margin). Wire at **screw terminals** (Method 3):

```text
Pi pin 9  (GND)  ◄── Dupont ◄── screw A ◄── mic
Pi pin 11 (GPIO17) ◄── Dupont ◄── screw B ◄── mic
                              └── 1 kΩ leg 1 (same screw as GPIO wire)
Pi pin 1  (3.3 V) ◄── Dupont ◄── 1 kΩ leg 2
```

| Part | Where |
|------|--------|
| Mic → GND | Dupont → **physical pin 9** |
| Mic → signal | Dupont → **physical pin 11** (BCM17) |
| Resistor | One leg in **GPIO screw** with pin-11 wire; other leg → short wire + Dupont → **pin 1** |

**Pin 1** = 3.3 V, top of GPIO header by SD card (inner row). Not pin 9.

**Test (Pi on):**

```bash
sudo systemctl stop desk-client desk-agent
GPIOZERO_PIN_FACTORY=lgpio python3 ~/gpio-test-raw.py
```

Talk up → **HIGH**. Talk held → **LOW**. Then `sudo systemctl start desk-client`.

**Values:** 1 kΩ OK for ~1030–1120 Ω leak (~1.7 V HIGH). 500 Ω safer if leak dips lower (~2.2 V HIGH).

**TODO:** Install on **all four desks** before show. Long-term: re-solder for OL when Talk up (true dry contact).

---

## D. Show server (Mac Mini or laptop)

```bash
cd ~/izbrisani
npm start
ipconfig getifaddr en0   # or en1 — use this in SHOW_URL
```

Server must listen on `0.0.0.0:3847`. Mac and Pi must reach each other (hotspot or Ethernet; lab Wi‑Fi often blocks device-to-device).

---

## E. Agent on desk-1

User: **`moderna`**. Files: `~/izbrisani-agent/` (`desk_agent.py`, `requirements.txt`, `desk-agent.service`).

If Mac cannot SSH to Pi but Pi can reach Mac:

```bash
# Mac
cd ~/izbrisani/deploy/desk-pi/agent && python3 -m http.server 8000

# Pi
mkdir -p ~/izbrisani-agent && cd ~/izbrisani-agent
curl -o desk_agent.py http://MAC_IP:8000/desk_agent.py
curl -o requirements.txt http://MAC_IP:8000/requirements.txt
curl -o desk-agent.service http://MAC_IP:8000/desk-agent.service
sudo apt install -y python3-gpiozero python3-lgpio python3-websocket
```

---

## F. Foreground test

```bash
cd ~/izbrisani-agent
DESK_ID=1 SHOW_URL=http://MAC_IP:3847 GPIOZERO_PIN_FACTORY=lgpio python3 desk_agent.py
```

Expect: `[desk-1] button BCM17; …` then on Talk `open → channel_open 1` / `idle`.  
Mac terminal shows `[hardware] channel 1 open` / `idle` (Kodak/ESP32 stub until env set).

Mock (no GPIO): `MOCK=1 DESK_ID=1 SHOW_URL=http://MAC_IP:3847 python3 desk_agent.py` → Enter = press.

---

## G. systemd (survives reboot / no open terminal)

Unit in repo: `deploy/desk-pi/agent/desk-agent.service` — **User=moderna**, edit **SHOW_URL** per venue.

```bash
# edit SHOW_URL in ~/izbrisani-agent/desk-agent.service first
sudo cp ~/izbrisani-agent/desk-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now desk-agent
sudo systemctl status desk-agent
sudo journalctl -u desk-agent -f
```

IP change → edit unit `SHOW_URL` → `sudo systemctl restart desk-agent`.

---

## H. Done when

- [x] PTT dry-contact pair identified  
- [x] Inner-row GPIO17 + GND confirmed  
- [x] Foreground agent + show server toggle channel 1 (alligator clips)  
- [ ] **HIGHEST PRIORITY:** External **1 kΩ** (or 470–560 Ω) pull-up at screw terminals (§ C3); gpio-test-raw HIGH/LOW; desk_client opens channel on Talk  
- [ ] Permanent solder + strain relief; RJ45 pinout labeled; meter clean open/close at RJ45 (or Dupont) ends  
- [ ] `desk-agent` systemd enabled; works after close terminal + reboot  
- [ ] Stable show network (Ethernet preferred); kiosk `/desk/1` still OK  
- [ ] Clone wiring + agent for desks 2–4  

---

## Related

- `deploy/desk-pi/agent/README.md` — agent + systemd  
- `deploy/desk-pi/agent/desk-agent.service` — unit file  
- `deploy/PHYSICAL.md` — GPIO + Kodak  
- `deploy/checkpoint_seance.md` — ESP32 (stubs until `ESP32_URL`)  
- `deploy/desk-pi/setup-kiosk.sh` — Chromium kiosk (desk-1 done earlier)  

## Notes

- Pi **3B+** too slow for kiosk — use **Pi 4**.  
- Prefer Ethernet for show; hotspot works for bring-up.  
- Exit kiosk: `Alt+F4` or `pkill chromium` over SSH.  
- Do not use solder paste for these wire joints — solder wire + iron.  
