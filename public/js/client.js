(function () {
  const deskMatch = location.pathname.match(/\/desk\/(\d+)/);
  const shadowMatch = location.pathname.match(/\/shadow\/(\d+)/);
  const deskId = deskMatch
    ? Number(deskMatch[1])
    : Number(document.body.dataset.deskId);
  const shadowId = shadowMatch
    ? Number(shadowMatch[1])
    : Number(document.body.dataset.shadowId);

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  let channels = [];
  let state = { status: "idle" };

  /** Test copy for desk karaoke (no name tags). */
  const LOREM =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

  const KARAOKE_MS = 420;
  let karaokeTimer = null;
  let karaokeIndex = 0;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function stopKaraoke() {
    if (karaokeTimer) {
      clearInterval(karaokeTimer);
      karaokeTimer = null;
    }
    karaokeIndex = 0;
  }

  function activeChannel() {
    if (state.status !== "channel_open") return null;
    return channels.find((c) => c.id === state.channelId) || null;
  }

  function wordsFrom(text) {
    return text.trim().split(/\s+/).filter(Boolean);
  }

  function paintKaraoke(container, words, active) {
    container.querySelectorAll(".karaoke-word").forEach((el, i) => {
      el.classList.remove("is-past", "is-active", "is-future");
      if (i < active) el.classList.add("is-past");
      else if (i === active) el.classList.add("is-active");
      else el.classList.add("is-future");
    });
    const current = container.querySelector(".karaoke-word.is-active");
    if (current) {
      current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function startKaraoke(container, words) {
    stopKaraoke();
    karaokeIndex = 0;
    paintKaraoke(container, words, karaokeIndex);
    karaokeTimer = setInterval(() => {
      karaokeIndex += 1;
      if (karaokeIndex >= words.length) {
        karaokeIndex = 0;
      }
      paintKaraoke(container, words, karaokeIndex);
    }, KARAOKE_MS);
  }

  function render() {
    const root = document.getElementById("app");
    const mode = document.body.dataset.mode;

    if (mode === "shadow") {
      stopKaraoke();
      const ch = activeChannel();
      const live = ch && Number(ch.shadow) === shadowId;
      if (!live) {
        root.innerHTML = '<div class="shadow shadow--idle"></div>';
        return;
      }
      const src = ch.shadowMedia || ch.image || "";
      root.innerHTML = `
        <div class="shadow shadow--live">
          <img class="shadow__media" src="${esc(src)}" alt="" />
        </div>
      `;
      return;
    }

    if (mode === "projector") {
      stopKaraoke();
      const ch = activeChannel();
      if (!ch) {
        root.innerHTML = '<div class="standby">channel 0</div>';
        return;
      }
      const src = ch.shadowMedia || ch.image || "";
      root.innerHTML = `<img class="projector__gif" src="${esc(src)}" alt="" />`;
      return;
    }

    if (mode === "desk") {
      const ch = channels.find((c) => c.id === deskId);
      if (!ch) {
        stopKaraoke();
        root.innerHTML = `<p class="standby">desk ${deskId} — not found</p>`;
        return;
      }
      const live = state.status === "channel_open" && state.channelId === deskId;
      if (!live) {
        stopKaraoke();
        root.innerHTML = `<div class="desk desk--idle"></div>`;
        return;
      }

      const words = wordsFrom(LOREM);
      root.innerHTML = `
        <div class="desk desk--live">
          <div class="karaoke" id="karaoke">
            ${words
              .map(
                (w) =>
                  `<span class="karaoke-word is-future">${esc(w)}</span>`
              )
              .join(" ")}
          </div>
        </div>
      `;
      const box = document.getElementById("karaoke");
      startKaraoke(box, words);
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
