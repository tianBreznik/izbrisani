/**
 * Mac Mini hub hardware side-effects.
 *
 * Kodak: set env commands that flip your USB relay, e.g.
 *   KODAK_RELAY_ON='usbrelay R1=1'
 *   KODAK_RELAY_OFF='usbrelay R1=0'
 * or leave unset for log-only stub.
 */

const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

const RELAY_ON = process.env.KODAK_RELAY_ON || "";
const RELAY_OFF = process.env.KODAK_RELAY_OFF || "";

async function runRelay(cmd, label) {
  if (!cmd) {
    console.log(`[hardware] ${label} (stub — set KODAK_RELAY_ON/OFF)`);
    return;
  }
  try {
    await execAsync(cmd, { timeout: 3000 });
    console.log(`[hardware] ${label} ok: ${cmd}`);
  } catch (err) {
    console.error(`[hardware] ${label} failed:`, err.message || err);
  }
}

function kodakOn() {
  return runRelay(RELAY_ON, "Kodak ON");
}

function kodakOff() {
  return runRelay(RELAY_OFF, "Kodak OFF");
}

function onShowStateChange(prev, next) {
  const prevKey =
    prev?.status === "channel_open" ? `open:${prev.channelId}` : "idle";
  const nextKey =
    next?.status === "channel_open" ? `open:${next.channelId}` : "idle";

  if (prevKey === nextKey) return;

  if (next.status === "channel_open") {
    console.log(`[hardware] channel ${next.channelId} open`);
    kodakOn();
  } else {
    console.log("[hardware] idle");
    kodakOff();
  }
}

module.exports = { onShowStateChange, kodakOn, kodakOff };
