#!/usr/bin/env node
/**
 * Pulse USB HID relay channel 1 (Kodak Forward).
 *
 *   npm run kodak:pulse          # one Forward
 *   npm run kodak:loop           # repeat until Ctrl+C
 *
 * Env:
 *   KODAK_RELAY_CH=1
 *   KODAK_PULSE_MS=300           hold closed (the “press”)
 *   KODAK_INTERVAL_MS=2000       pause after each press (tray needs time)
 *   KODAK_HID_VID=0x16c0
 *   KODAK_HID_PID=0x05df
 *   KODAK_LOOP=1                 set by npm run kodak:loop
 */

const HID = require("node-hid");

const VID = Number(process.env.KODAK_HID_VID || 0x16c0);
const PID = Number(process.env.KODAK_HID_PID || 0x05df);
const CH = Number(process.env.KODAK_RELAY_CH || 1);
const PULSE_MS = Number(process.env.KODAK_PULSE_MS || 300);
const INTERVAL_MS = Number(process.env.KODAK_INTERVAL_MS || 2000);
const LOOP = process.env.KODAK_LOOP === "1" || process.argv.includes("--loop");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openRelay() {
  const devices = HID.devices().filter(
    (d) => d.vendorId === VID && d.productId === PID
  );
  if (!devices.length) {
    console.error(
      `No HID relay ${VID.toString(16)}:${PID.toString(16)}. Plug it in.`
    );
    for (const d of HID.devices()) {
      console.error(
        `  ${d.vendorId?.toString(16)}:${d.productId?.toString(16)}  ${d.product || d.manufacturer || ""}`
      );
    }
    process.exit(1);
  }
  console.log(`opened ${devices[0].product || "USBRelay"} ch${CH}`);
  return new HID.HID(devices[0].path);
}

function setRelay(hid, channel, on) {
  const buf = Buffer.alloc(9);
  buf[0] = 0;
  buf[1] = on ? 0xff : 0xfd;
  buf[2] = channel;
  hid.write(buf);
}

async function pulseOnce(hid, n) {
  setRelay(hid, CH, true);
  process.stdout.write(`#${n} ON ${PULSE_MS}ms … `);
  await sleep(PULSE_MS);
  setRelay(hid, CH, false);
  console.log("OFF");
}

async function main() {
  const hid = openRelay();
  let n = 0;
  let stopping = false;

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    console.log("\nstopping — relay OFF");
    try {
      setRelay(hid, CH, false);
      hid.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    if (!LOOP) {
      await pulseOnce(hid, 1);
      return;
    }

    console.log(
      `loop: press ${PULSE_MS}ms, pause ${INTERVAL_MS}ms — Ctrl+C to stop`
    );
    while (!stopping) {
      n += 1;
      await pulseOnce(hid, n);
      if (stopping) break;
      await sleep(INTERVAL_MS);
    }
  } finally {
    try {
      setRelay(hid, CH, false);
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
