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

- `BasicTemplate` — speaker full-screen; image/video overlays appear as framed "scrapbook" media (border presets apply here).
- `FullScreenOverlayTemplate` — image/video overlays cover the whole frame (the narrator's face) while on screen.
- `SplitScreenTemplate` — speaker in the bottom 60%; image/video overlays fill the top 40% panel.
- `TransparentTemplate` — image/video overlays are full-bleed with Ken-Burns motion behind the speaker cut-out (chroma-keyed at final render).

> All four templates render every overlay type (Image, Video, Text, MotionGraphic).
> Only the image/video *look* changes per template; border presets only take
> effect on `BasicTemplate`.
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
- `MotionGraphic`, one of three render modes:
  - Library composition — top-level `"templateId": "<composition_id from motion_graphics table>"`, `props` = the composition's editable props.
  - Frame-based JS — `props.code` = JS returning JSX; driven by video time (`frame, fps, durationInFrames, interpolate, spring` in scope). This is the mode the editor creates.
  - Inline HTML — `props.html` = raw HTML/CSS string, rendered as-is (still supported for existing overlays; no longer offered when creating new ones).
  - Optional `"backdrop"` (all three modes): `{ "background": bool, "backgroundColor": "#000000", "backgroundOpacity": 60, "border": bool, "borderColor": "#ffffff", "borderWidth": 4, "radius": 16, "padding": 24 }` — an auto-sized card drawn behind the graphic.

## Entry animations (`animationIn`)

Applies to Image, Video, and Text overlays (first ~0.5s).

- `none` — appears instantly.
- `fade` — fades in from transparent.
- `pop` — springs up from small to full size.
- `slide_left` — slides in from the right.
- `slide_right` — slides in from the left.
- `slide_up` — slides in from below.
- `slide_down` — slides in from above.
- `zoom_in` — scales up from zero.
- `spin_in` — springs in while rotating from -180°.
- `drop_down` — drops in from far above.
- `blur_in` — fades in while sharpening from a blur.
- `flip_in` — fades in while flipping on the Y axis.

## Exit animations (`animationOut`)

Applies in the last ~0.5s before the overlay ends.

- `none` — disappears instantly.
- `fade` — fades out to transparent.
- `pop` — springs down to small.
- `slide_left` / `slide_right` — slides out to that side.
- `slide_up` / `slide_down` — slides out that direction.
- `zoom_out` — scales down to zero.
- `spin_out` — springs out while rotating.
- `fly_away` — flies off up-and-to-the-right.
- `blur_out` — fades out while blurring.
- `flip_out` — fades out while flipping on the Y axis.

> There are no `_in`/`_out` suffixed entry names like `fade_in` / `pop_in`.
> `fade_in` is NOT recognized — use `fade`.

## Media border presets (`borderPreset`) — Image & Video

Only render on `BasicTemplate` (scrapbook mode). Currently selectable in the editor:

- `none` — no frame, transparent.
- `photographic` (default) — white scrapbook frame with tape and soft shadow.
- `minimal_shadow` — white mat, rounded, big soft drop shadow.
- `glass` — frosted translucent panel, blurred, rounded.
- `comic_book` — thick black border with a hard offset shadow.
- `airmail` — cream mat with a diagonal red/blue dashed airmail border.
- `blur_bg` — sharp image centered over a blurred copy of itself, even padding all around.
- `electric` — dark rounded frame with a glowing orange edge (static, no animation).
- `wavy` — scalloped wavy edge with an orange bleed (keeps natural image size).
- `lined` — concentric ring frame (3 bold rings) drawn with a repeating radial gradient.
- `artdeco` — thin gold frame with L-shaped corner brackets.
- `vintage` — nested triple gold border (ornamental corner images not included).
- `eightbit` — blocky pixel border with notched corners (retro 8-bit look).

> Retired (still render if present in a manifest, but no longer selectable):
> `neon`, `cyberpunk`, `cinematic`, `gold_frame`, `retro_vhs`, `polaroid_modern`.

## Text styles (`subtitleStyle`, and per-overlay `props.style` on Text overlays)

- `Classic` — plain white bold caption.
- `Highlight` — active word highlighted in a colored box.
- `Glassmorphism` — frosted translucent pill.
- `Sticker` — bold outlined sticker look.
- `Retro` — vintage retro styling.
- `Bubble` — rounded bubble background.
- `Cyberpunk` — neon cyberpunk styling.
- `Minimalist` — thin, understated text.
- `Press` — press/headline styling.

> `Standard` does NOT exist — unknown styles fall back to `Classic`.
> Text overlays may carry a per-overlay `props.style` to override the
> template's default `textOverlayStyle`.

## R2 asset layout (bucket `video-folder`)

```
<avatar_name>/<topic-name>/
├── <main avatar video>.mp4
├── google-images/   ← image overlays
├── ai-images/       ← AI-generated image overlays
└── videos/          ← video overlays
```

Public base: `https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev/`
