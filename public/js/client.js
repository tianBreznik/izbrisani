(function () {
  const deskMatch = location.pathname.match(/\/desk\/(\d+)/);
  const deskId = deskMatch
    ? Number(deskMatch[1])
    : Number(document.body.dataset.deskId);

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  let channels = [];
  let state = { status: "idle" };
  let player = null;
  let playerGeneration = 0;
  let closeAbortGen = 0;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  function parseVtt(text) {
    const cues = [];
    const blocks = String(text)
      .replace(/^\uFEFF/, "")
      .replace(/\r/g, "")
      .split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split("\n").filter((l) => l.trim() !== "");
      if (!lines.length || lines[0].startsWith("WEBVTT")) continue;
      let i = 0;
      if (lines[0].includes("-->")) {
        i = 0;
      } else if (lines.length > 1 && lines[1].includes("-->")) {
        i = 1;
      } else {
        continue;
      }
      const [startRaw, endRaw] = lines[i].split("-->").map((s) => s.trim());
      const body = lines.slice(i + 1).join("\n").trim();
      if (!body) continue;
      cues.push({
        start: parseVttTime(startRaw),
        end: parseVttTime(endRaw),
        text: body,
      });
    }
    return cues.sort((a, b) => a.start - b.start);
  }

  async function loadCues(ch) {
    if (!ch.subtitles) return [];
    const res = await fetch(ch.subtitles);
    if (!res.ok) throw new Error(`subtitles ${res.status}`);
    return parseVtt(await res.text());
  }

  function cueAt(cues, t) {
    for (let i = cues.length - 1; i >= 0; i -= 1) {
      if (t >= cues[i].start && t < cues[i].end) return cues[i];
    }
    return null;
  }

  function stopPlayer() {
    closeAbortGen += 1;
    if (!player) return;
    if (player.rafId) cancelAnimationFrame(player.rafId);
    if (player.audioEl) {
      player.audioEl.pause();
      player.audioEl.removeAttribute("src");
      player.audioEl.load();
    }
    player = null;
  }

  async function closeSession(sessionKey) {
    if (!player || player.sessionKey !== sessionKey || player.closing) return;
    const closeGen = closeAbortGen;
    player.closing = true;
    try {
      const s = await fetch("/api/state").then((r) => r.json());
      if (closeGen !== closeAbortGen) return;
      if (s.status !== "channel_open" || s.channelId !== deskId) return;
      await fetch("/api/channel/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch (err) {
      console.error("auto-close failed", err);
    }
  }

  function mountPlayerShell() {
    const root = document.getElementById("app");
    root.innerHTML = `
      <div class="desk desk--live">
        <div class="subtitles" id="subtitles" aria-live="polite">
          <span class="subtitles__text" id="subtitles-text"></span>
        </div>
        <audio id="story-audio" preload="auto"></audio>
      </div>
    `;
    return {
      lineEl: document.getElementById("subtitles-text"),
      wrapEl: document.getElementById("subtitles"),
      audioEl: document.getElementById("story-audio"),
    };
  }

  function paintCue(lineEl, wrapEl, cue) {
    if (!lineEl) return;
    const text = cue ? cue.text : "";
    if (lineEl.textContent === text) return;
    lineEl.textContent = text;
    if (wrapEl) wrapEl.classList.toggle("subtitles--empty", !text);
  }

  async function startPlayer(ch, sessionKey) {
    stopPlayer();
    const gen = ++playerGeneration;
    const { lineEl, wrapEl, audioEl } = mountPlayerShell();
    let cues;
    try {
      cues = await loadCues(ch);
    } catch (err) {
      if (gen !== playerGeneration) return;
      lineEl.textContent = `subtitles error: ${err.message}`;
      wrapEl.classList.add("subtitles--error");
      return;
    }
    if (gen !== playerGeneration) return;
    if (!cues.length) {
      lineEl.textContent = "no subtitles";
      wrapEl.classList.add("subtitles--error");
      return;
    }

    const endAt = cues[cues.length - 1].end;
    const hasAudio = !!ch.audio;

    player = {
      sessionKey,
      deskId,
      cues,
      endAt,
      lineEl,
      wrapEl,
      audioEl,
      closing: false,
      rafId: null,
      useAudio: hasAudio,
      clock0: hasAudio ? null : performance.now(),
    };

    paintCue(lineEl, wrapEl, cueAt(cues, 0));

    if (hasAudio) {
      audioEl.src = ch.audio;
      audioEl.addEventListener(
        "ended",
        () => closeSession(sessionKey),
        { once: true }
      );
      audioEl.addEventListener("error", () => {
        lineEl.textContent = "audio failed to load";
        wrapEl.classList.add("subtitles--error");
      });
      try {
        await audioEl.play();
      } catch (err) {
        console.warn("audio play blocked — check kiosk autoplay policy", err);
        lineEl.textContent = "tap / allow autoplay for audio";
        wrapEl.classList.add("subtitles--error");
      }
      if (gen !== playerGeneration) return;
    }

    const tick = () => {
      if (!player || player.sessionKey !== sessionKey) return;
      let t;
      if (player.useAudio && player.audioEl) {
        t = player.audioEl.currentTime;
        if (player.audioEl.ended || (endAt > 0 && t >= endAt - 0.05)) {
          closeSession(sessionKey);
          return;
        }
      } else {
        t = (performance.now() - player.clock0) / 1000;
        if (t >= endAt) {
          paintCue(player.lineEl, player.wrapEl, cueAt(player.cues, endAt - 0.001));
          closeSession(sessionKey);
          return;
        }
      }
      paintCue(player.lineEl, player.wrapEl, cueAt(player.cues, t));
      player.rafId = requestAnimationFrame(tick);
    };
    player.rafId = requestAnimationFrame(tick);
  }

  function render() {
    const root = document.getElementById("app");
    const ch = channels.find((c) => c.id === deskId);
    if (!ch) {
      stopPlayer();
      root.innerHTML = `<p class="standby">desk ${deskId} — not found</p>`;
      return;
    }

    const live = state.status === "channel_open" && state.channelId === deskId;
    if (!live) {
      stopPlayer();
      root.innerHTML = `<div class="desk desk--idle"><p class="standby">desk ${deskId} — idle</p></div>`;
      return;
    }

    const sessionKey = `${state.channelId}:${state.updatedAt || 0}`;
    if (player && player.sessionKey === sessionKey && !player.closing) return;

    startPlayer(ch, sessionKey);
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
      if (state.status === "channel_open" && state.channelId === deskId) {
        stopPlayer();
      }
      render();
    }
  };
  socket.onclose = () => setTimeout(() => location.reload(), 1500);

  init();
})();
