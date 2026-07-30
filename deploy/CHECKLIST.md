# Install checklist

## A. Before site

- [ ] Mac Mini: repo cloned, `npm install`, `npm start` works
- [ ] Control + shadow/1 + shadow/2 tested
- [ ] `MOCK=1` desk agent tested against local server
- [ ] 4× Pi imaged (or 1 test Pi first)
- [ ] 4× 7″ panels + HDMI + power
- [ ] Switch + labeled Ethernet
- [ ] USB relay for Kodak (not on mains until step F)
- [ ] Mic/button continuity per desk; short GPIO leads labeled

## B. Network

- [ ] Switch on; Mac IP: `_______________`
- [ ] desk-1…4 on LAN; ping OK
- [ ] Desk browser: `http://MAC_IP:3847/api/health` → ok

## C. Mac hub

- [ ] `npm start`
- [ ] Shadows fullscreen on correct projectors
- [ ] Keys 1 / 3 move correct shadow; Esc → black

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

## F. Kodak (last)

- [ ] `KODAK_RELAY_ON` / `OFF` configured
- [ ] Dry-run relay LED follows open/close
- [ ] Technician OK; live Kodak test
- [ ] No mains on bare GPIO

## G. Soak

- [ ] 2+ hours
- [ ] No sleep / blanking
- [ ] Spares on site

## Sign-off

Date: ________  Who: ________
