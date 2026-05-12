# URL → Video TikTok (Tauri demo)

Bản demo local-only: dán URL bài viết → trích nội dung + chụp screenshot → tạo kịch bản tiếng Việt + **TTS bằng Gemini Speech API** → render MP4 dọc 1080×1920 bằng **Remotion** (caption dùng **Montserrat**).

## Yêu cầu
- Node.js 20+
- ffmpeg
- Gemini API key: `GEMINI_API_KEY`

## Chạy render nhanh (CLI)
```bash
cd url-to-tiktok-video-tauri
export GEMINI_API_KEY="YOUR_KEY"
npm run worker:render -- --url "https://openai.com/index/gpt-5-5-with-trusted-access-for-cyber/"
```

Output sẽ nằm trong: `output/<timestamp>__<slug>/render/out.mp4` và kèm artifacts:
- `article/article.json`, `article/raw.html`
- `screenshots/*.png`
- `plan/video_plan.json`
- `tts/voiceover.wav`
- `qc/ffprobe.json`, `qc/thumb.png`, `qc/review_notes.md`

## Chạy app Tauri (UI)
```bash
cd url-to-tiktok-video-tauri
. "$HOME/.cargo/env"   # nếu rustc/cargo chưa có trong PATH
npm install
npm run tauri dev
```

Trong UI:
- bấm **Settings** → nhập `GEMINI_API_KEY` (lưu local)
- dán URL → bấm **Render** để chạy pipeline (log hiện ở khung Log).

## Gemini TTS dùng gì?
- JS SDK: `@google/genai`
- Model: `gemini-3.1-flash-tts-preview`
- `responseModalities: ["AUDIO"]`
- `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName: "Charon"` (có thể đổi)

Tham khảo: https://ai.google.dev/gemini-api/docs/speech-generation

