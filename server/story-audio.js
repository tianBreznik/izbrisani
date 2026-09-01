const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/** @type {{ repoRoot: string, getChannels: () => any[], requestClose: () => void } | null} */
let config = null;

let playbackGen = 0;
/** @type {import('child_process').ChildProcess | null} */
let child = null;
/** @type {NodeJS.Timeout | null} */
let endTimer = null;

const status = {
  configured: false,
  phase: "idle",
  desk: null,
  lastError: null,
  source: "mac",
};

function disabled() {
  const raw = (process.env.STORY_AUDIO || "1").toLowerCase();
  return raw === "0" || raw === "false" || raw === "off";
}

function configure(cfg) {
  config = cfg;
  status.configured = !disabled();
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

function clearPlayback() {
  playbackGen += 1;
  if (child) {
    child.removeAllListeners();
    child.kill("SIGTERM");
    child = null;
  }
  if (endTimer) {
    clearTimeout(endTimer);
    endTimer = null;
  }
}

function finishSession(reason) {
  if (!config) return;
  console.log(`[story-audio] session end (${reason})`);
  clearPlayback();
  setPhase("idle", null);
  config.requestClose();
}

function scheduleEndAfter(seconds, sessionGen, reason) {
  if (seconds <= 0) return;
  endTimer = setTimeout(() => {
    if (sessionGen !== playbackGen) return;
    finishSession(reason);
  }, Math.ceil(seconds * 1000));
}

function playerCommand() {
  if (process.env.STORY_AUDIO_CMD) {
    return { cmd: process.env.STORY_AUDIO_CMD, shell: true };
  }
  if (process.platform === "darwin") {
    return { cmd: "afplay", args: [], shell: false };
  }
  if (process.env.STORY_AUDIO_PLAYER) {
    const cmd = process.env.STORY_AUDIO_PLAYER;
    return { cmd, args: [], shell: false };
  }
  return { cmd: "ffplay", args: ["-nodisp", "-autoexit"], shell: false };
}

function playFile(filePath, sessionGen) {
  const spec = playerCommand();
  const args = spec.shell
    ? []
    : [...(spec.args || []), filePath];

  try {
    child = spec.shell
      ? spawn(spec.cmd.replace("%FILE%", JSON.stringify(filePath)), {
          shell: true,
          stdio: "ignore",
        })
      : spawn(spec.cmd, args, { stdio: "ignore" });
  } catch (err) {
    status.lastError = String(err.message || err);
    console.error("[story-audio] spawn failed:", err.message || err);
    scheduleEndAfter(vttFallbackSeconds(null), sessionGen, "player-missing");
    return;
  }

  child.on("error", (err) => {
    if (sessionGen !== playbackGen) return;
    status.lastError = String(err.message || err);
    console.error("[story-audio] player error:", err.message || err);
    child = null;
    scheduleEndAfter(vttFallbackSeconds(null), sessionGen, "player-error");
  });

  child.on("exit", (code, signal) => {
    if (sessionGen !== playbackGen) return;
    child = null;
    if (signal === "SIGTERM") return;
    if (code && code !== 0) {
      status.lastError = `exit ${code}`;
      console.error(`[story-audio] player exit ${code}`);
    } else {
      status.lastError = null;
    }
    finishSession("audio-ended");
  });
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

function startChannel(channelId) {
  if (!config) return;

  clearPlayback();
  status.lastError = null;
  const sessionGen = playbackGen;

  const ch = config.getChannels().find((c) => c.id === channelId);
  if (!ch) {
    status.lastError = `unknown channel ${channelId}`;
    return;
  }

  setPhase("playing", channelId);

  if (disabled()) {
    console.log("[story-audio] disabled (STORY_AUDIO=0)");
    scheduleEndAfter(vttFallbackSeconds(ch), sessionGen, "vtt-timer");
    return;
  }

  const audioPath = resolveContentPath(ch.audio);
  if (audioPath) {
    console.log(`[story-audio] play desk ${channelId}: ${audioPath}`);
    playFile(audioPath, sessionGen);
    return;
  }

  const endAt = vttFallbackSeconds(ch);
  if (endAt > 0) {
    console.log(`[story-audio] no audio — VTT timer ${endAt.toFixed(1)}s desk ${channelId}`);
    scheduleEndAfter(endAt, sessionGen, "vtt-timer");
  } else {
    console.log(`[story-audio] no audio or subtitles for desk ${channelId}`);
  }
}

function onShowStateChange(prev, next) {
  if (next?.status === "channel_open") {
    if (prev?.status === "channel_open" && prev.channelId === next.channelId) {
      return;
    }
    startChannel(next.channelId);
    return;
  }

  if (prev?.status === "channel_open") {
    clearPlayback();
    setPhase("idle", null);
  }
}

function stopForClose() {
  clearPlayback();
  setPhase("idle", null);
}

module.exports = {
  configure,
  getStatus,
  onShowStateChange,
  stopForClose,
};
