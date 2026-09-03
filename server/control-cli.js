#!/usr/bin/env node

const http = require("http");
const https = require("https");
const { URL } = require("url");
const WebSocket = require("ws");

const SHOW_URL = (process.env.SHOW_URL || "http://127.0.0.1:3847").replace(
  /\/$/,
  ""
);

let state = { status: "idle", hardware: null };
let lastKey = "";

function wsUrl() {
  const u = new URL(SHOW_URL);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString().replace(/\/$/, "");
}

function request(method, path) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, SHOW_URL);
    const lib = u.protocol === "https:" ? https : http;
    const body = method === "GET" || method === "HEAD" ? null : "{}";
    const headers = { Accept: "application/json" };
    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = lib.request(u, { method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data || "{}") });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function stateLine() {
  if (state.status === "channel_open") {
    return `OPEN  channel ${state.channelId}`;
  }
  if (state.status === "kodak") {
    const k = state.hardware?.kodak;
    if (k?.phase === "advancing") {
      return `KODAK  slide ${k.slide}/${k.slideCount}`;
    }
    return "KODAK  busy";
  }
  return "IDLE";
}

function tag(configured) {
  return configured ? "" : " (stub)";
}

function errSuffix(block) {
  if (!block?.lastError) return "";
  const short = String(block.lastError).replace(/\s+/g, " ").slice(0, 48);
  return `  ! ${short}`;
}

function kodakLine(hw) {
  const k = hw?.kodak;
  if (!k) return "kodak     —";
  const stub = tag(k.configured);
  if (k.phase === "advancing") {
    return `kodak     slide ${k.slide}/${k.slideCount}  power ${k.power}${stub}${errSuffix(k)}`;
  }
  if (k.phase === "warming") {
    return `kodak     warming up  power ${k.power}${stub}${errSuffix(k)}`;
  }
  if (k.phase === "power-off") {
    return `kodak     shutting down${stub}${errSuffix(k)}`;
  }
  const desk = k.triggerDesk ?? 4;
  return `kodak     idle (desk ${desk} session-end)${stub}${errSuffix(k)}`;
}

function seanceLine(hw) {
  const s = hw?.seance;
  if (!s) return "seance    —";
  let detail;
  if (s.phase === "dark") {
    detail = "dark  (subtitles / kodak)";
  } else if (s.phase === "idle") {
    detail = "idle  (lights on)";
  } else if (s.phase === "hunting") {
    detail = "hunting";
  } else {
    detail = s.phase;
  }
  const settle =
    s.phase === "hunting" && s.settleMs ? `  (${s.settleMs}ms settle)` : "";
  return `seance    ${detail}${settle}${tag(s.configured)}${errSuffix(s)}`;
}

function speakersLine(hw) {
  const sp = hw?.speakers;
  if (!sp) return "speakers  —";
  if (sp.phase === "playing" && sp.desk) {
    const wired = sp.configured ? "playing" : "playing (not wired)";
    return `speakers  desk ${sp.desk}  ${wired}`;
  }
  return `speakers  idle${tag(sp.configured)}`;
}

function paint(extra = "") {
  const stamp = new Date().toLocaleTimeString();
  const hw = state.hardware;
  process.stdout.write("\x1Bc");
  console.log("anatomija pregona — Mac Mini operator");
  console.log(`server    ${SHOW_URL}`);
  console.log(`channel   ${stateLine()}   ${stamp}`);
  console.log(kodakLine(hw));
  console.log(seanceLine(hw));
  console.log(speakersLine(hw));
  if (!hw) console.log("note      no hardware block — restart: npm start");
  if (lastKey) console.log(`last      ${lastKey}`);
  if (extra) console.log(`note      ${extra}`);
  console.log("");
  console.log("  1–4       open channel (force)");
  console.log("  Esc/0/c   close → idle");
  console.log("  q         quit");
  console.log("");
}

async function postChannel(path, label) {
  lastKey = label;
  try {
    const { status, json } = await request("POST", path);
    if (status >= 400) {
      paint(`HTTP ${status}: ${json.error || JSON.stringify(json)}`);
      return;
    }
    state = json;
    paint();
  } catch (err) {
    paint(`${label} failed: ${err.message}`);
  }
}

function openChannel(id) {
  return postChannel(`/api/channel/${id}/open?force=1`, `open ${id}`);
}

function closeChannel() {
  return postChannel("/api/channel/close", "close");
}

function connectWs() {
  const ws = new WebSocket(wsUrl());

  ws.on("open", () => paint("ws connected"));
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === "state") {
        state = msg.payload;
        paint();
      }
    } catch {
      /* ignore */
    }
  });
  ws.on("close", () => {
    paint("ws disconnected — retrying…");
    setTimeout(connectWs, 1500);
  });
}

async function boot() {
  if (!process.stdin.isTTY) {
    console.error("Need a TTY (run in Terminal / over SSH with -t).");
    process.exit(1);
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (key) => {
    if (key === "\u0003" || key === "q" || key === "Q") {
      process.stdout.write("\x1Bc");
      console.log("operator quit");
      process.exit(0);
    }
    if (key === "\u001b" || key === "0" || key === "c" || key === "C") {
      closeChannel();
      return;
    }
    if (key >= "1" && key <= "4") {
      openChannel(Number(key));
    }
  });

  try {
    const { json } = await request("GET", "/api/state");
    state = json;
  } catch (err) {
    paint(`server not reachable: ${err.message} — start with: npm start`);
  }

  paint();
  connectWs();
}

boot();
