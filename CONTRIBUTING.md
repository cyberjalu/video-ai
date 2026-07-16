# Contributing to ClipNews

ClipNews is a free, open-source desktop app that turns article URLs (or prompts) into short-form videos. Thanks for helping improve it.

## Prerequisites

- **Node.js** 18+
- **Rust** + Tauri CLI deps ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))
- **ffmpeg** and **ffprobe** on your `PATH`
- **Playwright Chromium**: `npx playwright install chromium`
- A [Gemini API key](https://aistudio.google.com) (optional: [Pexels](https://www.pexels.com/api/) for B-roll)

### Platform notes

| Platform | Extra |
|---|---|
| macOS | Xcode Command Line Tools |
| Windows | WebView2, Visual Studio Build Tools (MSVC), Rust MSVC toolchain |

## Setup

```bash
npm install
npx playwright install chromium
npm run tauri dev
```

Frontend-only UI work:

```bash
npm run generate:css
npm run dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run tauri -- dev` | Desktop app (dev) |
| `npm run build` | CSS + TypeScript + Vite build |
| `npm run test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run worker:render` | CLI render via `worker/index.ts` |

## Layout

```text
src/           React UI (pages, components, lib)
src-tauri/     Tauri / Rust bridge (spawn worker, events)
worker/        Node pipeline (extract → plan → TTS → Remotion)
remotion/      Video templates (1080×1920 / YouTube landscape)
```

Rendered projects land under `./output/`.

## Guidelines

- Prefer small, focused PRs.
- Do not commit API keys, `.env`, or `output/` artifacts.
- Match existing TypeScript / React patterns; keep UI dark corporate aesthetic unless redesigning on purpose.
- After changing Tailwind classes, ensure `npm run generate:css` / build still works.

## License

By contributing, you agree your contributions are licensed under the MIT License.
