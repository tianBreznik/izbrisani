#!/usr/bin/env node
/**
 * Pulse USB HID relay channel 1 (Kodak Forward).
 * No Homebrew / usbrelay CLI required — uses node-hid.
 *
 *   npm install          # once (builds node-hid; needs Xcode CLT)
 *   npm run kodak:pulse
 *
 * Env:
 *   KODAK_RELAY_CH=1          relay number on the board (default 1)
 *   KODAK_PULSE_MS=300        how long to hold closed
 *   KODAK_HID_VID=0x16c0      override if your board differs
 *   KODAK_HID_PID=0x05df
 */

const HID = require("node-hid");

const VID = Number(process.env.KODAK_HID_VID || 0x16c0);
const PID = Number(process.env.KODAK_HID_PID || 0x05df);
const CH = Number(process.env.KODAK_RELAY_CH || 1);
const MS = Number(process.env.KODAK_PULSE_MS || 300);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openRelay() {
  const devices = HID.devices().filter(
    (d) => d.vendorId === VID && d.productId === PID
  );
  if (!devices.length) {
    console.error(
      `No HID relay ${VID.toString(16)}:${PID.toString(16)}. Plug it in, then:`
    );
    console.error("  system_profiler SPUSBDataType | head -80");
    console.error("All HID devices:");
    for (const d of HID.devices()) {
      console.error(
        `  ${d.vendorId?.toString(16)}:${d.productId?.toString(16)}  ${d.product || d.manufacturer || ""}`
      );
    }
    process.exit(1);
  }
  const path = devices[0].path;
  console.log(`opened ${devices[0].product || "USBRelay"} ch${CH}`);
  return new HID.HID(path);
}

/** Common DCT-tech / SONGLE HID protocol */
function setRelay(hid, channel, on) {
  const buf = Buffer.alloc(9);
  buf[0] = 0;
  buf[1] = on ? 0xff : 0xfd;
  buf[2] = channel;
  hid.write(buf);
}

async function main() {
  const hid = openRelay();
  try {
    setRelay(hid, CH, true);
    console.log(`ON  ${MS}ms`);
    await sleep(MS);
    setRelay(hid, CH, false);
    console.log("OFF");
  } finally {
    try {
      hid.close();
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
