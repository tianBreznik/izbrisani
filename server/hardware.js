const audioBackend = require("./audio-backend");
const kodakCarousel = require("./kodak-carousel");

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
    configured: false,
    phase: "idle",
    power: "off",
    slide: 0,
    slideCount: 0,
    triggerDesk: 4,
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
  kodakCarousel.setStatusChangeListener(() => {
    syncKodak();
    emitHardwareChange();
  });
}

function emitHardwareChange() {
  if (onHardwareChange) onHardwareChange();
}

function getHardwareState() {
  syncKodak();
  return JSON.parse(JSON.stringify(hardwareState));
}

function syncKodak() {
  const k = kodakCarousel.getStatus();
  hardwareState.kodak = {
    configured: k.configured,
    phase: k.phase,
    power: k.power,
    slide: k.slide,
    slideCount: k.slideCount,
    triggerDesk: k.triggerDesk,
    lastError: k.lastError,
    busy: !!k.busy,
    invertDirection: !!k.invertDirection,
    activeRelayChannel: k.activeRelayChannel,
  };
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

/** Hunt / blink all lights. */
function seanceStartHunt() {
  hardwareState.seance.phase = "hunting";
  hardwareState.seance.light = null;
  emitHardwareChange();
  return seanceGet("/start", "seance START");
}

/**
 * Room dark — after hunt settle (subtitles playing) and through Kodak carousel.
 * GET /dark
 */
function seanceDark() {
  hardwareState.seance.phase = "dark";
  hardwareState.seance.light = null;
  emitHardwareChange();
  return seanceGet("/dark", "seance DARK");
}

/**
 * Resting state when all desks idle — lights on.
 * GET /stop?light=all
 */
function seanceStopAll() {
  hardwareState.seance.phase = "idle";
  hardwareState.seance.light = null;
  emitHardwareChange();
  return seanceGet("/stop?light=all", "seance STOP all (lights on)");
}

function cancelSettle() {
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
}

function stateKey(state) {
  if (state?.status === "channel_open") return `open:${state.channelId}`;
  if (state?.status === "kodak") return "kodak";
  return "idle";
}

function onShowStateChange(prev, next, meta = {}) {
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
    seanceStartHunt().finally(() => {
      settleTimer = setTimeout(() => {
        if (gen !== seanceGen) return;
        seanceDark();
      }, SETTLE_MS);
    });
  } else if (next.status === "kodak") {
    console.log("[hardware] kodak carousel busy — seance dark");
    cancelSettle();
    seanceGen += 1;
    seanceDark();
  } else {
    console.log("[hardware] idle");
    audioBackend.stopForClose();
    const endedDesk =
      prev?.status === "channel_open" ? prev.channelId : null;
    const closeReason = meta.closeReason || "manual";
    cancelSettle();
    seanceGen += 1;
    if (endedDesk != null) {
      // Desk 4 session-end may nest into status "kodak" (busy listener) and
      // already call seanceDark — do not override with stop-all.
      kodakCarousel.onDeskSessionEnd(endedDesk, closeReason);
    }
    if (kodakCarousel.isBusy()) {
      seanceDark();
    } else {
      seanceStopAll();
    }
  }

  syncKodak();
  emitHardwareChange();
}

module.exports = {
  onShowStateChange,
  getHardwareState,
  setHardwareChangeListener,
};
