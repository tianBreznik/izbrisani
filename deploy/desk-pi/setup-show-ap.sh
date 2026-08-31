#!/usr/bin/env bash
# Configure this Pi as the show Wi-Fi access point (zero-switch wireless).
# Run ON desk-4 (Pi 4 preferred), once, with sudo.
#
# Usage:
#   sudo bash setup-show-ap.sh 'YourPasswordHere'
#   sudo bash setup-show-ap.sh 'YourPasswordHere' wlan0
#
# Creates NetworkManager connection "izbrisani-ap":
#   SSID: izbrisani-show
#   Gateway / this Pi: 192.168.50.1
#   DHCP for clients (Mac, desks, Shelly, ESP32)
#   Autoconnect on boot
#
# See deploy/NETWORK.md

set -euo pipefail

SSID="${SHOW_SSID:-izbrisani-show}"
CON_NAME="${SHOW_AP_CON:-izbrisani-ap}"
AP_ADDR="${SHOW_AP_ADDR:-192.168.50.1/24}"
PASSWORD="${1:-}"
IFACE="${2:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0 'PASSWORD'" >&2
  exit 1
fi

if [[ -z "$PASSWORD" || ${#PASSWORD} -lt 8 ]]; then
  echo "Usage: sudo bash $0 'WiFiPassword' [wlan0]" >&2
  echo "Password must be at least 8 characters." >&2
  exit 1
fi

if [[ -z "$IFACE" ]]; then
  IFACE="$(nmcli -t -f DEVICE,TYPE device status | awk -F: '$2=="wifi"{print $1; exit}')"
fi
if [[ -z "$IFACE" ]]; then
  echo "No Wi-Fi interface found. Pass ifname as 2nd arg (e.g. wlan0)." >&2
  exit 1
fi

echo "Interface: $IFACE"
echo "SSID:      $SSID"
echo "AP addr:   $AP_ADDR"
echo "Connection:$CON_NAME"

# Stop other Wi-Fi client links on this iface so AP can own it
while read -r name; do
  [[ -z "$name" || "$name" == "$CON_NAME" ]] && continue
  echo "Down: $name"
  nmcli connection down "$name" 2>/dev/null || true
done < <(nmcli -t -f NAME,DEVICE connection show --active | awk -F: -v i="$IFACE" '$2==i{print $1}')

if nmcli -t -f NAME connection show | grep -Fxq "$CON_NAME"; then
  echo "Updating existing connection $CON_NAME"
  nmcli connection delete "$CON_NAME"
fi

nmcli connection add \
  type wifi \
  ifname "$IFACE" \
  con-name "$CON_NAME" \
  autoconnect yes \
  ssid "$SSID" \
  802-11-wireless.mode ap \
  802-11-wireless.band bg \
  ipv4.method shared \
  ipv4.addresses "$AP_ADDR" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "$PASSWORD"

# Prefer this connection; do not try to join other SSIDs on boot
nmcli connection modify "$CON_NAME" connection.autoconnect-priority 100

nmcli connection up "$CON_NAME"

echo
echo "AP is up."
nmcli -f GENERAL.STATE,IP4.ADDRESS device show "$IFACE" | sed 's/^/  /'
echo
echo "Next:"
echo "  1. Join Mac / desk-1..3 / Shelly / ESP32 to SSID: $SSID"
echo "  2. Prefer Mac at 192.168.50.10 (DHCP reservation or static)"
echo "  3. On each desk: SHOW_URL=http://192.168.50.10:3847"
echo "  4. Reboot this Pi and confirm AP returns: sudo reboot"
echo
echo "Password is stored in NetworkManager (not printed again)."
