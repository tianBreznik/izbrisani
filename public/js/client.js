(function () {
  const match = location.pathname.match(/\/desk\/(\d+)/);
  const deskId = match
    ? Number(match[1])
    : Number(document.body.dataset.deskId);

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  let channels = [];
  let state = { status: "idle" };

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render() {
    const root = document.getElementById("app");
    const mode = document.body.dataset.mode;

    if (mode === "projector") {
      if (state.status !== "channel_open") {
        root.innerHTML = '<div class="standby">channel 0</div>';
        return;
      }
      const ch = channels.find((c) => c.id === state.channelId);
      if (!ch) return;
      root.innerHTML = `<img class="projector__gif" src="${esc(ch.image)}" alt="" />`;
      return;
    }

    if (mode === "desk") {
      const ch = channels.find((c) => c.id === deskId);
      if (!ch) {
        root.innerHTML = `<p>desk ${deskId} — not found</p>`;
        return;
      }
      const live = state.status === "channel_open" && state.channelId === deskId;
      root.innerHTML = live
        ? `<div class="teleprompter">${esc(ch.essay)}</div>`
        : `<div class="standby">desk ${deskId} — channel 0</div>`;
    }
  }

  async function init() {
    const [c, s] = await Promise.all([
      fetch("/api/channels").then((r) => r.json()),
      fetch("/api/state").then((r) => r.json()),
    ]);
    channels = c.channels;
    state = s;
    render();
  }

  const socket = new WebSocket(`${protocol}//${location.host}`);
  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "state") {
      state = msg.payload;
      render();
    }
    if (msg.type === "channels") {
      channels = msg.payload.channels;
      render();
    }
  };
  socket.onclose = () => setTimeout(() => location.reload(), 1500);

  init();
})();
