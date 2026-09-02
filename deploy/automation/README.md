# Show automation (opt-in, isolated)

**Nothing in this folder runs until you explicitly install it.** Your current lab workflow is unchanged:

- Mac: `npm start` in a terminal (manual)
- Pi: `python3 desk_client.py` in foreground (manual)
- Browser bench: `/desk/N?talk=1`

This path is for **tomorrow's isolated test** and eventual show-day boot — install when ready, uninstall to revert.

---

## What is `desk-client.service`?

A **systemd unit file** for Linux (Raspberry Pi). It tells the Pi OS to:

1. Start `desk_client.py` automatically after boot + desktop login
2. Restart it if it crashes (`Restart=always`)
3. Set env vars (`DESK_ID`, `SHOW_URL`, GPIO pins)

The copy in `deploy/desk-pi/pyclient/desk-client.service` is an **example** with desk-2 and an old lab IP — it is **not installed** on your Pis unless someone ran `systemctl enable` manually.

**This automation folder** provides a cleaner, per-desk template under `pi/` — still opt-in via `pi/install.sh`.

---

## Folder layout

```text
deploy/automation/
  README.md              ← you are here
  STAFF_CARD.md          ← one-page operator instructions (after install)
  mac/
    show.env.example     ← copy → show.env.local, edit IPs
    start-show-server.sh ← test Node server WITHOUT launchd
    start-supercollider.sh ← optional SC wrapper (manual / launchd)
    com.izbrisani.show.plist.example
    com.izbrisani.supercollider.plist.example
    install.sh / uninstall.sh / status.sh
  pi/
    desk-client@.service.example   ← systemd template (desk 1–4)
    desk.env.example               ← copy per desk → desk-N.env.local
    install.sh / uninstall.sh / status.sh
```

---

## Tomorrow: test in isolation (no install)

### Mac — show server only

Does **not** touch launchd. Stop your usual `npm start` first if it's running on :3847.

```bash
cd /path/to/izbrisani/deploy/automation/mac
cp show.env.example show.env.local
# edit show.env.local — IZBRISANI_ROOT, optional SHELLY_URL / ESP32_URL

./start-show-server.sh
# Ctrl+C to stop — back to normal
```

SuperCollider: start Tisa's patch manually as you do today, **before** opening a channel.

### Pi — pyclient only

Does **not** touch systemd.

```bash
cd ~/izbrisani-pyclient
DESK_ID=1 SHOW_URL=http://MAC_IP:3847 GPIOZERO_PIN_FACTORY=lgpio \
  DISPLAY=:0 SDL_VIDEODRIVER=x11 python3 desk_client.py
```

Or browser on Mac: `http://MAC_IP:3847/desk/1?talk=1` … `/desk/4?talk=1`

### Verify

```bash
curl http://MAC_IP:3847/api/health
# Talk on one desk → all four subtitles + SC audio
```

---

## When ready: install boot automation

### Mac

```bash
cd deploy/automation/mac
cp show.env.example show.env.local   # edit once
./install.sh
./status.sh
```

Installs **only**:

- `~/Library/LaunchAgents/com.izbrisani.show.plist`
- optionally `com.izbrisani.supercollider.plist` if `INSTALL_SC=1 ./install.sh`

**Uninstall / revert to manual:**

```bash
./uninstall.sh
# npm start in terminal works exactly as before
```

### Each desk Pi

```bash
# on desk-N Pi, copy automation/pi/ folder or scp from Mac
sudo ./install.sh 4   # argument = desk number 1–4
./status.sh
```

Installs **only**:

- `/etc/systemd/system/desk-client@.service`
- `/etc/izbrisani/desk-N.env`

**Uninstall:**

```bash
sudo ./uninstall.sh 4
# foreground python3 works exactly as before
```

---

## What staff do after install

See [`STAFF_CARD.md`](./STAFF_CARD.md) — essentially: power PDU → wait 2 min → Kodak front ON → one Talk test.

---

## Related

- [`../SHOW_DAY.md`](../SHOW_DAY.md) — behaviour reference
- [`../desk-pi/pyclient/CHECKLIST.md`](../desk-pi/pyclient/CHECKLIST.md) — pyclient setup
- [`../mac/com.izbrisani.show.plist.example`](../mac/com.izbrisani.show.plist.example) — older single-file example (superseded by this folder)
