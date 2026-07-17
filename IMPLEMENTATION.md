# UN Debate Exhibition — Implementation Plan (Handoff)

Last updated: 2026-07-17  
Purpose: summary for another Cursor agent (including iOS) to continue work.

---

## Project intent

Museum exhibition with a UN debate-room metaphor:

- Visitor/staff presses a **channel button** (1 of 3–4) → that “delegate” speaks.
- Only **one channel open at a time**.
- Opening a channel syncs: desk text, audio, spotlights (or similar), Kodak film projection on/off.
- When idle: buttons glow sinusoidally; when a channel is live: buttons off / ignored (avoid sync issues).

Working repo: web **simulator** of the show controller (Node + Express + WebSocket). Physical install targets **Raspberry Pi** + desk clients.

---

## Confirmed show protocol

| State | Behavior |
|-------|----------|
| `idle` | Desks standby; audio silent (except optional generative ambient — TBD); spotlights off; Kodak **off**; button LEDs sine-glow |
| `channel_open(n)` | Desk *n* shows essay; channel audio *n*; spotlight *n* on; Kodak **on** (same film every time); button LEDs off, inputs ignored |
| `channel_close` | Return to idle |

Exclusive channels (one mic live).

### Content mapping (not projector slides)

- **Kodak Ektalite**: one **short film loop** in the gate. No tray advance during show. Only start/stop projecting.
- Channels differ by: **essay text, audio file, spotlight**, not by film content.
- Dev simulator still has GIFs in `content/channels.json` as placeholders for projector imagery — **not used on install** (carousel is analog).

---

## Target hardware architecture (preferred)

```
1× main Raspberry Pi (4 or 5)
  - Node show server (state machine, HTTP + WebSocket)
  - GPIO: buttons, button LEDs (PWM sine when idle), spotlight relays, Kodak control
  - Audio: bass / global / optional generative conductor
  - optional: channel audio if not delegated to desks

4× desk units (Pi Zero/4 OR ESP32-S3 + 7″ 800×480 RGB LCD)
  - Subscribe to show state via WebSocket
  - Show UN-style name tag + essay when that channel is open
  - Optional: drive directional speaker for that desk

Kodak Ektalite (analog)
  - Film loop fixed; Pi controls on/off via relay/module (not HDMI)

Spotlights
  - 1 per channel (3 or 4 total), GPIO → relays
```

**One Pi is enough for logic + GPIO + audio orchestration** if desks are network clients (ESP32 or thin Pis).  
**One Pi alone cannot drive 4 independent HDMI desk screens** — use ESP32/Pi clients or a multi-output PC.

### Artist audio idea (fit into 1+4)

Proposed by sound designer (Tina) via Maja:

- 4 directional speakers + 1 quieter bass
- Generative background (not a fixed loop) — Tina still checking feasibility
- Question: does this work with **1 + 4 Raspberry Pis**?

**Answer for architecture:** Yes — **same 1+4 skeleton**, not a second cluster:

| Device | Existing role | Audio role |
|--------|---------------|------------|
| Main Pi | Show + GPIO | Bass + optional generative brain / cues |
| Desk Pi 1–4 | Screen | Directional speaker *n* (+ local channel clip / light generative layer) |

Still need Tina to specify: true real-time generative vs “endless” randomised material; where the patch runs (main vs each desk); behavior when a channel opens (duck / mute / continue).

### Rejected / deferred (for now)

- **3 digital projectors for generated shadows** instead of spotlights: artist floated it; technical lead prefers **spotlights** — less equipment, less failure modes. Treat as deferred unless forced.
- **HDMI digital projector** for show images: not the plan; Kodak carousel only for film.
- **Carousel forward/reverse during show**: not needed with one film loop.

---

## Kodak Ektalite findings

- Unit has **IR remote** catalog **CAT 873 5086** (handheld + typically 6-pin IR receiver).
- IR/remote 6-pin is primarily **forward / reverse / focus** — **not** lamp on/off.
- Forward/reverse: no meaningful electronic debounce; **mechanical cycle ~1–2+ s**; do not spam from GPIO.
- For this show: **do not advance tray**; only **project on/off**.
- Preferred control: mains relay, or (if model 2000) 12-pin dissolve lamp / shutter with INT/EXT — **exact model TBD** (technician email sent; awaiting reply).
- Leave IR for install/focus only.

---

## Software in this repo (simulator)

| Path | Role |
|------|------|
| `server/index.js` | Express + WebSocket show controller; reloads `content/channels.json` |
| `content/channels.json` | Channel essays, image paths (sim GIFs), later: `audio`, `slide` unused |
| `public/control.html` | Black teleprompter-style control: channel counter, text buttons 1–4 + close, event log |
| `public/desk.html` | Desk view (800×480), bold Helvetica essay when live |
| `public/projector.html` | Sim only: shows channel GIF when open |
| `public/js/client.js` | Desk + projector WebSocket client |
| `public/js/control.js` | Control panel + log |
| `public/css/show.css` | Teleprompter black/white; bold Helvetica on log/essay |

### API

- `GET /api/state`
- `GET /api/channels`
- `POST /api/channel/:id/open`
- `POST /api/channel/close`
- `POST /api/reload-content`
- WebSocket: `{ type: "state", payload }` and `{ type: "channels", payload }`

Port default: **3847** (`npm start` / `npm run dev`).

### UI decisions (current)

- Control: minimal HTML, text buttons (not styled `<button>` widgets), event log (`channel 1 opened`, etc.).
- Log / desk essay: **bold Helvetica**, white on black.
- Desk links on control page: commented out.
- Desk essays currently shown when channel live; desk links optional for testing.

---

## Planned extensions (not built yet)

1. **`audio` field** per channel in JSON + playback hook on open/close.
2. **GPIO service** on Pi: lamp/Kodak, spotlights, button inputs, PWM LED sine idle.
3. **Desk firmware/clients**: ESP32 LVGL or Pi Chromium kiosk at `/desk/:id`.
4. **Generative ambient** integration with Tina (if kept) — cues from main state machine.
5. Remove or quarantine `projector.html` for production (sim-only).
6. Document exact Kodak wiring once model confirmed.

---

## Open questions

1. Exact Kodak Ektalite model (500/1000/1500/2000) + 12-pin dissolve / shutter / INT-EXT?
2. Channel count: **3 or 4**?
3. Desk clients: ESP32-S3 7″ vs Pi per desk?
4. Generative audio: confirmed? tool (Pd/SC/…)? main vs per-desk? interaction with channel open?
5. Spotlights confirmed over shadow-projectors?
6. Who provides essays, audio stems, film loop, and (if any) generative patches?

---

## Feasibility notes (for agents guiding a less-experienced builder)

- **Doable** with disciplined scope: one state machine, relays, network desks, soak tests.
- Avoid feature creep (extra projector arrays, IR lamp hacks, USB–HDMI dongles for 3+ displays).
- Prefer: one main Pi + network desk clients + relays; multi-output PC only if many HDMI surfaces required.
- Safety: mains via proper relays/modules; optoisolate projector control; never drive lamp AC from GPIO.

---

## Suggested next steps for follow-up agent

1. Confirm with user: channel count, desk client type, generative audio status.
2. Extend `channels.json` + server hooks for `audio` (mockable without Pi).
3. Add stub `gpio/` or `hardware/` module interface (dry-run on laptop).
4. Keep simulator as source of truth for protocol until hardware arrives.
5. When Kodak model known: update this doc with pin/relay plan.

---

## Related conversation context (agents)

- Workspace: `/Users/Tian/izbrisani`
- Artist contact thread: generative ambient + 4 directional + bass on **1+4 Pis** — interpret as **alongside** existing desk architecture, not replacing it.
- User prefers Slovenian drafts when messaging artists; keep technical docs in English unless asked otherwise.
