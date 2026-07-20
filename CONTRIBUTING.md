# Contributing to ClipNews

ClipNews is a free, open-source web app that turns article URLs (or prompts) into short-form videos. Thanks for helping improve it.

## Prerequisites

- **Node.js** 20+
- **ffmpeg** and **ffprobe** on your `PATH`
- **Playwright Chromium**: `npx playwright install chromium`
- A [Gemini API key](https://aistudio.google.com) (optional: [Pexels](https://www.pexels.com/api/) for B-roll)

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and add API keys under **Settings**.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run worker:render` | CLI render via `worker/index.ts` |
| `npm run cleanup:jobs` | Remove expired jobs from `data/jobs/` |

## Layout

```text
src/app/           Next.js App Router pages and API routes
src/components-web/  React UI components
src/lib-web/       Client helpers and domain types
src/server/        Job store, SSE, pipeline orchestration
src/templates/     Template registry and Zod schemas
worker/            Node pipeline (extract → plan → TTS → Remotion)
remotion/          Video templates (1080×1920 / YouTube landscape)
```

Job artifacts are stored under `data/jobs/` (configurable via `JOB_DATA_DIR`).

## Guidelines

- Prefer small, focused PRs.
- Do not commit API keys, `.env`, or `data/jobs/` artifacts.
- Match existing TypeScript / React patterns.
- After changing Tailwind classes, ensure `npm run generate:css` / build still works.

## License

By contributing, you agree your contributions are licensed under the MIT License.
