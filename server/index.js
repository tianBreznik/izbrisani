const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const {
  onShowStateChange,
  getHardwareState,
  setHardwareChangeListener,
} = require("./hardware");

const PORT = Number(process.env.PORT) || 3847;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.join(__dirname, "..");
const CONTENT_PATH = path.join(ROOT, "content", "channels.json");

const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));
app.use("/content", express.static(path.join(ROOT, "content")));

function getChannels() {
  return JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8")).channels;
}

let showState = { status: "idle" };

function getPublicState() {
  return {
    ...showState,
    hardware: getHardwareState(),
    updatedAt: Date.now(),
  };
}

function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

function broadcastState() {
  broadcast("state", getPublicState());
}

setHardwareChangeListener(broadcastState);

function setShowState(next) {
  const prev = showState;
  showState = next;
  onShowStateChange(prev, next);
  broadcastState();
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
  const force = req.query.force === "1" || req.body?.force === true;
  const exists = getChannels().some((c) => c.id === channelId);
  if (!exists) {
    return res.status(404).json({ error: `Unknown channel ${channelId}` });
  }

  if (
    !force &&
    showState.status === "channel_open" &&
    showState.channelId !== channelId
  ) {
    return res.status(409).json({
      error: "channel_busy",
      activeChannelId: showState.channelId,
      ...getPublicState(),
    });
  }

  if (
    !force &&
    showState.status === "channel_open" &&
    showState.channelId === channelId
  ) {
    setShowState({ status: "idle" });
    return res.json(getPublicState());
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
    const channels = getChannels();
    broadcast("channels", { channels });
    res.json({ ok: true, channels });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/desk/:id", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "desk.html"));
});

app.get("/shadow/:id", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "shadow.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "state", payload: getPublicState() }));
  socket.send(
    JSON.stringify({ type: "channels", payload: { channels: getChannels() } })
  );
});

server.listen(PORT, HOST, () => {
  const base = `http://localhost:${PORT}`;
  console.log("");
  console.log("  anatomija pregona — Mac Mini hub");
  console.log("");
  console.log(`  Operator    npm run control   (terminal — keys 1–4 / Esc)`);
  console.log(`  Desk kiosk  ${base}/desk/1  …  /desk/4`);
  console.log(`  Listening   ${HOST}:${PORT}`);
  console.log("");
});
