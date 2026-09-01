# Desk story content (audio + subtitles)

Each **channel** (desk button 1–4) has one monologue recording + timed WebVTT. When that channel opens, **all four screens** show the same subtitles. **Audio plays on the Mac Mini** via **SuperCollider** (8ch interface), not on the desk Pis.

## Files per channel

| File | Required | Example |
|------|----------|---------|
| `subtitles/desk-N.vtt` | Yes | WebVTT cues timed to the recording |
| `audio/desk-N.wav` | When ready | Mono monologue (SC output ch 5–8) |

Reference both in `channels.json`:

```json
{
  "id": 1,
  "audio": "/content/audio/desk-1.wav",
  "subtitles": "/content/subtitles/desk-1.vtt"
}
```

Set `"audio": null` while waiting for recordings — VTT timer still auto-closes the channel.

Quad **ambient** (4ch loop from 2× stereo WAV) lives in Tisa’s SuperCollider patch only — not in `channels.json`.

## Drop-in (when files arrive)

1. Put final `content/subtitles/desk-1.vtt` … `desk-4.vtt`.
2. Put mono `content/audio/desk-1.wav` … `desk-4.wav`.
3. Point `audio` in `channels.json` (paths above).
4. On Mac: `curl -X POST http://127.0.0.1:3847/api/reload-content` (or restart `npm start`).
5. Copy updated pyclient to Pis only if client code changed — **content is served from the Mac**; desks fetch VTT over HTTP.

## WebVTT format

One **sentence (or short phrase) per cue**. Times in seconds from start of the audio file.

```vtt
WEBVTT

00:00:00.000 --> 00:00:04.200
First sentence of the delegate speech.

00:00:04.200 --> 00:00:09.100
Second sentence, synced to the recording.

00:00:09.100 --> 00:00:14.500
Last line ends when the audio ends.
```

Rules:

- Last cue `end` should match **end of monologue** (same moment).
- One visible line at a time on the desk screen (film subtitles).
- Export from DaVinci, Subtitle Edit, or hand-edit.

## Mac Mini story audio (SuperCollider + OSC)

Default backend: **`AUDIO_BACKEND=osc`** ([`server/sc-osc.js`](../server/sc-osc.js)).

- On channel open → OSC trigger monologue desk N (+ optional absolute WAV path).
- On idle → OSC stop monologue.
- SC sends OSC **done** → server auto-closes; else **VTT end timer** fallback.
- Disable OSC (lab): `OSC_ENABLED=0`.
- Dev without SC: `AUDIO_BACKEND=afplay` (plays `content/audio/desk-N.wav` via `afplay`).

OSC map: [`deploy/sc-osc-map.json`](../deploy/sc-osc-map.json). Full setup: [`deploy/checkpoint_audio.md`](../deploy/checkpoint_audio.md).

## Desk / kiosk playback

- **Pyclient & Chromium:** subtitles only — no desk speaker audio.
- Subtitles stay on the **last cue** until the Mac closes the channel (OSC done / VTT / Esc).
