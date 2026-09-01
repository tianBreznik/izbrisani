# Checkpoint: SuperCollider audio (8ch)

Status: **wired in software** on the Mac Mini show server. SC patch + OSC addresses owned by Tisa; update [`sc-osc-map.json`](./sc-osc-map.json) when she confirms final paths.

---

## Architecture

```text
Mac Mini
  ├── SuperCollider (8ch audio interface)
  │     ├── Ch 1–4: quad ambient (2× stereo WAV, loop — starts in SC, not Node)
  │     └── Ch 5–8: mono monologue WAV per desk (triggered by OSC)
  └── npm start (:3847)
        └── on channel open/idle → UDP OSC → SC
        └── listens for OSC /done → auto-close channel
```

Desk Pis: **subtitles only** (no speaker audio on Pi).

---

## OSC map (placeholders — confirm with Tisa)

File: [`deploy/sc-osc-map.json`](./sc-osc-map.json)

| Direction | Address (placeholder) | When |
|-----------|----------------------|------|
| Node → SC | `/shower` + station `1–4` | `channel_open` |
| Node → SC | `/shower/stop` (optional; SC patch may ignore) | `idle` |
| SC → Node | *(not in patch yet)* — use VTT fallback | monologue ended |

Env overrides: `OSC_HOST`, `OSC_PORT` (default `57120`), `OSC_LISTEN_PORT` (default `57121`), `OSC_MAP_PATH`.

---

## Mac Mini env

```bash
# Default: SuperCollider OSC
export AUDIO_BACKEND=osc
export OSC_HOST=127.0.0.1
export OSC_PORT=57120
export OSC_LISTEN_PORT=57121

# Lab without SC running (VTT timer only, no UDP):
# export OSC_ENABLED=0

# Dev laptop without SC — afplay MP3/WAV fallback:
# export AUDIO_BACKEND=afplay

npm start
```

Code: [`server/sc-osc.js`](../server/sc-osc.js), router [`server/audio-backend.js`](../server/audio-backend.js).

---

## Content

Mono monologue files (desk 1–4):

```text
content/audio/desk-1.wav … desk-4.wav
```

Referenced in `content/channels.json` → absolute path sent in OSC if `includeAudioPath` is true in the map.

Ambient quad files: loaded only in Tisa’s SC patch (not in this repo).

---

## Boot order (show day)

1. **Power audio interface** (USB to Mini).
2. **Start SuperCollider** — ambient loop running before visitors.
3. **Start show server** — `npm start` or launchd (`SHOW_DAY.md`).
4. Desk Pis + Kodak + ESP32 as usual.

SC must be listening on `OSC_PORT` before channels open.

---

## Bench test (no 8ch interface — headphones only)

**Not show setup.** Open and evaluate [`supercollider/bench-headphones.scd`](../supercollider/bench-headphones.scd) on the Mac Mini (Sennheiser as default output). Same `/shower` OSC as production; all audio mixed to stereo.

Show day: evaluate [`supercollider/anatomija_pregona-2026-09-01.scd`](../supercollider/anatomija_pregona-2026-09-01.scd) with the USB 8ch interface only.

---

## Bench test (with 8ch interface)

```bash
# Server running, SC listening
npm run control
# press 1 — should trigger monologue 1 in SC

# Or manual OSC (production addresses):
oscsend localhost 57120 /shower i 1

# Simulate done from SC:
oscsend localhost 57121 /izbrisani/monologue/done
```

Expect server log: `[sc-osc] → …` on open, `[sc-osc] session end (osc-done)` on done.

If SC does not send `/done`, channel still closes via **VTT fallback** timer.

---

## Still needed from Tisa

- [ ] Final OSC addresses + arg types (replace placeholders in `sc-osc-map.json`)
- [ ] Desk index base: `1–4` or `0–3` (`deskIndexBase` in map)
- [ ] Whether trigger needs WAV path arg or desk index only (`includeAudioPath`)
- [ ] SC boot script path for launchd
- [ ] Confirm `/done` sent to port `57121`

---

## Related

- [`content/README.md`](../content/README.md) — WAV + VTT drop-in
- [`SHOW_DAY.md`](./SHOW_DAY.md) — staff boot
- [`server/story-audio.js`](../server/story-audio.js) — `AUDIO_BACKEND=afplay` fallback
