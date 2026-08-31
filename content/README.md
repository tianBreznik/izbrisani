# Desk story content (audio + subtitles)

Each **channel** (desk button 1–4) has one recording + timed WebVTT. When that channel opens, **all four screens** show the same subtitles. Audio plays on the **opening desk** only (until a shared speaker path exists).

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

## Kiosk / pyclient audio

- **Pyclient:** pygame mixer on the opening desk; followers are silent (subtitles only).
- **Chromium:** needs `--autoplay-policy=no-user-gesture-required` (see `deploy/desk-pi/README.md`).

