# ClipNews

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/cyberjalu/video-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberjalu/video-ai/actions/workflows/ci.yml)

> **Biến bài báo, prompt, hoặc URL sản phẩm thành video TikTok / Reels / Shorts — ngay trên trình duyệt.**

**ClipNews** là web app mã nguồn mở, miễn phí. Chọn template → nhập URL hoặc mô tả chủ đề → AI lập scene plan → chỉnh sửa (nếu muốn) → render MP4 dọc 9:16 (hoặc ngang YouTube).

**BYOK (Bring Your Own Keys):** Bạn tự dán Gemini (bắt buộc) và Pexels (tuỳ chọn) trong Settings. Key chỉ nằm ở trình duyệt / request tạm thời — **server không lưu key xuống đĩa**.

---

## 🎧 Ủng hộ tác giả — Radio English

Đang học tiếng Anh? Thử **[Radio English](https://kaku.io.vn/radio-english)** — app nghe thụ động kiểu radio + luyện nói AI cho người Việt (transcript EN+VI, shadowing, Free Talk).

**Cách ủng hộ dự án ClipNews (và team):**

1. **Tải** app tại [kaku.io.vn/radio-english](https://kaku.io.vn/radio-english) (App Store)
2. **Mua Pro** nếu hợp gu — giúp duy trì sản phẩm miễn phí / OSS
3. **Đánh giá 5★** trên App Store — một review ngắn cũng rất có ích

Cảm ơn bạn đã ủng hộ!

---

## Mục lục

1. [Ủng hộ — Radio English](#-ủng-hộ-tác-giả--radio-english)
2. [Tính năng chính](#tính-năng-chính)
3. [Tech stack](#tech-stack)
4. [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
5. [Luồng tạo video](#luồng-tạo-video)
6. [Các trang & chức năng UI](#các-trang--chức-năng-ui)
7. [Template & preset](#template--preset)
8. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
9. [Cài đặt nhanh](#cài-đặt-nhanh)
10. [Biến môi trường](#biến-môi-trường)
11. [Docker](#docker)
12. [CLI worker](#cli-worker)
13. [Bảo mật & giới hạn](#bảo-mật--giới-hạn)
14. [Scripts phát triển](#scripts-phát-triển)
15. [License](#license)

---

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **Template gallery** | Nhiều phong cách: Neon Glitch, Corporate, Viral Fast Cuts, AI Explainer, YouTube Landscape |
| **URL → video** | Mở bài báo bằng Playwright, extract nội dung, screenshot đoạn phù hợp, lập kịch bản AI |
| **Prompt → video** | Chỉ cần mô tả chủ đề; không bắt buộc có bài báo |
| **Prompt + URL trong text** | Dán `https://…` trong prompt → tự mở trang (tối đa 3), screenshot, gắn vào scene |
| **Review & edit** | Sửa voiceover, caption, layout, callout; upload ảnh/video từng scene trước khi render |
| **Pexels auto-fill** | Scene thiếu media → tự lấy ảnh/video stock (cần Pexels key) |
| **Viral polish** | Preset `viral_30_45`: hook ≤5s, re-hook giữa video, 8–10 scene, progress bar, cut SFX |
| **Discover trends** | Gợi ý chủ đề từ RSS tin tức → 1-click generate với `viral-fast` |
| **Caption pack** | Sau plan: title, mô tả, hashtag, gợi ý giờ đăng (Gemini) |
| **Viral QC** | Heuristic retention (duration, re_hook, hook…) + auto re-plan 1 lần nếu cần |
| **Batch** | Nhiều URL/prompt (CSV hoặc dán list), tối đa 20 item; tải ZIP + `captions.csv` |
| **Download & share** | Tải MP4; link kết quả đọc được đến khi job hết hạn (mặc định 72h) |
| **TikTok publish** | OAuth + đăng video (cần cấu hình TikTok app; user phải confirm trước khi post) |
| **BYOK** | Không tài khoản / không billing; key ở sessionStorage (tuỳ chọn nhớ localStorage) |

---

## Tech stack

### Ứng dụng web (Next.js)

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Framework | **Next.js 15** (App Router) | UI + API routes |
| UI | **React 19**, TypeScript | Trang generate, job, settings… |
| Style | **Tailwind CSS v4**, Framer Motion | Giao diện + animation |
| Validation | **Zod** | Schema input template & plan |
| Icons / fonts | Lucide, Fontsource (Montserrat…) | UI |

### Pipeline render (server / worker)

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Orchestration | **Node.js** + `tsx` | Spawn worker, SSE progress |
| Browser | **Playwright** (Chromium) | Mở URL, extract, screenshot |
| Article parse | **Mozilla Readability** + JSDOM | Lấy nội dung bài sạch |
| AI script | **Google Gemini** (`@google/genai`) | Scene plan, ViralBrief, caption, rewrite |
| TTS | **Gemini TTS** (mặc định) | Voiceover WAV |
| Stock media | **Pexels API** | Ảnh / video b-roll |
| Video compose | **Remotion 4** | Template 9:16 / 16:9 |
| Mux / QC | **ffmpeg / ffprobe** | Audio fit, cut SFX, kiểm tra MP4 |

### Hạ tầng & vận hành

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Job store | Filesystem `data/jobs/{uuid}/` | Plan, assets, events, MP4 |
| Realtime | **SSE** (`events.ndjson` + in-memory bus) | Progress trên UI |
| Auth job | HMAC **job token** (cookie / header) | Chỉ client tạo job mới được sửa/render |
| Rate limit | Next.js middleware | 5 jobs/IP/giờ; 2 batch/IP/ngày |
| Deploy | **Docker** (Node 20 + ffmpeg + Chromium) | Production image |
| CI | GitHub Actions | typecheck, test, build, Docker build |
| Cleanup | Cron / `npm run cleanup:jobs` | Xóa job hết hạn + stuck jobs |

### Cấu trúc thư mục (rút gọn)

```text
src/app/              # Next.js pages + API routes
src/components-web/   # UI (ScenePlanPanel, stepper, preview…)
src/lib-web/          # Client helpers, domain types, session keys
src/server/           # Job store, pipeline bridge, trends, viral, batch, TikTok, security
src/templates/        # Template registry + Zod schemas
remotion/             # Compositions: NewsStoryV1, ViralNewsV1, CorporateNewsV1, YouTubeStoryV1
worker/               # Pipeline monolith (extract → plan → TTS → render → QC)
scripts/              # cleanup-jobs.ts
```

---

## Kiến trúc tổng quan

```text
Browser (BYOK keys)
    │  POST /api/jobs  (+ job token)
    ▼
Next.js API  ──► job store (data/jobs/)
    │              SSE /api/jobs/:id/events
    ▼
Pipeline bridge ──► spawn worker (stdin secrets, không lộ key trên CLI)
    │
    ├─ Playwright: URL / URL-in-prompt → extract + screenshots
    ├─ Gemini: ViralBrief → scene plan → CaptionPack
    ├─ Pexels: fill media trống
    ├─ Gemini TTS → ffmpeg audio fit
    └─ Remotion + ffmpeg → out.mp4
```

**Hai giai đoạn chính**

| Stage | Việc làm | Kết thúc khi |
|---|---|---|
| `plan` | Extract / screenshot / lập kịch bản | UI **awaiting review** (chỉnh plan) |
| `render` | Pexels → TTS → Remotion → QC | MP4 sẵn sàng tải |

CLI có thêm `stage=full` (plan + render liền, không dừng review).

---

## Luồng tạo video

### 1) URL mode (tab URL)

```text
URL → Playwright mở trang → Readability
    → screenshot (headline / lead / fact / …)
    → Gemini lập plan từ nội dung bài
    → gán screenshot vào scene layout=screenshot
    → [review] → render
```

### 2) Prompt mode (không có link)

```text
Prompt → Gemini lập plan → Pexels fill → [review] → render
```

### 3) Prompt + URL trong text (mới)

```text
Prompt chứa https://a.com + https://b.com (≤3)
    → mở từng URL (SSRF-safe)
    → screenshot trang đầu (đoạn bài) + hero các trang sau
    → Gemini plan có ngữ cảnh trang + ưu tiên layout screenshot
    → gán ảnh thật vào scene → [review] → render
```

### 4) Batch

```text
CSV / nhiều dòng URL|prompt → N job tuần tự (viral-fast mặc định)
    → dashboard tiến độ → ZIP MP4 + captions.csv
```

---

## Các trang & chức năng UI

| Đường dẫn | Chức năng |
|---|---|
| `/` | Landing: giới thiệu + template nổi bật + link Discover / Batch / Settings |
| `/templates` | Thư viện template (lọc category, aspect ratio) |
| `/templates/[id]` | Chi tiết template → Use template |
| `/generate/[templateId]` | Form generate: Prompt / URL / Script; URL trong prompt được ghi chú rõ |
| `/jobs/[jobId]` | Progress (SSE), Scene plan editor, Continue to render |
| `/jobs/[jobId]/result` | Preview MP4, download, caption/hashtag, QC score, Publish TikTok |
| `/discover` | Chủ đề trending (RSS) → generate viral-fast |
| `/batch` | Tạo batch (dán URL hoặc upload CSV) |
| `/batch/[batchId]` | Theo dõi % hoàn thành, link từng job, tải ZIP |
| `/settings` | Gemini / Pexels keys, preset, voice, cut SFX, progress bar, remember keys |
| `/recent` | Job & batch gần đây (sessionStorage) |
| `/tiktok` | Connect TikTok + confirm publish |
| `/about` | BYOK, Pexels attribution, chính sách hết hạn job |

### API hữu ích

| Method | Path | Mục đích |
|---|---|---|
| `POST` | `/api/jobs` | Tạo job + bắt đầu plan |
| `GET` | `/api/jobs/:id` | Trạng thái, plan, caption pack, QC |
| `GET` | `/api/jobs/:id/events` | SSE progress (có replay) |
| `PATCH` | `/api/jobs/:id/plan` | Lưu plan đã sửa |
| `POST` | `/api/jobs/:id/render` | Bắt đầu render |
| `POST` | `/api/jobs/:id/cancel` | Huỷ worker |
| `POST` | `/api/jobs/:id/assets` | Upload media scene |
| `GET` | `/api/jobs/:id/download` | Stream MP4 |
| `GET` | `/api/trends` | Danh sách trend |
| `POST` | `/api/batches` | Tạo batch |
| `GET` | `/api/health` | Liveness (ffmpeg, Playwright…) |
| `GET` | `/api/ready` | Readiness (disk + capacity) |
| `GET/POST` | `/api/tiktok/*` | OAuth + publish |

---

## Template & preset

### Templates (`src/templates/registry.ts`)

| ID | Composition | Mặc định | Ghi chú |
|---|---|---|---|
| `tiktok-neon` | `NewsStoryV1` | `ultra_25_35` | Neon / hot take |
| `corporate-brief` | `CorporateNewsV1` | `news_60_80` | Tone chuyên nghiệp |
| `viral-fast` | `ViralNewsV1` | `viral_30_45` | FYP pacing + cut SFX |
| `ai-explainer` | `NewsStoryV1` | `deep_explainer` | Giải thích dài hơn |
| `youtube-landscape` | `YouTubeStoryV1` | `deep_explainer` | 16:9, mode script |

### Render presets

| Preset | Mục tiêu |
|---|---|
| `viral_30_45` | 30–45s, hook ngắn, bắt buộc re-hook, ~8–10 scene |
| `ultra_25_35` | Rất ngắn, dồn dập |
| `news_60_80` | Tin tức vừa phải |
| `deep_explainer` | Giải thích sâu hơn |

### Layout scene Remotion

`screenshot` · `big_callout` · `stat` · `bar_chart` · `broll` · `split`  
Chrome chung: caption theo role, progress bar, cut flash (`SceneChrome`).

---

## Yêu cầu hệ thống

| Công cụ | Ghi chú |
|---|---|
| **Node.js 20+** | Bắt buộc |
| **ffmpeg** & **ffprobe** | Có trên `PATH` |
| **Playwright Chromium** | `npx playwright install chromium` |
| **Gemini API key** | [Google AI Studio](https://aistudio.google.com) |
| **Pexels API key** (tuỳ chọn) | [Pexels API](https://www.pexels.com/api/) |
| **TikTok app** (tuỳ chọn) | Content Posting API — publish |

```bash
# macOS
brew install ffmpeg

# Playwright
npx playwright install chromium
```

---

## Cài đặt nhanh

```bash
git clone https://github.com/cyberjalu/video-ai.git
cd video-ai

cp .env.example .env
# Sửa JOB_TOKEN_SECRET trước khi lên production

npm install
npx playwright install chromium

npm run dev
```

Mở [http://localhost:3000](http://localhost:3000):

1. **Settings** → dán Gemini (+ Pexels nếu có).
2. **Discover** hoặc **Templates** → **Generate**.
3. Có thể dán URL vào prompt (ví dụ trang sản phẩm + GitHub) để screenshot thật.
4. Ở job page: chỉnh plan → **Continue to render**.
5. Result: tải MP4, copy hashtag, hoặc Publish TikTok.

Production:

```bash
npm run build
npm start
```

---

## Biến môi trường

Xem [`.env.example`](.env.example).

| Biến | Mặc định | Mục đích |
|---|---|---|
| `JOB_DATA_DIR` | `./data/jobs` | Thư mục job |
| `JOB_TTL_HOURS` | `72` | Hết hạn job / artifact |
| `MAX_CONCURRENT_RENDERS` | `2` | Giới hạn worker song song |
| `WORKER_PLAN_TIMEOUT_MS` | `180000` | Timeout stage plan (3 phút) |
| `WORKER_RENDER_TIMEOUT_MS` | `600000` | Timeout stage render (10 phút) |
| `JOB_TOKEN_SECRET` | *(đổi ngay)* | Ký token sửa job |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Origin cho phép (dự phòng) |
| `TIKTOK_CLIENT_KEY` | — | TikTok OAuth |
| `TIKTOK_CLIENT_SECRET` | — | TikTok OAuth |
| `TIKTOK_REDIRECT_URI` | — | Callback, vd. `http://localhost:3000/api/tiktok/callback` |
| `GEMINI_API_KEY` | — | Tuỳ chọn cho CLI / health; web dùng BYOK |

Key Gemini/Pexels từ trình duyệt **không** được ghi vào `request.json` trên đĩa.

---

## Docker

```bash
docker build -t clipnews .
docker run -p 3000:3000 \
  -e JOB_TOKEN_SECRET=change-me \
  -e MAX_CONCURRENT_RENDERS=2 \
  -v clipnews-data:/app/data/jobs \
  clipnews
```

Image: Node 20, ffmpeg, Playwright Chromium, user không phải root, `HEALTHCHECK` gọi `/api/ready`.

Dọn job hết hạn:

```bash
npm run cleanup:jobs
# hoặc GitHub Action .github/workflows/cleanup.yml (hourly)
```

---

## CLI worker

Dùng khi debug pipeline không qua UI:

```bash
# Bài báo
npm run worker:render -- \
  --stage full \
  --url "https://www.bbc.com/news/…" \
  --preset viral_30_45 \
  --template ViralNewsV1 \
  --geminiKey "$GEMINI_API_KEY" \
  --pexelsKey "$PEXELS_API_KEY"

# Prompt có URL (tự screenshot)
npm run worker:render -- \
  --stage full \
  --prompt "Giới thiệu tool X: https://example.com và https://github.com/org/repo" \
  --preset viral_30_45 \
  --template ViralNewsV1 \
  --geminiKey "$GEMINI_API_KEY" \
  --pexelsKey "$PEXELS_API_KEY" \
  --outDir ./output/my-job
```

| Flag chính | Ý nghĩa |
|---|---|
| `--stage plan\|render\|full` | Chỉ plan / chỉ render / cả hai |
| `--url` | Article mode |
| `--prompt` | Prompt mode (+ URL trong text nếu có) |
| `--preset` | `viral_30_45` / `ultra_25_35` / … |
| `--template` | `ViralNewsV1` / `NewsStoryV1` / … |
| `--tts gemini` | Provider TTS |
| `--enableCutSfx true` | Whoosh giữa scene |

Output mặc định: `output/<timestamp>__…/render/out.mp4`.

---

## Bảo mật & giới hạn

| Cơ chế | Chi tiết |
|---|---|
| **SSRF** | Chặn private IP / metadata / non-http(s) trước khi fetch URL |
| **Job token** | HMAC; cần token mới PATCH plan / render / cancel / upload |
| **Keys** | Qua stdin worker, không đưa lên argv; không lưu trong `request.json` |
| **Path safety** | `jobId` phải UUID; `sceneId` / extension allowlist |
| **Rate limit** | 5 tạo job / IP / giờ; 2 batch / IP / ngày; publish TikTok ≤5 / ngày / account |
| **Cancel** | SIGTERM worker thật (không chỉ đổi status) |
| **TTL** | Job hết hạn bị cleanup |

**Lưu ý:** Không đảm bảo video “viral” về view — chỉ tối ưu cấu trúc retention + caption. Batch lớn tốn quota Gemini của bạn (BYOK).

---

## Scripts phát triển

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Next.js dev |
| `npm run build` / `npm start` | Production |
| `npm test` | Vitest (domain) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run worker:render` | CLI pipeline |
| `npm run cleanup:jobs` | Xóa job hết hạn + reap stuck |

Đóng góp: xem [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — xem [LICENSE](LICENSE).
