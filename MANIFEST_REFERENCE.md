# Manifest Reference

Single source of truth for every value the edit-queue video editor understands.
The backend that writes `edit_queue.manifest` must only use values listed here.
**Keep this file updated whenever a template, style, animation, or preset is
added to or removed from the codebase.**

## Top-level config keys

| Key | Type | Notes |
|---|---|---|
| `videoUrl` | string (URL) | Main avatar video. |
| `templateId` | string | One of the Templates below. Unknown values silently fall back to `BasicTemplate`. |
| `overlays` | array | See Overlay object. |
| `subtitleData` | array | Parsed transcript segments (`{start, end, text, words[]}`). |
| `subtitlesUrl` | string (URL) | Alternative to `subtitleData` (.json or .srt). |
| `showSubtitles` | boolean | Default `true`. |
| `subtitleStyle` | string | One of the Text styles below. Default per template. |
| `subtitleSize` | string | CSS size, e.g. `"69px"`. |
| `subtitleBottom` | string | CSS offset from bottom, e.g. `"240px"`. |
| `backgroundMusicUrl` | string (URL) | BGM track. |
| `showBgm` | boolean | Default `true`. |
| `bgmVolume` | number | 0–1, e.g. `0.17`. |
| `showProgressBar` | boolean | Default `true`. Top-of-video progress bar. |
| `progressBarColor` | string (hex) | Default `#ffcc00`. Gradient/glow derived from it. |
| `textOverlayStyle` | string | Style for Text overlays. One of the Text styles below. |
| `chromaKeyColor` | string (hex) | TransparentTemplate only. Default `#00b140`. |

## Templates (`templateId`)

- `BasicTemplate` — Basic full screen (scrapbook-style overlays)
- `FullScreenOverlayTemplate` — Full-screen B-roll overlays
- `SplitScreenTemplate` — Top 40% visual context / bottom 60% video
- `TransparentTemplate` — Chroma-keyed transparent overlay

> Anything else (e.g. `BRollTemplate`, `StorytellingTemplate`) does NOT exist
> and renders as `BasicTemplate`.

## Overlay object

```json
{
  "type": "Image | Video | Text | MotionGraphic",
  "startInSeconds": 8.8,
  "durationInSeconds": 2.3,
  "opacity": 100,
  "position": { "x": "50%", "y": "50%", "scale": 100, "rotation": 0 },
  "animationIn": "fade",
  "animationOut": "fade",
  "borderPreset": "photographic",
  "props": { }
}
```

### Canonical formats (the editor normalizes these on load)

- `position.x` / `position.y`: **percent strings** — `"50%"`, `"14%"`.
- `position.scale`: **number**, percent — `100` = normal size.
- `position.rotation`: **number**, degrees.
- `startInSeconds` / `durationInSeconds`: numbers rounded to **2 decimals**.
- `opacity`: number `0–100`.

### Per-type `props`

- `Image`: `{ "src": "<url>" }` (`url` accepted as a legacy alias; prefer `src`)
- `Video`: `{ "src": "<url>" }`
- `Text`: `{ "text": "THEY RISKED MILLIONS" }`
- `MotionGraphic`, one of three modes:
  - Library composition: top-level `"templateId": "<composition_id from motion_graphics table>"`, `props` = the composition's editable props.
  - Inline HTML: `props.html` = raw HTML/CSS string, rendered as-is (not saved anywhere else).
  - Legacy JSX snippet: `props.code` = JS returning JSX (has `frame, fps, durationInFrames, interpolate, spring` in scope).
  - Optional `"backdrop"`: `{ "background": bool, "backgroundColor": "#000000", "backgroundOpacity": 60, "border": bool, "borderColor": "#ffffff", "borderWidth": 4, "radius": 16, "padding": 24 }`

## Entry animations (`animationIn`)

`none`, `fade`, `pop`, `slide_left`, `slide_right`, `slide_up`, `slide_down`,
`zoom_in`, `spin_in`, `drop_down`, `blur_in`, `flip_in`

## Exit animations (`animationOut`)

`none`, `fade`, `pop`, `slide_left`, `slide_right`, `slide_up`, `slide_down`,
`zoom_out`, `spin_out`, `fly_away`, `blur_out`, `flip_out`

> There are no `_in`/`_out` suffixed entry names like `fade_in` / `pop_in`.
> `fade_in` is NOT recognized — use `fade`.

## Image border presets (`borderPreset`)

`photographic` (default), `none`, `neon`, `cyberpunk`, `cinematic`,
`minimal_shadow`, `glass`, `gold_frame`, `comic_book`, `retro_vhs`,
`polaroid_modern`

## Text styles (`subtitleStyle`, `textOverlayStyle`)

`Classic`, `Highlight`, `Glassmorphism`, `Sticker`, `Retro`, `Bubble`,
`Cyberpunk`, `Minimalist`, `Press`

> `Standard` does NOT exist — unknown styles fall back to `Classic`.

## R2 asset layout (bucket `video-folder`)

```
<avatar_name>/<topic-name>/
├── <main avatar video>.mp4
├── google-images/   ← image overlays
├── ai-images/       ← AI-generated image overlays
└── videos/          ← video overlays
```

Public base: `https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev/`
