const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 3847;
const ROOT = path.join(__dirname, "..");
const CONTENT_PATH = path.join(ROOT, "content", "channels.json");

const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));
app.use("/content", express.static(path.join(ROOT, "content")));

function loadChannels() {
  const raw = fs.readFileSync(CONTENT_PATH, "utf8");
  return JSON.parse(raw).channels;
}

let channels;

function getChannels() {
  channels = loadChannels();
  return channels;
}

channels = getChannels();

function broadcastChannels() {
  const message = JSON.stringify({
    type: "channels",
    payload: { channels: getChannels() },
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

/** @type {{ status: 'idle' } | { status: 'channel_open', channelId: number }} */
let showState = { status: "idle" };

function getPublicState() {
  return {
    ...showState,
    updatedAt: Date.now(),
  };
}

function setShowState(next) {
  showState = next;
  broadcast(getPublicState());
}

function broadcast(payload) {
  const message = JSON.stringify({ type: "state", payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/channels", (_req, res) => {
  res.json({ channels: getChannels() });
});

app.get("/api/state", (_req, res) => {
  res.json(getPublicState());
});

app.post("/api/channel/:id/open", (req, res) => {
  const channelId = Number(req.params.id);
  const exists = getChannels().some((c) => c.id === channelId);
  if (!exists) {
    return res.status(404).json({ error: `Unknown channel ${channelId}` });
  }
  setShowState({ status: "channel_open", channelId });
  res.json(getPublicState());
});

app.post("/api/channel/close", (_req, res) => {
  setShowState({ status: "idle" });
  res.json(getPublicState());
});

app.post("/api/reload-content", (_req, res) => {
  try {
    const next = getChannels();
    broadcastChannels();
    res.json({ ok: true, channels: next });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/desk/:id", (req, res) => {
  res.sendFile(path.join(ROOT, "public", "desk.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "state", payload: getPublicState() }));
  socket.send(
    JSON.stringify({ type: "channels", payload: { channels: getChannels() } })
  );
});

server.listen(PORT, () => {
  const base = `http://localhost:${PORT}`;
  console.log("");
  console.log("  UN Debate Show — simulator running");
  console.log("");
  console.log(`  Control panel   ${base}/control.html`);
  console.log(`  Projector       ${base}/projector.html`);
  console.log(`  Desk 1–4        ${base}/desk/1  …  ${base}/desk/4`);
  console.log("");
  console.log("  Keys on control panel: 1–4 open channel, Esc close");
  console.log("");
});
