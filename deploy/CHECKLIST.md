# Install checklist

## A. Before site

- [ ] Mac Mini: repo cloned, `npm install`, `npm start` works
- [ ] `npm run control` — keys 1–4 / Esc (TTY / SSH `-t`)
- [ ] `MOCK=1` pyclient or desk agent tested against local server
- [ ] 4× Pi imaged (or 1 test Pi first)
- [ ] 4× 7″ panels + HDMI + power
- [ ] Dedicated router for show Wi‑Fi (`NETWORK.md`)
- [ ] USB relay for Kodak Plan A (not on projector until step F)
- [ ] Mic/button continuity per desk; GPIO pull-ups on soldered Talk lines

## B. Network

- [ ] **Dedicated router** (`NETWORK.md`): SSID known; DHCP reservations for Mac, Shelly, ESP32
- [ ] Mac + desk-1…4 + Shelly + **ESP32** on show Wi‑Fi
- [ ] Mac IP: `_______________` (e.g. 192.168.50.10)
- [ ] Desk browser/pyclient: `http://MAC_IP:3847/api/health` → ok
- [ ] ESP32 ping / séance URL reachable from Mac

## C. Mac hub

- [ ] `npm start` (SSH or launchd — no display needed)
- [ ] SuperCollider + 8ch patch running before show (`checkpoint_audio.md`)
- [ ] Ambient loops copied to Mini (`loop-front.wav`, `loop-back.wav`)
- [ ] `npm run control` in second session
- [ ] Keys 1–4 force-open (ops); Esc → idle; desk buttons follow state

## D. Desk display (×4)

**Pyclient (recommended):** see [`desk-pi/pyclient/CHECKLIST.md`](./desk-pi/pyclient/CHECKLIST.md)

- [ ] Hostname `desk-N`; pyclient → subtitles on all desks when any channel live
- [ ] Control opens channel N → **all four desks** show channel N subtitles
- [ ] Talk press opens channel; **release does nothing**; repeat press while live → ignored
- [ ] Quick retest: control + mic; survives reboot (systemd)

## E. Desk GPIO (pyclient)

- [ ] `desk_client.py` + `desk-client.service` on each Pi (`DESK_ID`, `SHOW_URL`)
- [ ] Press Talk → that desk’s channel opens
- [ ] Press again while live (same or other desk) → ignored
- [ ] Session ends when story finishes or operator Esc — **not** on button release
- [ ] Idle LED glow works (if wired)

## F. Kodak + séance (last)

- [ ] **Plan A:** USB relay ch1 COM+NO across wired-remote Forward pads (`checkpoint_kodak.md`)
- [ ] Wired remote plugged into projector 6-pin
- [ ] `npm run kodak:pulse` — one forward step
- [ ] `SHELLY_URL` set; full 80-slide carousel bench test after desk 4 session-end
- [ ] ESP32 séance: `ESP32_URL` (`checkpoint_seance.md`)
- [ ] Kodak front switch ON for show; Shelly off between carousel runs

## G. Soak

- [ ] 2+ hours
- [ ] No sleep / blanking
- [ ] Spares on site

## Sign-off

Date: ________  Who: ________
