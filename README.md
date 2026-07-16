# ClipNews

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/cyberjalu/video-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberjalu/video-ai/actions/workflows/ci.yml)

> **Turn any news article (or prompt) into a short-form video.**

**ClipNews** is a free, open-source desktop app. Paste an article URL or a creative prompt, review the scene plan, optionally attach images/videos (or let [Pexels](https://www.pexels.com) fill gaps), then render a TikTok-ready vertical MP4 — or a YouTube landscape video from your own script + audio.

No license key. Keys stay on your machine. Clone, install, run.

---

## Features

| Feature | Description |
|---|---|
| **Article → TikTok** | URL → extract → screenshots → AI script → TTS → 1080×1920 MP4 |
| **Prompt mode** | No article needed — describe the topic and generate a video |
| **YouTube path** | Your voice recording + script → landscape 16:9 (`YouTubeStoryV1`) |
| **Attach visuals** | Pause after the plan, upload image/video **per scene**, then continue |
| **Pexels auto-fill** | Empty scenes fetch stock **photos** or **videos** via API key in Settings |
| **News layouts** | `screenshot`, `stat`, `bar_chart`, `big_callout`, `broll`, `split` |
| **Video dub** | Transcribe → edit transcript → Gemini TTS → merge back into the video |
| **History** | Browse past projects under `./output/` |
| **Cross-platform** | macOS and Windows (source build) |

**Asset priority:** your uploads → Pexels auto-fill → callout fallback.

---

## Screenshots / flow

```text
Create / YouTube
    → stage=plan   (extract, screenshots, AI scene plan)
    → Attach visuals (optional uploads per scene)
    → stage=render (Pexels fill → TTS → Remotion → QC)
    → out.mp4  (edit assets → Re-render; TTS wav reused when present)
```

---

## Tech stack

| Layer | Stack |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Desktop | Tauri v2 (Rust) |
| Pipeline | Node worker (`tsx`), Playwright, Remotion, ffmpeg |
| AI | Google Gemini (script + TTS); optional OpenAI TTS; optional Pexels |

---

## Prerequisites

| Tool | Notes |
|---|---|
| **Node.js 18+** | Required |
| **Rust + Tauri deps** | [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) |
| **ffmpeg / ffprobe** | Must be on `PATH` |
| **Playwright Chromium** | `npx playwright install chromium` |
| **Gemini API key** | [Google AI Studio](https://aistudio.google.com) |

### Platform notes

- **macOS:** Xcode Command Line Tools. TTS via Gemini/OpenAI (local `say` only as last resort).
- **Windows:** WebView2, Visual Studio Build Tools (MSVC), Rust MSVC toolchain. Use Gemini or OpenAI for TTS (`macos` TTS is unavailable).

```bash
# ffmpeg
brew install ffmpeg          # macOS
scoop install ffmpeg         # Windows (Scoop)
```

---

## Quick start

```bash
git clone https://github.com/cyberjalu/video-ai.git
cd video-ai

npm install
npx playwright install chromium

npm run tauri -- dev
```

1. Open **Settings** → paste your **Gemini API key** (and optionally a [Pexels API key](https://www.pexels.com/api/)).
2. **Create Video** → paste a news URL or a prompt → Generate.
3. When **Attach visuals** appears, upload per-scene media or click **Continue / Skip & render**.
4. Preview and download the MP4 from the right panel. Use **Re-render with assets** after edits.

Frontend-only (no Rust window):

```bash
npm run generate:css
npm run dev
```

Production build:

```bash
npm run build
npm run tauri -- build
```

---

## Settings

Stored in **localStorage** on your machine (never committed):

| Key | Purpose |
|---|---|
| Gemini API key | Script planning + TTS (required) |
| Pexels API key | Auto-fill empty scenes with photos/videos ([guidelines](https://www.pexels.com/api/documentation/#guidelines)) |
| Preset | `deep_explainer` / `news_60_80` / `ultra_25_35` |
| Template | `NewsStoryV1` / `CorporateNewsV1` / `YouTubeStoryV1` |
| Layout mode | `tri` / `dual` / `mono` |
| Voice / content model / audio model | Gemini voice & models |

Pexels attribution: show a link to Pexels and credit photographers when possible. Default rate limit is about **200 requests/hour**.

---

## How generation works

### Two-stage pipeline

| Stage | What happens |
|---|---|
| `plan` | Extract article / use prompt or audio+script → write `plan/video_plan.json` → emit `plan_ready` → stop for UI review |
| `render` | Load plan → resolve `user_assets/` → Pexels fill → TTS (skip if `tts/voiceover*.wav` exists) → Remotion → QC |
| `full` | One-shot CLI path (plan + render without UI pause) |

### UI ↔ worker steps

| Worker | UI |
|---|---|
| `extract` | Reading article |
| `screenshot` | Capturing screenshots |
| `plan` | Writing video script |
| *(pause)* | **Attach visuals** |
| `fetch_broll` | Pexels photos/videos |
| `tts` / `audio_fit` | Generating voiceover |
| `render` | Rendering video |
| `qc` | Finalizing export |

Worker stdout is NDJSON:

```ts
type WorkerEvent =
  | { type: "step_start"; step: string }
  | { type: "step_done"; step: string; plan?: VideoPlan }
  | { type: "plan_ready"; projectDir: string; plan: VideoPlan }
  | { type: "log"; message: string }
  | { type: "done"; projectDir: string; mp4?: string; planReady?: boolean }
  | { type: "error"; message: string };
```

### Project folder layout

```text
output/<timestamp>__<slug>/
  article/           # raw HTML / extract (URL mode)
  screenshots/       # Playwright captures
  user_assets/       # your per-scene uploads (s1.png, s3.mp4, …)
  pexels/            # auto-downloaded stock media
  plan/video_plan.json
  tts/voiceover*.wav
  render/out.mp4
```

---

## CLI (headless)

From the repo root:

```bash
export GEMINI_API_KEY=...
# optional
export PEXELS_API_KEY=...

# Full one-shot from a URL
npm run worker:render -- --url "https://example.com/article" --stage full

# Plan only
npx tsx ./worker/index.ts --url "https://example.com/article" --stage plan

# Render an existing project (after editing plan / user_assets)
npx tsx ./worker/index.ts \
  --stage render \
  --projectDir ./output/2026-07-15__example \
  --pexelsKey "$PEXELS_API_KEY"
```

### Audio + script (TikTok or YouTube)

```bash
npx tsx ./worker/index.ts \
  --platform youtube \
  --audioPath ./voice.wav \
  --script "$(cat ./script.txt)" \
  --template YouTubeStoryV1 \
  --stage full
```

### Proof images via `--assetsDir`

Name files by scene id (`s4.png`, `s5.jpg`) or set `screenshot_file` / `screenshot_path` in the plan. Use `"image_fit": "contain"` for UI screenshots with readable text.

```bash
npx tsx ./worker/index.ts \
  --platform tiktok \
  --audioPath ./voice.wav \
  --script "..." \
  --planFile ./plan.json \
  --assetsDir ./assets/proof \
  --template NewsStoryV1 \
  --stage full
```

---

## Repository layout

```text
src/                 React UI (pages, components, lib)
src-tauri/           Tauri / Rust bridge (spawn worker, file commands)
worker/              Node pipeline (extract → plan → Pexels → TTS → Remotion)
remotion/            Video templates + scene visuals
.github/workflows/   CI (typecheck + vitest)
```

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run tauri -- dev` | Desktop app (dev) |
| `npm run build` | CSS + TypeScript + Vite |
| `npm run test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run worker:render` | CLI entry for `worker/index.ts` |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Prefer small PRs. Do not commit API keys, `.env`, or anything under `output/`.

---

## License

[MIT](LICENSE) — free for personal and commercial use.

**Photos / videos provided by [Pexels](https://www.pexels.com)** when you enable the Pexels API. Follow their [API guidelines](https://www.pexels.com/api/documentation/#guidelines).
