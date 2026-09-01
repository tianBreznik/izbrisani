const fs = require("fs");
const path = require("path");
const osc = require("osc");

const DEFAULT_MAP = path.join(__dirname, "..", "deploy", "sc-osc-map.json");

/** @type {{ repoRoot: string, getChannels: () => any[], requestClose: () => void } | null} */
let config = null;

let oscMap = null;
let sessionGen = 0;
/** @type {NodeJS.Timeout | null} */
let endTimer = null;
/** @type {import('osc').UDPPort | null} */
let sender = null;
/** @type {import('osc').UDPPort | null} */
let receiver = null;

const status = {
  configured: false,
  phase: "idle",
  desk: null,
  lastError: null,
  source: "supercollider",
};

function disabled() {
  const raw = (process.env.OSC_ENABLED ?? "1").toLowerCase();
  return raw === "0" || raw === "false" || raw === "off";
}

function loadMap() {
  const mapPath = process.env.OSC_MAP_PATH || DEFAULT_MAP;
  const raw = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  return {
    outbound: {
      host: process.env.OSC_HOST || raw.outbound?.host || "127.0.0.1",
      port: Number(process.env.OSC_PORT || raw.outbound?.port || 57120),
      monologueTrigger: raw.outbound?.monologueTrigger || {
        address: "/izbrisani/monologue",
        deskArgType: "i",
        deskIndexBase: 1,
        includeAudioPath: true,
      },
      monologueStop: raw.outbound?.monologueStop || {
        address: "/izbrisani/monologue/stop",
        args: [],
      },
    },
    inbound: {
      listenPort: Number(
        process.env.OSC_LISTEN_PORT || raw.inbound?.listenPort || 57121
      ),
      done: raw.inbound?.done || {
        address: "/izbrisani/monologue/done",
        matchDeskArg: false,
      },
    },
  };
}

function configure(cfg) {
  config = cfg;
  status.configured = !disabled();
  try {
    oscMap = loadMap();
    if (!disabled()) {
      startOsc();
    }
  } catch (err) {
    status.lastError = String(err.message || err);
    console.error("[sc-osc] map/load failed:", err.message || err);
  }
}

function getStatus() {
  return { ...status };
}

function setPhase(phase, desk) {
  status.phase = phase;
  status.desk = desk;
}

function parseVttTime(raw) {
  const parts = String(raw).trim().split(":");
  if (parts.length === 3) {
    return (
      Number(parts[0]) * 3600 +
      Number(parts[1]) * 60 +
      Number(parts[2].replace(",", "."))
    );
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1].replace(",", "."));
  }
  return 0;
}

function vttEndSeconds(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  let endAt = 0;
  for (const block of text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n\n")) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length || lines[0].startsWith("WEBVTT")) continue;
    let idx = lines[0].includes("-->") ? 0 : lines[1]?.includes("-->") ? 1 : -1;
    if (idx < 0) continue;
    const endRaw = lines[idx].split("-->")[1]?.trim().split(/\s+/)[0];
    if (!endRaw) continue;
    endAt = Math.max(endAt, parseVttTime(endRaw));
  }
  return endAt;
}

function resolveContentPath(webPath) {
  if (!config || !webPath) return null;
  const rel = String(webPath).replace(/^\//, "");
  const abs = path.join(config.repoRoot, rel);
  return fs.existsSync(abs) ? abs : null;
}

function clearSession() {
  sessionGen += 1;
  if (endTimer) {
    clearTimeout(endTimer);
    endTimer = null;
  }
}

function finishSession(reason) {
  if (!config) return;
  console.log(`[sc-osc] session end (${reason})`);
  clearSession();
  setPhase("idle", null);
  config.requestClose();
}

function scheduleEndAfter(seconds, gen, reason) {
  if (seconds <= 0) return;
  endTimer = setTimeout(() => {
    if (gen !== sessionGen) return;
    finishSession(reason);
  }, Math.ceil(seconds * 1000));
}

function vttFallbackSeconds(channel) {
  const ch =
    channel ||
    (config && status.desk
      ? config.getChannels().find((c) => c.id === status.desk)
      : null);
  if (!ch?.subtitles) return 0;
  const vttPath = resolveContentPath(ch.subtitles);
  if (!vttPath) return 0;
  try {
    return vttEndSeconds(vttPath);
  } catch (err) {
    status.lastError = String(err.message || err);
    return 0;
  }
}

function oscArg(value, type) {
  if (type === "i") return { type: "i", value: Number(value) };
  if (type === "f") return { type: "f", value: Number(value) };
  if (type === "s") return { type: "s", value: String(value) };
  return { type: "s", value: String(value) };
}

function sendOsc(address, args) {
  if (!sender || !oscMap) return;
  const msg = { address, args: args || [] };
  try {
    sender.send(msg);
    const argStr = (args || [])
      .map((a) => (a.type === "s" ? JSON.stringify(a.value) : a.value))
      .join(", ");
    console.log(`[sc-osc] → ${address}${argStr ? ` (${argStr})` : ""}`);
    status.lastError = null;
  } catch (err) {
    status.lastError = String(err.message || err);
    console.error("[sc-osc] send failed:", err.message || err);
  }
}

function sendMonologueTrigger(channelId, ch) {
  if (!oscMap) return;
  const spec = oscMap.outbound.monologueTrigger;
  const base = Number(spec.deskIndexBase ?? 1);
  const deskValue = base === 0 ? channelId - 1 : channelId;
  const args = [oscArg(deskValue, spec.deskArgType || "i")];
  if (spec.includeAudioPath) {
    const audioPath = resolveContentPath(ch?.audio);
    if (audioPath) {
      args.push(oscArg(audioPath, "s"));
    }
  }
  sendOsc(spec.address, args);
}

function sendMonologueStop() {
  if (!oscMap) return;
  const spec = oscMap.outbound.monologueStop;
  const args = (spec.args || []).map((a) =>
    typeof a === "object" && a.type ? a : oscArg(a, "s")
  );
  sendOsc(spec.address, args);
}

function onInboundMessage(oscMsg) {
  if (!oscMap || !config) return;
  const doneSpec = oscMap.inbound.done;
  if (oscMsg.address !== doneSpec.address) return;

  if (doneSpec.matchDeskArg && status.desk != null && oscMsg.args?.length) {
    const base = Number(oscMap.outbound.monologueTrigger.deskIndexBase ?? 1);
    const expected = base === 0 ? status.desk - 1 : status.desk;
    const got = oscMsg.args[0]?.value;
    if (Number(got) !== Number(expected)) return;
  }

  if (status.phase !== "playing") return;
  finishSession("osc-done");
}

function startOsc() {
  if (!oscMap || sender || receiver) return;

  sender = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 0,
    remoteAddress: oscMap.outbound.host,
    remotePort: oscMap.outbound.port,
  });
  sender.on("error", (err) => {
    status.lastError = String(err.message || err);
    console.error("[sc-osc] sender error:", err.message || err);
  });
  sender.open();

  receiver = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: oscMap.inbound.listenPort,
    metadata: true,
  });
  receiver.on("message", onInboundMessage);
  receiver.on("error", (err) => {
    status.lastError = String(err.message || err);
    console.error("[sc-osc] receiver error:", err.message || err);
  });
  receiver.open();

  console.log(
    `[sc-osc] UDP out ${oscMap.outbound.host}:${oscMap.outbound.port}, in :${oscMap.inbound.listenPort}`
  );
}

function startChannel(channelId) {
  if (!config) return;

  clearSession();
  status.lastError = null;
  const gen = sessionGen;

  const ch = config.getChannels().find((c) => c.id === channelId);
  if (!ch) {
    status.lastError = `unknown channel ${channelId}`;
    return;
  }

  setPhase("playing", channelId);

  if (disabled()) {
    console.log("[sc-osc] disabled (OSC_ENABLED=0)");
    scheduleEndAfter(vttFallbackSeconds(ch), gen, "vtt-timer");
    return;
  }

  sendMonologueTrigger(channelId, ch);

  const fallback = vttFallbackSeconds(ch);
  if (fallback > 0) {
    console.log(`[sc-osc] VTT fallback ${fallback.toFixed(1)}s desk ${channelId}`);
    scheduleEndAfter(fallback, gen, "vtt-timer");
  }
}

function onShowStateChange(prev, next) {
  if (next?.status === "channel_open") {
    if (prev?.status === "channel_open" && prev.channelId === next.channelId) {
      return;
    }
    if (prev?.status === "channel_open" && prev.channelId !== next.channelId) {
      sendMonologueStop();
    }
    startChannel(next.channelId);
    return;
  }

  if (prev?.status === "channel_open") {
    stopForClose();
  }
}

function stopForClose() {
  if (!disabled() && oscMap && status.phase === "playing") {
    sendMonologueStop();
  }
  clearSession();
  setPhase("idle", null);
}

function shutdown() {
  stopForClose();
  if (sender) {
    sender.close();
    sender = null;
  }
  if (receiver) {
    receiver.close();
    receiver = null;
  }
}

module.exports = {
  configure,
  getStatus,
  onShowStateChange,
  stopForClose,
  shutdown,
};
