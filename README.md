# ClipNews

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/cyberjalu/video-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberjalu/video-ai/actions/workflows/ci.yml)

> **Turn any news article (or prompt) into a short-form video — in the browser.**

**ClipNews** is a free, open-source web app. Pick a template, paste an article URL or creative prompt, review the AI scene plan, optionally attach images/videos per scene, then render a TikTok-ready vertical MP4 (or YouTube landscape from script).

**Bring your own keys (BYOK):** Gemini and optional Pexels API keys stay in your browser session. The server never persists them.

---

## Features

| Feature | Description |
|---|---|
| **Template gallery** | TikTok neon, corporate brief, YouTube landscape, AI explainer, viral fast |
| **Article → video** | URL → extract → screenshots → AI script → TTS → Remotion → MP4 |
| **Prompt mode** | Describe a topic — no article required |
| **Review & edit** | Edit voiceover, captions, layouts, callouts; upload per-scene media |
| **Pexels auto-fill** | Empty scenes fetch stock photos/videos when a Pexels key is provided |
| **Share & download** | Download MP4; share read-only result link until job expiry |

---

## Tech stack

| Layer | Stack |
|---|---|
| UI | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Pipeline | Node worker (`tsx`), Playwright, Remotion, ffmpeg |
| AI | Google Gemini (script + TTS); optional Pexels |

---

## Prerequisites

| Tool | Notes |
|---|---|
| **Node.js 20+** | Required |
| **ffmpeg / ffprobe** | Must be on `PATH` |
| **Playwright Chromium** | `npx playwright install chromium` |
| **Gemini API key** | [Google AI Studio](https://aistudio.google.com) |

---

## Quick start (local)

```bash
git clone https://github.com/cyberjalu/video-ai.git
cd video-ai

cp .env.example .env
npm install
npx playwright install chromium

npm run dev
```

Open [http://localhost:3000](http://localhost:3000):

1. **Settings** → paste your **Gemini API key** (and optional [Pexels key](https://www.pexels.com/api/)).
2. **Templates** → choose a template → **Generate**.
3. When **Script & visuals** appears, edit the plan or upload media → **Continue to render**.
4. Download MP4 from the result page.

Production build:

```bash
npm run build
npm start
```

---

## Docker

```bash
docker build -t clipnews .
docker run -p 3000:3000 -v clipnews-data:/app/data/jobs clipnews
```

Set `JOB_DATA_DIR`, `JOB_TTL_HOURS`, and `MAX_CONCURRENT_RENDERS` via environment (see `.env.example`).

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `JOB_DATA_DIR` | `./data/jobs` | Server-side job storage |
| `JOB_TTL_HOURS` | `72` | Auto-expire jobs and artifacts |
| `MAX_CONCURRENT_RENDERS` | `2` | Render concurrency cap |

Users supply Gemini/Pexels keys in the browser (Settings). Keys are sent only with job create/render requests and are **not** written to disk under `data/jobs/`.

---

## Job cleanup

```bash
npm run cleanup:jobs
```

Removes expired job directories based on `JOB_TTL_HOURS`.

---

## Development

```bash
npm run dev          # Next.js dev server
npm test             # Domain unit tests
npm run typecheck    # TypeScript
npm run build        # Production build
npm run worker:render -- --help   # CLI worker (advanced)
```

---

## License

MIT — see [LICENSE](LICENSE).
