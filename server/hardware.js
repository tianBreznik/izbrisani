const { exec } = require("child_process");
const { promisify } = require("util");
const audioBackend = require("./audio-backend");

const execAsync = promisify(exec);

const RELAY_ON = process.env.KODAK_RELAY_ON || "";
const RELAY_OFF = process.env.KODAK_RELAY_OFF || "";
const ESP32_URL = (process.env.ESP32_URL || process.env.SEANCE_URL || "").replace(
  /\/$/,
  ""
);
const SETTLE_MS = Number(process.env.SEANCE_SETTLE_MS) || 3000;

let settleTimer = null;
let seanceGen = 0;
let onHardwareChange = null;

const hardwareState = {
  kodak: {
    configured: !!(RELAY_ON || RELAY_OFF),
    relay: "off",
    lastError: null,
  },
  seance: {
    configured: !!ESP32_URL,
    phase: "idle",
    light: null,
    settleMs: SETTLE_MS,
    lastError: null,
  },
  speakers: {
    configured: false,
    desk: null,
    phase: "idle",
    source: "mac",
    lastError: null,
  },
};

function setHardwareChangeListener(fn) {
  onHardwareChange = fn;
}

function emitHardwareChange() {
  if (onHardwareChange) onHardwareChange();
}

function getHardwareState() {
  return JSON.parse(JSON.stringify(hardwareState));
}

function syncSpeakers(showState) {
  const sa = audioBackend.getStatus();
  hardwareState.speakers.configured = sa.configured;
  hardwareState.speakers.source = sa.source || "mac";
  if (showState?.status === "channel_open") {
    hardwareState.speakers.desk = showState.channelId;
    hardwareState.speakers.phase = sa.phase || "playing";
  } else {
    hardwareState.speakers.desk = null;
    hardwareState.speakers.phase = "idle";
  }
  hardwareState.speakers.lastError = sa.lastError;
}

function setSeanceIdle() {
  hardwareState.seance.phase = "idle";
  hardwareState.seance.light = null;
}

async function runRelay(cmd, label, target) {
  hardwareState.kodak.relay = target;
  if (!cmd) {
    console.log(`[hardware] ${label} (stub — set KODAK_RELAY_ON/OFF)`);
    hardwareState.kodak.lastError = null;
    emitHardwareChange();
    return;
  }
  try {
    await execAsync(cmd, { timeout: 3000 });
    hardwareState.kodak.lastError = null;
    console.log(`[hardware] ${label} ok: ${cmd}`);
  } catch (err) {
    hardwareState.kodak.lastError = String(err.message || err);
    console.error(`[hardware] ${label} failed:`, err.message || err);
  }
  emitHardwareChange();
}

function kodakOn() {
  return runRelay(RELAY_ON, "Kodak ON", "on");
}

function kodakOff() {
  return runRelay(RELAY_OFF, "Kodak OFF", "off");
}

async function seanceGet(path, label) {
  if (!ESP32_URL) {
    console.log(`[hardware] ${label} (stub — set ESP32_URL)`);
    hardwareState.seance.lastError = null;
    emitHardwareChange();
    return;
  }
  const url = `${ESP32_URL}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${res.status} ${text}`);
    }
    hardwareState.seance.lastError = null;
    console.log(`[hardware] ${label} ok: ${url}`);
  } catch (err) {
    hardwareState.seance.lastError = String(err.message || err);
    console.error(`[hardware] ${label} failed:`, err.message || err);
  }
  emitHardwareChange();
}

function seanceStartHunt() {
  hardwareState.seance.phase = "hunting";
  hardwareState.seance.light = null;
  emitHardwareChange();
  return seanceGet("/start", "seance START");
}

function seanceStopLight(light) {
  if (light === "all") {
    setSeanceIdle();
  } else {
    hardwareState.seance.phase = "settled";
    hardwareState.seance.light = Number(light);
  }
  emitHardwareChange();
  return seanceGet(`/stop?light=${encodeURIComponent(String(light))}`, `seance STOP ${light}`);
}

function cancelSettle() {
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
}

function stateKey(state) {
  return state?.status === "channel_open" ? `open:${state.channelId}` : "idle";
}

function onShowStateChange(prev, next) {
  syncSpeakers(next);
  audioBackend.onShowStateChange(prev, next);

  if (stateKey(prev) === stateKey(next)) {
    emitHardwareChange();
    return;
  }

  if (next.status === "channel_open") {
    console.log(`[hardware] channel ${next.channelId} open`);
    cancelSettle();
    const gen = ++seanceGen;
    const lightIndex = next.channelId - 1;
    kodakOn();
    seanceStartHunt().finally(() => {
      settleTimer = setTimeout(() => {
        if (gen !== seanceGen) return;
        seanceStopLight(lightIndex);
      }, SETTLE_MS);
    });
  } else {
    console.log("[hardware] idle");
    audioBackend.stopForClose();
    kodakOff();
    cancelSettle();
    seanceGen += 1;
    seanceStopLight("all");
  }
}

module.exports = {
  onShowStateChange,
  getHardwareState,
  setHardwareChangeListener,
};
