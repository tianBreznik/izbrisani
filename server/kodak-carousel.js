/**
 * Desk 4 session end → Shelly ON → N× Forward → Shelly OFF.
 *
 * Config: deploy/kodak-carousel.json (slideCount, timings, relay channel).
 * Shelly URL: json shellyUrl or env SHELLY_URL (e.g. http://192.168.50.20).
 * Disable: KODAK_ENABLED=0
 */

const fs = require("fs");
const path = require("path");
const { pulseForward } = require("./kodak-relay");

const CONFIG_PATH =
  process.env.KODAK_CONFIG_PATH ||
  path.join(__dirname, "..", "deploy", "kodak-carousel.json");

let config = null;
let running = false;
let onStatusChange = null;

const status = {
  configured: false,
  enabled: true,
  phase: "idle",
  power: "off",
  slide: 0,
  slideCount: 0,
  triggerDesk: 4,
  lastError: null,
};

function disabled() {
  const raw = (process.env.KODAK_ENABLED ?? "1").toLowerCase();
  return raw === "0" || raw === "false" || raw === "off";
}

function loadConfig() {
  if (config) return config;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    config = {
      triggerDesk: Number(raw.triggerDesk ?? 4),
      slideCount: Number(raw.slideCount ?? 36),
      relayChannel: Number(raw.relayChannel ?? 1),
      pulseMs: Number(raw.pulseMs ?? 300),
      intervalMs: Number(raw.intervalMs ?? 2000),
      warmupMs: Number(raw.warmupMs ?? 5000),
      shellyUrl: String(raw.shellyUrl || "").replace(/\/$/, ""),
      hidVid: Number(raw.hidVid ?? 0x16c0),
      hidPid: Number(raw.hidPid ?? 0x05df),
    };
  } catch (err) {
    config = {
      triggerDesk: 4,
      slideCount: 36,
      relayChannel: 1,
      pulseMs: 300,
      intervalMs: 2000,
      warmupMs: 8000,
      shellyUrl: "",
      hidVid: 0x16c0,
      hidPid: 0x05df,
    };
    status.lastError = `config: ${err.message || err}`;
  }

  const shelly =
    (process.env.SHELLY_URL || process.env.KODAK_SHELLY_URL || "")
      .replace(/\/$/, "") || config.shellyUrl;

  config.shellyUrl = shelly;
  status.triggerDesk = config.triggerDesk;
  status.slideCount = config.slideCount;
  status.configured = !!shelly;
  status.enabled = !disabled();
  return config;
}

function setStatusChangeListener(fn) {
  onStatusChange = fn;
}

function emitStatus() {
  if (onStatusChange) onStatusChange();
}

function getStatus() {
  loadConfig();
  return { ...status };
}

async function shellySet(on) {
  const cfg = loadConfig();
  if (!cfg.shellyUrl) {
    console.log(`[kodak] Shelly ${on ? "ON" : "OFF"} (stub — set SHELLY_URL)`);
    status.power = on ? "on" : "off";
    emitStatus();
    return;
  }
  const url = `${cfg.shellyUrl}/rpc/Switch.Set`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 0, on: !!on }),
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shelly ${res.status}: ${text}`);
  }
  status.power = on ? "on" : "off";
  console.log(`[kodak] Shelly ${on ? "ON" : "OFF"} ok`);
  emitStatus();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run one full tray loop after desk 4 monologue ends (session-end only).
 */
async function runCarouselLoop() {
  loadConfig();
  if (!status.enabled) {
    console.log("[kodak] disabled (KODAK_ENABLED=0)");
    return;
  }
  if (running) {
    console.log("[kodak] carousel already running — skip");
    return;
  }

  const cfg = config;
  running = true;
  status.lastError = null;
  status.phase = "warming";
  status.slide = 0;
  emitStatus();

  console.log(
    `[kodak] carousel start — ${cfg.slideCount} forward pulses (desk ${cfg.triggerDesk} ended)`
  );

  try {
    await shellySet(true);
    await sleep(cfg.warmupMs);

    status.phase = "advancing";
    emitStatus();

    for (let i = 1; i <= cfg.slideCount; i += 1) {
      status.slide = i;
      emitStatus();
      console.log(`[kodak] forward ${i}/${cfg.slideCount}`);
      await pulseForward({
        channel: cfg.relayChannel,
        pulseMs: cfg.pulseMs,
        vid: cfg.hidVid,
        pid: cfg.hidPid,
      });
      if (i < cfg.slideCount) {
        await sleep(cfg.intervalMs);
      }
    }

    status.phase = "power-off";
    emitStatus();
    await shellySet(false);

    status.phase = "idle";
    status.slide = 0;
    console.log("[kodak] carousel complete — back at 0, power off");
  } catch (err) {
    status.lastError = String(err.message || err);
    status.phase = "idle";
    console.error("[kodak] carousel failed:", err.message || err);
    try {
      await shellySet(false);
    } catch (offErr) {
      console.error("[kodak] Shelly OFF after error:", offErr.message || offErr);
    }
  } finally {
    running = false;
    emitStatus();
  }
}

function onDeskSessionEnd(deskId, closeReason) {
  const cfg = loadConfig();
  if (closeReason !== "session-end") return;
  if (Number(deskId) !== cfg.triggerDesk) return;
  runCarouselLoop().catch((err) => {
    console.error("[kodak] unhandled:", err.message || err);
  });
}

module.exports = {
  getStatus,
  setStatusChangeListener,
  onDeskSessionEnd,
  runCarouselLoop,
};
