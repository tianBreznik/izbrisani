(function () {
  const channelEl = document.getElementById("channel");
  const logEl = document.getElementById("log");
  let state = { status: "idle" };
  let lastLogged = "";

  async function api(path, options) {
    const res = await fetch(path, options);
    return res.json();
  }

  function log(line) {
    const p = document.createElement("p");
    p.textContent = line;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function logStateChange(next) {
    const key =
      next.status === "channel_open"
        ? `open:${next.channelId}`
        : "idle";

    if (key === lastLogged) return;
    lastLogged = key;

    if (next.status === "channel_open") {
      log(`channel ${next.channelId} opened`);
    } else {
      log("channel closed");
    }
  }

  function render() {
    channelEl.textContent =
      state.status === "channel_open" ? state.channelId : 0;
    logStateChange(state);
  }

  async function openChannel(id) {
    const res = await fetch(`/api/channel/${id}/open?force=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    state = await res.json();
    render();
  }

  async function closeChannel() {
    state = await api("/api/channel/close", { method: "POST" });
    render();
  }

  document.querySelectorAll("[data-ch]").forEach((btn) => {
    btn.addEventListener("click", () => openChannel(Number(btn.dataset.ch)));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openChannel(Number(btn.dataset.ch));
      }
    });
  });

  const closeBtn = document.getElementById("btn-close");
  closeBtn.addEventListener("click", closeChannel);
  closeBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      closeChannel();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key >= "1" && e.key <= "4") openChannel(Number(e.key));
    if (e.key === "Escape") closeChannel();
  });

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}`);
  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "state") {
      state = msg.payload;
      render();
    }
  };
  socket.onclose = () => setTimeout(() => location.reload(), 1500);

  api("/api/state").then((s) => {
    state = s;
    channelEl.textContent =
      state.status === "channel_open" ? state.channelId : 0;
    lastLogged =
      state.status === "channel_open" ? `open:${state.channelId}` : "idle";
    log("ready");
    if (state.status === "channel_open") {
      log(`channel ${state.channelId} opened`);
    }
  });
})();
