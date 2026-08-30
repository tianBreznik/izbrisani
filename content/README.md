# Desk story content (audio + subtitles)

Each desk plays **one recording** with **timed sentence subtitles** (film style), then the session **auto-closes**.

## Files per desk

| File | Required | Example |
|------|----------|---------|
| `subtitles/desk-N.vtt` | Yes (for timed text) | WebVTT cues |
| `audio/desk-N.mp3` | When ready | Spoken essay |

Reference both in `channels.json`:

```json
{
  "id": 1,
  "audio": "/content/audio/desk-1.mp3",
  "subtitles": "/content/subtitles/desk-1.vtt"
}
```

Set `"audio": null` while waiting for recordings — subtitles still run on cue timing (clock-only test).

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

## Upload workflow

1. Add `content/subtitles/desk-N.vtt` (timed to your script).
2. Add `content/audio/desk-N.mp3` when recorded.
3. Update `channels.json` paths.
4. On Mac: `curl -X POST http://localhost:3847/api/reload-content` (or restart `npm start`).
5. Desk Pi kiosk may need a refresh once.

## Kiosk autoplay (Pi)

Chromium may block audio until autoplay is allowed. On desk Pis, use kiosk flags (see `deploy/desk-pi/README.md`):  
`--autoplay-policy=no-user-gesture-required`
