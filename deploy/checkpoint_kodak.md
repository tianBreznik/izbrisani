# Checkpoint: Kodak Ektalite control

Status: **Plan A (locked) — wired remote Forward button + USB relay (1 channel).** Forward only — **no reverse**. IR kit / USB IR blaster = backup only. **When** to pulse (slide algorithm) — still TBD. Software: pulse `KODAK_FORWARD` (not ON/OFF).

Séance lights replace digital shadow projectors; Kodak stays as the **analog film** output.

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-08-28 | Automated slide advance required (no manual operator during show) |
| 2026-08-28 | ~~Ruled out: disassembling hand remote~~ — **superseded** |
| 2026-08-28 | ~~Plan A: 2-ch relay → DIN pins 1–3~~ / ~~Plan B: USB IR blaster~~ — **superseded** |
| 2026-08-30 | **Projector model confirmed:** **Ektalite 500** — **no 12-pin**, lamp = front switch |
| 2026-08-30 | **Lamp:** exhibition hours only (staff) — **not** channel open/close |
| 2026-08-29 | **Plan A (locked):** Mac → **USB relay ch1** → parallel across **wired remote Forward** switch. Plug stays in projector 6-pin. |
| 2026-08-29 | **Forward only** — reverse not needed for show |
| 2026-08-29 | IR hand TX + receiver (873 5086) / USB IR blaster = **manual / fallback only** |
| 2026-08-31 | **Smart plug acquired:** **Shelly Plug S Gen3** (EU). Mains path: wall → Shelly → Kodak cord; **no cord splice**. Front switch left **ON** for show run. Local HTTP from Mac (`curl` to fixed LAN IP). ~~Tasmota / Nous A8T~~ not used — IoTronX had no stock. |
| 2026-08-31 | **Shelly setup TODO:** join museum Wi‑Fi (2.4 GHz), fixed IP, test ON/OFF, set `KODAK_POWER_ON` / `KODAK_POWER_OFF` env on Mac Mini. |

Wired remote stays plugged into the projector for the run. Staff can still press Forward by hand (parallel with relay).

### Shelly Plug S Gen3 (acquired)

```text
Wall ──► Shelly Plug S Gen3 ──► Kodak mains plug
              ▲
         Wi‑Fi / HTTP (Mac Mini)
```

**Do not** plug RJ45 or desk Pis into this — Mac-side only, same as USB relay.

```bash
# ON / OFF (set SHELLY_IP after setup; auth off or add credentials)
curl -X POST -d '{"id":0,"on":true}'  "http://SHELLY_IP/rpc/Switch.Set"
curl -X POST -d '{"id":0,"on":false}' "http://SHELLY_IP/rpc/Switch.Set"
```

```bash
export KODAK_POWER_ON='curl -s -X POST -d "{\"id\":0,\"on\":true}" "http://SHELLY_IP/rpc/Switch.Set"'
export KODAK_POWER_OFF='curl -s -X POST -d "{\"id\":0,\"on\":false}" "http://SHELLY_IP/rpc/Switch.Set"'
```

---

## Model 500 (confirmed)

Label on unit: **Kodak Ektalite 500 slide projector**. No earlier repo note had confirmed model or 12-pin — this is the **first** confirmation.

| Feature | Model 500 | Your unit |
|---------|-----------|-----------|
| **12-pin dissolve socket** | **No** (2000 only) | **No** |
| **INT/EXT switch** | **No** | **No** |
| **Timer (front #12)** | **No** | Absent ✓ |
| **Autofocus (front #9)** | **No** | Absent ✓ |
| **Power switch** | **NO LIGHT / ON** (not LO/HI) | Verify on unit |
| **6-pin remote socket** | **Yes** (all models; IR receiver here) | Yes (873 5086) |
| **873 5086 IR kit** | **Yes** (500 / 1500 / 2000) | Yes |

**Lamp:** front **NO LIGHT / ON** switch only — no 12-pin, no automated low-voltage lamp path.

**Lamp policy (locked):** **exhibition open/close**, not channel open/close.

| Event | Lamp |
|-------|------|
| Museum / show day **opens** | Staff → **ON** |
| Museum / show day **closes** | Staff → **NO LIGHT** or off |
| Desk **channel open** (1–3) | **No Kodak** — séance lights only |
| Desk **4** monologue **finished** → idle | **Forward pulse** (`KODAK_FORWARD`) or relay ON stub |

Per-channel lamp toggling is **ruled out**: halogen thermal stress, visitor abuse (rapid Talk spam), unstable fan/lamp cycling.

**Missing #9 and #12 on the front diagram** fits **500 or 1000** (both lack timer + autofocus). The **500 label** rules out 1000/1500/2000 — e.g. 1000 would have **LO/HI** on the power switch and a quick-release elevating foot (#6).

---

## Plan A (locked) — wired remote Forward + relay

```text
Mac Mini ──USB──► relay (use 1 channel; 2nd unused)
                      │
              ch1 COM ┼──► one side of wired-remote Forward switch
              ch1 NO  ┼──► other side of Forward switch
                      │
                      ▼
         wired remote (still plugged) ──6-pin──► projector
```

**Not connected to desk Pis** — Kodak is Mac-side only.

### Why this is easiest

- No DIN pin hunting, no cutting the IR receiver, no spare 6-pin plug.
- Wired remote already shorts **pin 2 ↔ pin 3** when you press Forward — relay just does the same.
- **Reverse not used** — leave Reverse / Focus alone.
- Hand Forward still works (contacts in parallel).

### How to find the Forward switch pads

1. Unplug wired remote from projector.
2. Open the remote shell.
3. Multimeter **continuity**: press **Forward** → the two pads/wires that beep **only while held** = Forward.
4. (Optional) Confirm they are the leads that go toward DIN **2** and **3** — not Reverse (1+3) or Focus.

### Relay wiring (1 channel)

```text
Relay OFF:  COM ─── NC     (NO open)
Relay ON:   COM ─── NO     (NC open)
```

| Terminal | Use |
|----------|-----|
| **COM + NO** (ch1) | Parallel across Forward switch |
| **NC** | Leave empty |
| **ch2** | Unused (was reverse — not needed) |

- **Pulse only** ~200–500 ms; do not hold closed.
- Confirm NO vs NC with meter before final screw-down.
- Relay contacts (e.g. SRD-05VDC-SL-C) are fine for ~25.5 V AC on the remote line.

### 6-pin reference (what Forward is doing)

| Pins | Function |
|------|----------|
| **2 + 3** | Slide **forward** (what we pulse) |
| **1 + 3** | Slide **reverse** — unused |
| **3** | Common (~**25.5 V AC**) |
| **4 + 5 + 6** | Focus — do not wire |

Manuals: [cfargo.com PDF](https://cfargo.com/pdf/kodak/user/7C5442.pdf) · [Quick Reference](https://manualmachine.com/kodak/ektalite/14819818-quick-reference-guide/)

### Lamp / light source — separate from 6-pin carousel

The **6-pin socket (Plan A forward/reverse) does not control the lamp.** Documented lamp paths:

| Path | Model | Voltage | Automatable? |
|------|-------|---------|--------------|
| **Front power switch** | 500 / 1000 / 1500 / 2000 | Mains-side (LO / HI / lamp) | Hard — physical switch; **NO LIGHT** = fan without lamp |
| **6-pin remote** | all | ~25.5 V AC | **No lamp** — forward / reverse / focus only |
| **873 5086 IR remote** | 500 / 1500 / 2000 | IR | **No lamp** — forward / reverse / focus only |
| **861 8936 cable remote** | all | 6-pin | Marketplace listings claim **standby** (lamp + fan off) — **verify on unit**; not in 6-pin pinout table |
| **12-pin dissolve socket** | **2000 only** | ~25.5 V (isolated) | **Yes (documented)** — external lamp “dissolve” via **a3 + a4** |
| **Internal board / lamp switch** | all | **High voltage (halogen)** | Theoretically yes; **not documented** — open projector, find lamp relay/TRIAC; electrician strongly advised |

#### 12-pin external lamp (Model 2000 only)

If your unit is an **Ektalite 2000** with a **12-pin “dissolve” socket** and **INT/EXT** switch:

1. Set **INT/EXT → EXT** (on projector body).  
2. **a3 & a4** = external lamp control (“dissolve”) — manual: connect **a3 to a1** to turn lamp on; **a4** is live only in EXT mode.  
3. Kodak intended a **dissolve controller** here (fade between two projectors), not a simple desk relay — but this is the **only documented low-voltage lamp access** besides the front switch.

See [user manual ch. 7](https://cfargo.com/pdf/kodak/user/7C5442.pdf) — “Twelve-Pin Receptacle Specifications (Model 2000)”.

**Warning:** Do not plug a TRIAC dissolve adapter directly onto the 12-pin socket without the 6-inch extension adapter (heat build-up — Kodak quick reference).

#### Front power switch (all models)

Models **1000 / 1500 / 2000:** switch positions include **NO LIGHT** (fan, no projection lamp), **LO**, **HI**, **OFF**.  
This is the normal operator lamp control. Automating it means **mains-rated** switching or **servo/motor on the physical switch** — not the 2-ch USB relay on 25.5 V pins.

#### Internal access (last resort)

Opening the projector you may find:

- Lamp **module** socket (halogen bulb in removable module)  
- **Thermal fuses**, fan, tray motor, lamp switching electronics  
- No published “lamp enable” test points — would require tracing from front switch or lamp module connector  

**Risk:** mains voltage, heat, alignment. Only with power off, qualified person, and venue OK. Prefer **12-pin (2000)** or **manual LO/HI for show hours** over board hacking.

#### On-site checklist (lamp)

- [ ] Read model label (**500 / 1000 / 1500 / 2000**)  
- [ ] Photo front power switch (NO LIGHT / LO / HI / OFF?)  
- [ ] Photo back: **6-pin** only, or **6-pin + 12-pin**?  
- [ ] If 2000: locate **INT/EXT** switch  
- [ ] If cable remote available: meter whether **standby** closes pins beyond forward/reverse  
- [x] Lamp policy: **exhibition hours** (staff), **not** channel open/close — Model 500  

### Bench / install checklist (Plan A)

- [ ] Wired remote plugged into projector 6-pin  
- [ ] Open remote; meter Forward switch (two pads while button held)  
- [ ] USB relay on Mac; wire **ch1 COM+NO** across those pads  
- [ ] Pulse test: one slide step per command  
- [ ] Set `KODAK_FORWARD` env (below)  
- [ ] IR kit stays in kit bag as backup  

**Rough work:** ~**1–2 hours** (open remote, solder/screw, pulse tune).

---

## Fallback (only if wired remote path fails)

| Fallback | Notes |
|----------|--------|
| **IR receiver board** — tap pads for DIN 2+3 | Same electrical short; more fiddly |
| **USB IR blaster** → 873 5086 receiver | Aim / codes; last resort |

---

## Software

`server/hardware.js` still has ON/OFF stubs — replace with **forward pulse only**.

**Bench pulse (no Homebrew):** Node script — Mac Mini on **Sierra / Node 16** is OK if you use pinned `node-hid@2.1.2` (already in `package.json`). Do **not** upgrade to Node 18 on Sierra (unsupported).

```bash
xcode-select --install          # if native build needed
cd /path/to/izbrisani
npm install                     # EBADENGINE noise for some deps is OK if install finishes
npm run kodak:pulse
npm run kodak:loop              # repeat until Ctrl+C
```

Later for show server:

```bash
export KODAK_FORWARD='npm run kodak:pulse'
# or: node /path/to/izbrisani/scripts/kodak-pulse.js
```

Do **not** rely on Homebrew `usbrelay` on old Mac Minis.

---

## Slide movement algorithm — **NOT SPECIFIED**

How the Kodak carousel should respond to **desk mic / button clicks** (and channel open/close) is **not defined yet**. `server/hardware.js` cannot be finalized until this is agreed with the artists / show logic.

### Open questions

| Question | Status |
|----------|--------|
| On **channel open**: one Forward pulse? | TBD |
| **One pulse** per open vs continuous while live? | TBD |
| On **channel close** / idle: another Forward, or nothing? | TBD |
| Desk **1–4** different pulse counts? | TBD |
| Relationship to **ESP32 séance** timing? | TBD |
| **Direction** | **Locked: Forward only** | Done |
| **Kodak lamp** | **Locked:** exhibition hours (staff) | Done |

### What exists in software today

- Desk button → `POST /api/channel/N/open` (ignored while any channel live)  
- `hardware.js` → Kodak forward on **desk 4 session end** only; séance on channel open  
- **No** Forward pulse logic yet  

### When specified, implement in

- `server/hardware.js` — `KODAK_FORWARD` pulse on the agreed events  
- Drop reverse / ON-OFF lamp stubs for carousel  

**Revisit after:** bench pulse test + artist/show meeting.

---

## Safety

- **Do not** switch **230 V mains** through the desk Pi or unqualified wiring.  
- **6-pin pin 3** ~**25.5 V AC** — meter verify, pulse only.  
- **Mac only** — no Kodak wiring to Raspberry Pis.

---

## Related

- `server/hardware.js` — hooks (to extend)  
- `deploy/checkpoint_seance.md` — ESP32 lights  
- `INVENTORY.md` § E  
- `deploy/PHYSICAL.md` § 3  
