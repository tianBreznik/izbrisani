# Desk Pi — load the show UI

You do **not** copy the whole git repo onto each Pi.  
Each Pi is a **kiosk browser** that opens the Mac Mini’s web UI.

## What goes on the Pi

| On Pi | On Mac Mini |
|-------|-------------|
| Raspberry Pi OS | This git repo + `npm start` |
| Chromium kiosk → `/desk/N` | Serves all desks + shadows + API |
| Hostname `desk-N` | Fixed IP / known hostname |

## First Pi (test) — manual path

1. Flash **Raspberry Pi OS (Desktop)** with Raspberry Pi Imager.  
   Enable SSH + set user password in Imager advanced options.
2. Boot, connect **Ethernet** to show switch, connect **7″ HDMI** (+ USB power for panel if required).
3. On the Pi:

```bash
# copy this folder or curl the script from the Mac, then:
sudo bash setup-kiosk.sh 1 192.168.50.10
sudo reboot
```

Use the Mac’s real LAN IP instead of `192.168.50.10`.

4. After reboot Chromium should open `http://MAC_IP:3847/desk/1`.  
5. On Mac control panel press `1` — timed subtitles appear (film style).

Repeat with `2`, `3`, `4` on the other Pis.

**Audio:** kiosk Chromium needs `--autoplay-policy=no-user-gesture-required` (included in `setup-kiosk.sh` when present) so desk audio starts when the channel opens from the GPIO button.

## Copy script from Mac to Pi

From Mac (same LAN):

```bash
scp deploy/desk-pi/setup-kiosk.sh user@desk-1-temp-ip:~/
ssh user@desk-1-temp-ip 'sudo bash ~/setup-kiosk.sh 1 MAC_IP'
```

## Image cloning (after one golden Pi)

1. Fully configure desk-1 (kiosk + blanking + cooling).  
2. Use Raspberry Pi Imager or `dd` / SD Card Copier.  
3. On each clone, change only:
   - hostname `desk-N`
   - kiosk URL `/desk/N` (re-run setup script or edit `~/.config/autostart/desk-kiosk.desktop`)

## Audio (later)

When directional speakers arrive: set default ALSA/Pulse device, then add a small desk agent or browser autoplay policy — not required for first physical bring-up of video/text sync.
