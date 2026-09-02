# Show day — one-button / survivable boot

Goal: museum staff power everything on; show runs without SSH or Terminal babysitting.

## Behaviour (locked)

| Action | Result |
|--------|--------|
| Desk **N** Talk | Channel **N** opens (exclusive; others get busy) |
| **All 4 screens** | Show channel **N** subtitles together |
| Audio | Mac Mini → **SuperCollider** (8ch) → amps/speakers; Node sends OSC on channel open |
| Session end | SC sends OSC **done**, or VTT timer fallback; same-desk Talk / control Esc |

## Boot stack

```text
Power on
  ├── Mac Mini → SuperCollider (8ch ambient loop) → then launchd → npm start (:3847)
  ├── desk-1…4 → autologin desktop → systemd desk-client → pyclient
  └── Staff (optional): open control TUI / Shelly / Kodak front switch
```

### Mac Mini (once)

1. Repo at a fixed path (e.g. `/Users/moderna/izbrisani`).
2. **SuperCollider** running with Tisa’s patch (8ch interface; ambient loop before show). See [`checkpoint_audio.md`](./checkpoint_audio.md).
3. Copy [`mac/com.izbrisani.show.plist.example`](./mac/com.izbrisani.show.plist.example) → `~/Library/LaunchAgents/com.izbrisani.show.plist`.
4. Edit `node` path + WorkingDirectory to match this Mini; set `AUDIO_BACKEND=osc` in plist env if needed.
5. `launchctl load ~/Library/LaunchAgents/com.izbrisani.show.plist`
6. Reboot Mini once; confirm `curl -s http://127.0.0.1:3847/api/health` → ok.
7. Prefer **fixed IP** (or router DHCP reservation) on the show Wi‑Fi so desk `SHOW_URL` never drifts.

Staff “button” for the Mini is just: **leave it on** (or one wall switch on a PDU that powers Mini + switch + Pis).

### Each desk Pi (once)

1. Autologin to desktop (Pi OS default for kiosk).
2. `desk-client.service` enabled (`DESK_ID`, `SHOW_URL=http://MAC_FIXED_IP:3847`).
3. Chromium kiosk **disabled** if using pyclient.
4. Reboot test: panel shows idle without keyboard.

Staff “button” for desks: **PDU / wall power** — they come up alone.

### Daily open (staff card — short)

1. Power PDU (**router first**, then Mini + desk Pis + panels + ESP32 + Shelly).
2. Wait ~2 min; confirm Mini health: `curl http://MAC_IP:3847/api/health`
3. Kodak: front switch **ON**; Shelly on.
4. Optional: laptop `ssh mini` → `npm run control` for force keys / Esc.
5. Spot-check: press desk-1 Talk → **all four** screens show desk-1 text; **speakers** play from Mac.

### Daily close

1. Esc / idle (or wait for auto-close).
2. Kodak **NO LIGHT** / Shelly off.
3. Power down PDU (or leave Mini always-on).

## Survivability checklist

- [ ] Mini fixed IP documented on the staff card
- [ ] SuperCollider + 8ch interface up before `npm start` (`checkpoint_audio.md`)
- [ ] launchd KeepAlive; log at `/tmp/izbrisani-show.log`
- [ ] Each Pi: `systemctl is-enabled desk-client`
- [ ] Each Pi: `SHOW_URL` points at Mini fixed IP
- [ ] Router + show Wi‑Fi configured (`NETWORK.md`); SSID/password on staff card
- [ ] ESP32 + Shelly on same SSID as Mini
- [ ] Spare SD

## Not required for “one button”

- Staff does **not** run `npm start` by hand if launchd is loaded.
- Staff does **not** SSH to Pis if systemd + autologin work.
- Control TUI is **ops only** (override / Esc), not required every morning.

## Related

- [`NETWORK.md`](./NETWORK.md) — dedicated router
