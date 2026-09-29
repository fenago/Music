# SongForge: AI Music Studio

A single-page app for the [Suno API](https://docs.sunoapi.org/). Paste your API key and you can write, generate, remix, split, export and sing along to AI music. It has no build step and no backend beyond Netlify redirects.

## Features

| Area | What you can do | Suno API endpoints |
| --- | --- | --- |
| **Key gate** | Validate the key, show remaining credits, remember it on the device or for the session only | `GET /api/v1/generate/credit` |
| **Create: Simple** | Describe a song, set a vibe, choose instrumental, add reference images, video or audio, "Surprise me" | `POST /api/v1/generate` (`customMode: false`) |
| **Create: Custom** | Title, style (with genre/mood chips and ✨ Boost), lyrics with structure tags and ✍️ AI writer, negative tags, vocal gender, length, persona, style weight, weirdness, audio weight, variety | `POST /api/v1/generate` (`customMode: true`), `POST /api/v1/style/generate` |
| **Models** | V6 (default), V6 Wild, V6 Mini, plus legacy V5.5 / V5 / V4.5+ / V4.5 All / V4.5 / V4. Character limits and options adjust to the chosen model | — |
| **Lyrics Lab** | Several lyric drafts per prompt, sent straight into a custom song | `POST /api/v1/lyrics`, `GET /api/v1/lyrics/record-info` |
| **Remix Studio** | Upload & cover, upload & extend, add vocals, add instrumental, mashup, replace section | `upload-cover`, `upload-extend`, `add-vocals`, `add-instrumental`, `mashup`, `replace-section` |
| **Sound Lab** | Ambiences, loops and SFX with tempo, key, loop and lyric capture | `POST /api/v1/generate/sounds` |
| **Library** | Search, filter and favorite tracks, stream while generating, import by task ID | `GET /api/v1/generate/record-info` |
| **Track tools** | Extend, replace section, cover, mashup, persona, karaoke, stems (2-track / full / single instrument), WAV, music video, AI cover art, MIDI (`.mid` download), MP3 | `extend`, `vocal-removal`, `wav`, `mp4`, `suno/cover`, `midi`, `generate-persona`, `get-timestamped-lyrics` |
| **Personas** | Save personas or voice IDs and reuse them on new songs | `POST /api/v1/generate/generate-persona` |
| **Uploads** | Drag-and-drop audio, image or video files (stored for 3 days) | `POST /api/file-stream-upload` (file upload host) |
| **UX** | Light, dark and system themes, player bar with media keys, karaoke view with waveform, progress stages, confetti, responsive layout | — |

## How it works

- `public/`: the whole app (`index.html`, `assets/app.js`, `assets/styles.css`).
- `netlify.toml`: publishes `public/` and proxies `/suno/*` → `https://api.sunoapi.org/*` and `/suno-files/*` → `https://sunoapiorg.redpandaai.co/*`, so the browser calls stay same-origin and CORS never comes up.
- `netlify/functions/suno-callback.mjs`: every Suno task needs a `callBackUrl`. This endpoint just acknowledges it, because the app polls `record-info` for results.
- Tasks, tracks, lyric drafts and personas are kept in `localStorage`. Pending tasks resume after a reload.
- The API key is kept only in the browser (localStorage or sessionStorage) and sent as a `Bearer` header through the proxy.

## Deploy

Connect the repo to Netlify. There's no build command, and the publish directory (`public`) and functions are already set in `netlify.toml`.

To run locally, use `netlify dev` for the proxy. Any static server on `public/` also works: the app falls back to calling the API directly if the proxy isn't there.
