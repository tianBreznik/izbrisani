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

- [ ] Switch on; Mac IP: `_______________`
- [ ] desk-1…4 on LAN; ping OK
- [ ] Desk browser: `http://MAC_IP:3847/api/health` → ok

## C. Mac hub

- [ ] `npm start` (SSH or launchd — no display needed)
- [ ] `npm run control` in second session
- [ ] Keys 1–4 force-open; Esc → idle; desk kiosk follows

## D. Desk kiosk (×4)

- [ ] Hostname `desk-N`, URL `/desk/N`
- [ ] Name plate visible
- [ ] Control opens channel N → essay only on that desk
- [ ] Survives reboot into kiosk

## E. Desk GPIO agent (×4)

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
