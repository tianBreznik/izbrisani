# Desk companion (GPIO → Mac Mini)

Runs **on each desk Pi**. Reads the mic/button on **this desk**, calls the Mac show API.

```text
PTT on desk N → GPIO → desk_agent.py → POST /api/channel/N/open
Mac Mini       → state → all kiosks + shadows + Kodak USB relay
```

## Wiring (BCM)

| Signal | Default BCM | Notes |
|--------|-------------|--------|
| PTT / button | **17** | Other side to GND; internal pull-up |
| LED (optional) | **27** | PWM sine when idle; off when any channel live |

Change with `BUTTON_GPIO` / `LED_GPIO`.

## Install on a Pi

```bash
mkdir -p ~/izbrisani-agent
# copy desk_agent.py + requirements.txt from Mac:
#   scp deploy/desk-pi/agent/* user@desk-1:~/izbrisani-agent/

cd ~/izbrisani-agent
pip3 install --user -r requirements.txt

export DESK_ID=1
export SHOW_URL=http://MAC_IP:3847
python3 desk_agent.py
```

Dev without GPIO (on Mac or Pi):

```bash
MOCK=1 DESK_ID=2 SHOW_URL=http://127.0.0.1:3847 python3 desk_agent.py
# press Enter to simulate button
```

## systemd (survives reboot / no terminal)

On the Pi, with `desk_agent.py` already in `~/izbrisani-agent`:

```bash
# 1. Edit SHOW_URL (and DESK_ID) to this venue’s Mac / laptop IP
nano ~/izbrisani-agent/desk-agent.service
#    Environment=SHOW_URL=http://MAC_IP:3847

sudo cp ~/izbrisani-agent/desk-agent.service /etc/systemd/system/
sudo apt install -y python3-gpiozero python3-lgpio python3-websocket
sudo systemctl daemon-reload
sudo systemctl enable --now desk-agent
sudo systemctl status desk-agent
sudo journalctl -u desk-agent -f   # watch Talk presses
```

When the Mac IP changes:

```bash
sudo systemctl edit --full desk-agent   # fix SHOW_URL
sudo systemctl restart desk-agent
```

## Behaviour

| Situation | Result |
|-----------|--------|
| Idle, press | Open this desk’s channel |
| This channel live, press again | Toggle close |
| Other channel live, press | Ignored (`409 channel_busy`) |

Kodak is **not** driven from the desk — only from the Mac hub relay.
