#!/bin/bash
# On each desk Pi: sudo bash setup-kiosk.sh <1-4> <mac_ip>

set -euo pipefail

DESK_NUM="${1:-}"
MAC_IP="${2:-}"

if [[ -z "$DESK_NUM" || -z "$MAC_IP" ]]; then
  echo "Usage: sudo bash setup-kiosk.sh <desk_number 1-4> <mac_ip>"
  exit 1
fi

if [[ "$DESK_NUM" -lt 1 || "$DESK_NUM" -gt 4 ]]; then
  echo "desk_number must be 1–4"
  exit 1
fi

HOSTNAME="desk-${DESK_NUM}"
KIOSK_URL="http://${MAC_IP}:3847/desk/${DESK_NUM}"
USER_NAME="${SUDO_USER:-pi}"
USER_HOME="$(getent passwd "$USER_NAME" | cut -d: -f6)"

echo "==> Hostname → ${HOSTNAME}"
hostnamectl set-hostname "$HOSTNAME"
if grep -q "10.10.0.1" /etc/hosts 2>/dev/null; then
  true
fi
sed -i "s/10.10.0.1.*/10.10.0.1\t${HOSTNAME}/" /etc/hosts || \
  echo -e "10.10.0.1\t${HOSTNAME}" >> /etc/hosts

echo "==> Packages"
apt-get update
apt-get install -y chromium-browser unclutter || apt-get install -y chromium unclutter

CHROMIUM="$(command -v chromium-browser || command -v chromium)"
echo "==> Chromium at ${CHROMIUM}"

AUTOSTART_DIR="${USER_HOME}/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

cat > "${AUTOSTART_DIR}/desk-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=anatomija pregona desk kiosk
Exec=${CHROMIUM} --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000 --app=${KIOSK_URL}
X-GNOME-Autostart-enabled=true
EOF

cat > "${AUTOSTART_DIR}/unclutter.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Hide cursor
Exec=unclutter -idle 0.5 -root
X-GNOME-Autostart-enabled=true
EOF

cat > "${AUTOSTART_DIR}/no-blank.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=No screen blank
Exec=sh -c "xset s off; xset -dpms; xset s noblank"
X-GNOME-Autostart-enabled=true
EOF

chown -R "${USER_NAME}:${USER_NAME}" "${USER_HOME}/.config"

echo ""
echo "Done."
echo "  Host:    ${HOSTNAME}"
echo "  Kiosk:   ${KIOSK_URL}"
echo "  Reboot:  sudo reboot"
echo "  Test:    open ${KIOSK_URL} then press channel ${DESK_NUM} on Mac control panel"
echo ""
