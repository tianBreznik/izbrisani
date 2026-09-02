# Pyclient checklist (Pi 3B+ and Pi 4)

One process per desk: pygame display + GPIO button. Replaces Chromium kiosk + `desk_agent.py`.

**Target:** all four desks on pyclient once desk-2 is signed off (lighter, one stack, GPIO built in).

---

## A. Mac Mini (before touching the Pi)

- [ ] `cd ~/izbrisani && npm start` running
- [ ] `curl -s http://127.0.0.1:3847/api/health` → `{"ok":true}`
- [ ] Mac LAN IP noted: `_______________`
- [ ] Second terminal: `npm run control`

---

## B. Pi install (each desk)

Desk: **___**  Board: **3B+ / Pi 4**  User: **___**  Pi IP: **___**

- [ ] `sudo apt install -y python3-pygame python3-gpiozero python3-lgpio python3-websocket`
- [ ] `~/izbrisani-pyclient/desk_client.py` present (scp or curl from Mac)
- [ ] Chromium kiosk off: `desk-kiosk.desktop` → `.off`
- [ ] Old agent off: `sudo systemctl disable --now desk-agent` (if it was enabled)
- [ ] Pi reaches Mac: `curl -s http://MAC_IP:3847/api/health` → ok
- [ ] Foreground pyclient starts (desktop Terminal or `DISPLAY=:0 SDL_VIDEODRIVER=x11 …`)

---

## C. Quick retest (before systemd)

Mac: `npm run control` running. Pi: pyclient in foreground (or already on systemd).

- [ ] Press **N** on control → **all desks** show channel N subtitles (not only desk N)
- [ ] **Esc** → idle, subtitles stop (mic presses while live are ignored)
- [ ] Press another channel while busy → `409` (desk mic) or force-switch (control ops only)
- [ ] **Mic Talk** (if wired) → opens this desk’s channel
- [ ] **Mic Talk** again while live → ignored (`409`); idle only when story ends or Esc
- [ ] Subtitle position/readability OK on Waveshare (55%, white on black)
- [ ] No Chromium window competing for the display

---

## D. Survive reboot (systemd)

Edit `desk-client.service`: `DESK_ID`, `SHOW_URL`, `User=`, paths, `DISPLAY=:0`.

- [ ] `sudo cp desk-client.service /etc/systemd/system/`
- [ ] `sudo systemctl daemon-reload`
- [ ] `sudo systemctl enable --now desk-client`
- [ ] `sudo systemctl status desk-client` → active
- [ ] **Reboot test:** `sudo reboot` → pyclient fullscreen without manual Terminal
- [ ] After reboot: control **N** → subtitles still work
- [ ] After reboot: mic button still works (if wired)
- [ ] `sudo journalctl -u desk-client -n 30` — no repeat crash loop

Pi must **autologin** to desktop (pyclient needs `DISPLAY=:0` in the service).

---

## E. Pi 4 migration (after desk-2 signed off)

Same steps as B–D. Pi 4 can keep Chromium until you’re ready; pyclient is optional but recommended for one fleet-wide stack.

| Why switch Pi 4 to pyclient | |
|-----------------------------|---|
| Faster boot, less RAM | No full browser |
| One deploy path | Same script + systemd on all desks |
| GPIO in same process | No separate `desk-agent` |
| Proven on 3B+ | If it runs there, Pi 4 is easy |

- [ ] desk-1 (Pi 4): pyclient installed + retest (section C)
- [ ] desk-1: systemd + reboot test (section D)
- [ ] desk-3 / desk-4 (3B+): repeat B–D when hardware ready
- [ ] All desks: Chromium autostart remains disabled
- [ ] Document final `DESK_ID` + Pi IP per desk below

---

## Desk roster (fill in)

| Desk | Hostname | Board | Pi IP | DESK_ID | Client | Done |
|------|----------|-------|-------|---------|--------|------|
| 1 | desk-1 | Pi 4 | | 1 | pyclient / chromium | |
| 2 | desk-2 | Pi 3B+ | | 2 | pyclient ✓ | |
| 3 | desk-3 | Pi 3B+ | | 3 | pyclient | |
| 4 | desk-4 | Pi 4 | | 4 | pyclient / chromium | |

---

## Sign-off

Date: ________  Desk: ________  Who: ________
