# Desk story content (audio + subtitles)

Each **channel** (desk button 1–4) has one recording + timed WebVTT. When that channel opens, **all four screens** show the same subtitles. **Audio plays on the Mac Mini** (amp + speakers), not on the desk Pis.

## Files per channel

| File | Required | Example |
|------|----------|---------|
| `subtitles/desk-N.vtt` | Yes | WebVTT cues timed to the recording |
| `audio/desk-N.mp3` | When ready | Spoken essay |

Reference both in `channels.json`:

```json
{
  "id": 1,
  "audio": "/content/audio/desk-1.mp3",
  "subtitles": "/content/subtitles/desk-1.vtt"
}
```

Set `"audio": null` while waiting for recordings — all screens still run on cue timing (clock-only).

## Drop-in (when files arrive)

1. Put final `content/subtitles/desk-1.vtt` … `desk-4.vtt` (overwrite placeholders).
2. Put `content/audio/desk-1.mp3` … `desk-4.mp3`.
3. Point `audio` in `channels.json` (paths above).
4. On Mac: `curl -X POST http://127.0.0.1:3847/api/reload-content` (or restart `npm start`).
5. Copy updated pyclient to Pis only if client code changed — **content is served from the Mac**; desks fetch VTT/MP3 over HTTP.

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

- Last cue `end` should match **end of audio** (same moment).
- One visible line at a time on the desk screen (film subtitles).
- Export from DaVinci, Subtitle Edit, or hand-edit.

## Mac Mini story audio

- **`server/story-audio.js`** — on channel open, plays `content/audio/desk-N.mp3` via **`afplay`** (macOS) or **`ffplay`** (Linux). When the file ends (or the VTT timer if `"audio": null`), the server auto-closes the channel.
- Disable with **`STORY_AUDIO=0`** (VTT timer still auto-closes).
- Override player: **`STORY_AUDIO_PLAYER=mpv`** or **`STORY_AUDIO_CMD='afplay %FILE%'`**.

## Desk / kiosk playback

- **Pyclient & Chromium:** subtitles only — no desk speaker audio.
- Subtitles stay on the **last cue** until the Mac closes the channel (Esc / auto-close).

