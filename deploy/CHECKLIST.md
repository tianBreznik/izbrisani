# Install checklist

## A. Before site

- [ ] Mac Mini: repo cloned, `npm install`, `npm start` works
- [ ] `npm run control` — keys 1–4 / Esc (TTY / SSH `-t`)
- [ ] `MOCK=1` desk agent tested against local server
- [ ] 4× Pi imaged (or 1 test Pi first)
- [ ] 4× 7″ panels + HDMI + power
- [ ] Switch + labeled Ethernet
- [ ] USB relay for Kodak Plan A (not on projector until step F)
- [ ] Mic/button continuity per desk; short GPIO leads labeled

## B. Network

- [ ] **Zero-switch wireless** (`NETWORK.md`): desk-4 AP up; SSID known
- [ ] Mac + desk-1…3 + Shelly + **ESP32** on that SSID
- [ ] Mac IP: `_______________` (e.g. 192.168.50.10)
- [ ] Desk browser/pyclient: `http://MAC_IP:3847/api/health` → ok
- [ ] ESP32 ping / séance URL reachable from Mac

## C. Mac hub

- [ ] `npm start` (SSH or launchd — no display needed)
- [ ] `npm run control` in second session
- [ ] Keys 1–4 force-open; Esc → idle; desk kiosk follows

## D. Desk display (×4)

**Pyclient (recommended):** see [`desk-pi/pyclient/CHECKLIST.md`](./desk-pi/pyclient/CHECKLIST.md)

- [ ] Hostname `desk-N`; pyclient or Chromium → `/desk/N`
- [ ] Control opens channel N → **all four desks** show channel N subtitles
- [ ] Quick retest: control + mic toggle; survives reboot (systemd)

**Legacy Chromium kiosk:** [`desk-pi/setup-kiosk.sh`](./desk-pi/setup-kiosk.sh) — Pi 4 only if not on pyclient yet

## E. Desk GPIO

With **pyclient:** button is built in — skip separate agent if pyclient is enabled.

With **Chromium only:** separate agent required:

- [ ] `desk_agent` running (`DESK_ID` + `SHOW_URL`)
- [ ] Press desk button → that channel opens
- [ ] Press again → closes
- [ ] Other desk while busy → ignored
- [ ] Idle LED glow works (if wired)

## F. Kodak + séance (last)

- [ ] **Plan A:** 2-ch USB relay wired COM+NO → 6-pin plug pins 1–3 (`checkpoint_kodak.md`)
- [ ] 6-pin plug sourced; IR receiver unplugged for show (or twin socket)
- [ ] Pulse test forward/reverse; `KODAK_FORWARD` / `REVERSE` env on Mac
- [ ] **Plan B only if A blocked:** USB IR blaster + learned codes
- [ ] Lamp: manual mains or document standby path separately
- [ ] ESP32 séance: `ESP32_URL` (`checkpoint_seance.md`)
- [ ] **Slide movement algorithm** defined (desk click → forward/reverse) — `checkpoint_kodak.md`

## G. Soak

- [ ] 2+ hours
- [ ] No sleep / blanking
- [ ] Spares on site

## Sign-off

Date: ________  Who: ________
