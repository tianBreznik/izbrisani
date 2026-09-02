#!/usr/bin/env node
/**
 * Bench: one Forward pulse via USB HID relay.
 *
 *   npm run kodak:pulse
 *   npm run kodak:loop
 *
 * Show server uses server/kodak-relay.js + server/kodak-carousel.js
 * (full tray loop on desk 4 session end).
 */

const { pulseForward, DEFAULT_VID, DEFAULT_PID } = require("../server/kodak-relay");

const CH = Number(process.env.KODAK_RELAY_CH || 1);
const PULSE_MS = Number(process.env.KODAK_PULSE_MS || 300);
const INTERVAL_MS = Number(process.env.KODAK_INTERVAL_MS || 2000);
const LOOP = process.env.KODAK_LOOP === "1" || process.argv.includes("--loop");
const VID = Number(process.env.KODAK_HID_VID || DEFAULT_VID);
const PID = Number(process.env.KODAK_HID_PID || DEFAULT_PID);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!LOOP) {
    await pulseForward({
      channel: CH,
      pulseMs: PULSE_MS,
      vid: VID,
      pid: PID,
    });
    console.log(`forward pulse ch${CH} ok`);
    return;
  }

  console.log(
    `loop: ch${CH} ${PULSE_MS}ms pulse, ${INTERVAL_MS}ms gap — Ctrl+C to stop`
  );
  let n = 0;
  const stopping = { value: false };
  const shutdown = () => {
    stopping.value = true;
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (!stopping.value) {
    n += 1;
    process.stdout.write(`#${n} `);
    await pulseForward({ channel: CH, pulseMs: PULSE_MS, vid: VID, pid: PID });
    console.log("ok");
    if (stopping.value) break;
    await sleep(INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
