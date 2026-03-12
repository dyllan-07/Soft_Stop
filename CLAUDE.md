# Softstop — Project Overview

## What it is
A Chrome extension (MV3) that shows a mindful interruption overlay on user-defined distraction websites. When you visit a distraction site, a full-screen overlay slowly fades in with a beautiful background image, "Take a Deep Breath", then crossfades to "Are you intending to be here?". The core idea: create awareness and friction without hard blocking.

## High-level aims
- **Awareness over enforcement** — nudge without controlling; the user always has a way out
- **Minimal friction to set up** — just add domains to a list, drop images in a folder
- **Calm, beautiful UX** — the interruption itself should feel meditative, not punishing

## File map
| File | Role |
|---|---|
| `manifest.json` | MV3 config — content script on `<all_urls>`, no new tab override |
| `popup.html/js` | Extension popup — manage distraction sites, pause, settings |
| `popup.css` | Popup styles (warm parchment theme) |
| `content.js` | Injected into every page — detects distraction sites, shows overlay |
| `overlay.css` | Styles for the full-screen focus overlay injected by content.js |
| `images/` | User-supplied background images (jpg, png, webp, gif, avif) |

## Key features

### Distraction overlay (content.js + overlay.css)
- Fades in after 1s on page load (or after snooze interval if `loadOnPageStart` is false)
- Full-screen background image (randomly chosen from `images/`) with gradient fallback
- Image layer fades in separately on top of gradient once loaded
- Single breathe animation cycle on the card (floats down → up → settles), then still
- **Sequence**: "Take a Deep Breath" shows → fades out at 9s → "Are you intending to be here?" + buttons crossfade in
- **"Yes, I'm here intentionally"** — shows snooze duration message, overlay fades out after 10s, snoozes that domain
- **"No, show me the painting!"** — fades out the glass card and vignette, leaves the painting visible full-screen
- Snooze is per-domain, stored in `chrome.storage.local.distractionSnooze`

### Popup (popup.html/js/css)
- Two-panel sliding layout: main view ↔ settings view (slide-left/right transition)
- **Distraction list** — add domains (validated), remove with 20-char reason requirement; scroll shadow when list overflows
- **Pause Extension** — replaces any on/off toggle; opens duration picker (30 min / 1 hr / rest of day) → 30-char reason required → sets `pauseUntil` timestamp
- **Settings panel** (⚙ button):
  - *Time between interrupts* — 1 / 5 / 10 / 30 min (stored as `snoozeMins`)
  - *Interrupt on page load* — Yes / No (stored as `loadOnPageStart`)
- **Image auto-discovery** — popup scans `images/` on open via `getPackageDirectoryEntry`, caches filenames in `chrome.storage.local.bgImages`

## Storage schema
- `chrome.storage.sync`: `distractions[]`, `pauseUntil`, `snoozeMins`, `loadOnPageStart`
- `chrome.storage.local`: `bgImages[]`, `distractionSnooze` `{ [host]: timestamp }`

## Theme
Warm parchment — body bg `linear-gradient(160deg, #e8e0cc 0%, #f2ead8 100%)`, text `#2c2010`, all tones via `rgba(44, 32, 16, X)`. Cormorant Garamond serif throughout (loaded via Google Fonts). Overlay glass: `rgba(242, 232, 210, 0.18)` with warm amber hairlines `rgba(200, 175, 130, X)`.

## Architecture notes
- Content script uses `!important` on all injected styles to avoid conflicts with host page styles
- CSS custom properties (`--tn-bg`, `--tn-img`) are used to set dynamic background values while keeping `!important` in the stylesheet — inline styles can't use `!important` directly
- Double `requestAnimationFrame` is required before adding the visible class to trigger CSS transitions reliably
- `getPackageDirectoryEntry` is only available in extension pages (popup), not content scripts — that's why image discovery happens in popup.js and is cached to storage
- Images must be in `images/` subfolder and declared under `web_accessible_resources` in manifest.json
- Heading and subtext occupy the same space via `#tab-nudge-text-wrapper` (relative) + sub `position: absolute; top:0` — enables the crossfade without layout shift
- Popup sliding navigation: `#views-wrapper` is `display:flex; width:600px`; `settings-open` class applies `transform: translateX(-300px)`

## Adding background images
1. Drop image files into `Work-Nudge/images/`
2. Open the extension popup (this triggers the auto-scan)
3. Done — the overlay will pick randomly from available images
