import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import wav from "wav";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { execFile } from "node:child_process";
import { extractHttpUrls } from "../src/lib-web/domain/urls.ts";

const execFileP = (file: string, args: string[]) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout, stderr });
    });
  });

async function getAudioDurationSec(filePath: string): Promise<number> {
  const probe = await execFileP("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const json = JSON.parse(probe.stdout);
  return parseFloat(json.format.duration);
}

async function planVideoFromScriptWithGemini(script: string, durationSec: number, geminiKey: string, prefs: any): Promise<VideoPlan> {
  emit({ type: "step_start", step: "plan" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  
  const prompt = `Bạn là đạo diễn video TikTok tin tức 9:16 (news explainer).
Nhiệm vụ: phân tích kịch bản và chia thành các cảnh visual đa dạng (KHÔNG chỉ b-roll).
Tổng thời lượng đúng ${durationSec.toFixed(1)} giây. Phân bổ duration_sec tỷ lệ với độ dài thoại; TỔNG ≈ ${Math.round(durationSec)} giây.

Kịch bản gốc (Script):
"""
${script}
"""

Yêu cầu output JSON (KHÔNG CÓ MARKDOWN):
{
  "title": "Tiêu đề ngắn",
  "target_duration_sec": ${Math.round(durationSec)},
  "scenes": [
    {
      "id": "s1",
      "role": "hook",
      "duration_sec": 8,
      "caption_lines": ["Dòng 1", "Dòng 2"],
      "voiceover": "Câu nói tương ứng trong kịch bản",
      "layout": "stat",
      "stat": { "value": "10/10", "label": "công ty công nghệ dùng AI" },
      "callouts": ["10/10 dùng AI"],
      "pexels_query": "office technology"
    }
  ]
}

Quy tắc:
- duration_sec PHẢI là số nguyên 3–12 (không thập phân).
- layout được phép: screenshot|big_callout|stat|bar_chart|broll|split.
- hook/impact/takeaway → ưu tiên stat hoặc big_callout.
- evidence → ưu tiên screenshot hoặc bar_chart (kèm chart.bars từ số trong script, không bịa).
- Không bắt buộc mọi cảnh là broll.
- Mọi scene không phải big_callout phải có pexels_query (1-3 từ khóa tiếng Anh).
- caption_lines: từ khóa phụ đề ngắn.
- voiceover: Lấy CHÍNH XÁC lời thoại từ kịch bản. KHÔNG ĐƯỢC BỊA/SỬA LỜI THOẠI.`;

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await ai.models.generateContent({
      model: prefs.contentModel || "gemini-3.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    try {
      const parsed = parsePlanFromModelOutput(res.text ?? "");
      const plan = normalizePlan(parsed, prefs);
      // Force match duration
      const total = plan.scenes.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);
      if (total > 0 && Math.abs(total - durationSec) > 2) {
        const factor = durationSec / total;
        plan.scenes.forEach(s => {
          s.duration_sec = Math.round((s.duration_sec ?? 0) * factor);
        });
      }
      
      emit({
        type: "step_done",
        step: "plan",
        scenes: plan.scenes.length,
        target: plan.target_duration_sec,
        attempt,
        plan,
      });
      return plan;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      emit({ type: "log", step: "plan", message: `Plan parse retry ${attempt}: ${lastError}` });
    }
  }
  throw new Error("Không thể tạo plan sau 2 lần thử: " + lastError);
}

const ArgsSchema = z.object({
  url: z.string().url().optional(),
  prompt: z.string().optional(),
  audioPath: z.string().optional(),
  script: z.string().optional(),
  platform: z.enum(["youtube", "tiktok"]).optional(),
  geminiKey: z.string().optional(),
  openaiKey: z.string().optional(),
  pexelsKey: z.string().optional(),
  planFile: z.string().optional(),
  projectDir: z.string().optional(),
  stage: z.enum(["plan", "render", "full"]).optional(),
  tts: z.enum(["gemini", "openai", "macos"]).optional(),
  outDir: z.string().optional(),
  preset: z.enum(["deep_explainer", "news_60_80", "ultra_25_35", "viral_30_45"]).optional(),
  template: z.string().optional(),
  layoutMode: z.enum(["tri", "dual", "mono"]).optional(),
  enableCallouts: z.boolean().optional(),
  enableProgress: z.boolean().optional(),
  enableCutSfx: z.boolean().optional(),
  voice: z.string().optional(),
  contentModel: z.string().optional(),
  audioModel: z.string().optional(),
  assetsDir: z.string().optional(),
  viralBrief: z.string().optional(),
  configStdin: z.boolean().optional(),
});

type SceneRole =
  | "hook"
  | "re_hook"
  | "why_matters"
  | "what_happened"
  | "evidence"
  | "context"
  | "impact"
  | "takeaway";

type SceneLayout = "screenshot" | "big_callout" | "split" | "broll" | "stat" | "bar_chart";
type RenderPreset = "deep_explainer" | "news_60_80" | "ultra_25_35" | "viral_30_45";
type LayoutMode = "tri" | "dual" | "mono";

type RenderPrefs = {
  preset: RenderPreset;
  template: string;
  layoutMode: LayoutMode;
  enableCallouts: boolean;
  enableProgress: boolean;
  enableCutSfx: boolean;
  contentModel?: string;
  audioModel?: string;
};

const StatSchema = z.object({
  value: z.string(),
  label: z.string(),
  delta: z.string().optional(),
});

const ChartSchema = z.object({
  title: z.string().optional(),
  bars: z
    .array(
      z.object({
        label: z.string(),
        value: z.coerce.number(),
      }),
    )
    .min(1)
    .max(5),
});

const VideoPlanSchema = z.object({
  title: z.string(),
  target_duration_sec: z.coerce
    .number()
    .transform((n) => Math.round(Number(n)))
    .pipe(z.number().int().min(20).max(180)),
  audio_prompt: z.string().optional(),
  scenes: z
    .array(
      z.object({
        id: z.string(),
        role: z.custom<SceneRole>(),
        duration_sec: z.coerce
          .number()
          .transform((n) => Math.max(3, Math.min(12, Math.round(Number(n)))))
          .pipe(z.number().int().min(3).max(12)),
        caption_lines: z.array(z.string()).min(1).max(2),
        voiceover: z.string(),
        layout: z.enum(["screenshot", "big_callout", "split", "broll", "stat", "bar_chart"]).optional(),
        callouts: z.array(z.string()).max(2).optional(),
        screenshot_path: z.string().optional(),
        screenshot_file: z.string().optional(),
        image_fit: z.enum(["cover", "contain"]).optional(),
        pexels_query: z.string().optional(),
        pexels_credit: z.string().optional(),
        pexels_url: z.string().optional(),
        broll_path: z.string().optional(),
        caption_emphasis: z.array(z.string()).max(3).optional(),
        interrupt_strength: z.enum(["normal", "strong"]).optional(),
        stat: StatSchema.optional(),
        chart: ChartSchema.optional(),
      }),
    )
    .min(4)
    .max(12),
});

type VideoPlan = z.infer<typeof VideoPlanSchema>;

async function fileToDataUrl(filePath: string, mime: string) {
  const buf = await fs.readFile(filePath);
  const b64 = buf.toString("base64");
  return `data:${mime};base64,${b64}`;
}

function parseBool(value: string | undefined) {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return undefined;
}

async function readStdinSecrets(): Promise<{ geminiKey?: string; pexelsKey?: string; openaiKey?: string }> {
  if (!process.stdin.readable || process.stdin.isTTY) return {};
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as {
      geminiKey?: string;
      pexelsKey?: string;
      openaiKey?: string;
    };
  } catch {
    return {};
  }
}

async function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const v = argv[i + 1];
    out[key] = v;
    i++;
  }

  const useStdin = parseBool(out.configStdin);
  const secrets = useStdin ? await readStdinSecrets() : {};

  return ArgsSchema.parse({
    url: out.url,
    prompt: out.prompt,
    audioPath: out.audioPath,
    script: out.script,
    platform: out.platform as any,
    // Prefer stdin secrets; never require CLI keys when configStdin=1
    geminiKey: secrets.geminiKey ?? (useStdin ? undefined : out.geminiKey) ?? process.env.GEMINI_API_KEY,
    openaiKey: secrets.openaiKey ?? (useStdin ? undefined : out.openaiKey) ?? process.env.OPENAI_API_KEY,
    pexelsKey: secrets.pexelsKey ?? (useStdin ? undefined : out.pexelsKey) ?? process.env.PEXELS_API_KEY,
    planFile: out.planFile,
    projectDir: out.projectDir,
    stage: (out.stage as "plan" | "render" | "full" | undefined) ?? "full",
    tts: out.tts as "gemini" | "openai" | "macos" | undefined,
    outDir: out.outDir,
    preset: out.preset as RenderPreset | undefined,
    template: out.template,
    layoutMode: out.layoutMode as LayoutMode | undefined,
    enableCallouts: parseBool(out.enableCallouts),
    enableProgress: parseBool(out.enableProgress),
    enableCutSfx: parseBool(out.enableCutSfx),
    voice: out.voice,
    contentModel: out.contentModel,
    audioModel: out.audioModel,
    assetsDir: out.assetsDir,
    viralBrief: out.viralBrief,
    configStdin: useStdin,
  });
}

function toRenderPrefs(args: z.infer<typeof ArgsSchema>): RenderPrefs {
  return {
    preset: args.preset ?? "deep_explainer",
    template: args.template ?? "NewsStoryV1",
    layoutMode: args.layoutMode ?? "tri",
    enableCallouts: args.enableCallouts ?? true,
    enableProgress: args.enableProgress ?? true,
    enableCutSfx: args.enableCutSfx ?? false,
    contentModel: args.contentModel,
    audioModel: args.audioModel,
  };
}

async function assertBinOnPath(bin: string) {
  try {
    await execFileP(bin, ["-version"]);
  } catch {
    const tip =
      process.platform === "win32"
        ? "Install with Scoop (`scoop install ffmpeg`) or Chocolatey, then reopen the terminal."
        : "Install with Homebrew (`brew install ffmpeg`), then reopen the terminal.";
    throw new Error(`Missing required binary "${bin}" on PATH. ${tip}`);
  }
}

async function preflightTools() {
  await assertBinOnPath("ffmpeg");
  await assertBinOnPath("ffprobe");
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      emit({
        type: "log",
        message: `${label} failed (attempt ${i}/${attempts}): ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function emit(event: unknown) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(p: string, v: unknown) {
  await fs.writeFile(p, JSON.stringify(v, null, 2), "utf-8");
}

async function fetchPexelsVideo(
  query: string,
  pexelsKey: string,
  outPath: string,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<{ path: string; credit: string; url: string }> {
  const url = `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`;
  const response = await fetch(url, {
    headers: {
      Authorization: pexelsKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Pexels API error: HTTP ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as any;
  const video = data?.videos?.[0];
  if (!video) {
    throw new Error(`No videos found on Pexels for query: "${query}"`);
  }

  const videoFiles = video.video_files || [];
  const mp4Files = videoFiles.filter((f: any) => f.file_type === "video/mp4" || f.link?.includes(".mp4"));
  if (mp4Files.length === 0) {
    throw new Error(`No mp4 files found for Pexels video: ${video.id}`);
  }

  const hdFile = mp4Files.find((f: any) => f.quality === "hd");
  const chosenFile = hdFile || mp4Files[0];
  const downloadUrl = chosenFile.link;

  const videoRes = await fetch(downloadUrl);
  if (!videoRes.ok) {
    throw new Error(`Failed to download Pexels video: HTTP ${videoRes.status}`);
  }

  const arrayBuffer = await videoRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, buffer);

  const user = video.user?.name ?? "Pexels";
  const pageUrl = video.url ?? `https://www.pexels.com/video/${video.id}/`;
  return {
    path: outPath,
    credit: `Video by ${user} on Pexels`,
    url: pageUrl,
  };
}

async function fetchPexelsPhoto(
  query: string,
  pexelsKey: string,
  outPath: string,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<{ path: string; credit: string; url: string }> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`;
  const response = await fetch(url, {
    headers: {
      Authorization: pexelsKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Pexels Photos API error: HTTP ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as any;
  const photo = data?.photos?.[0];
  if (!photo) {
    throw new Error(`No photos found on Pexels for query: "${query}"`);
  }

  const downloadUrl =
    orientation === "portrait"
      ? photo.src?.portrait || photo.src?.large2x || photo.src?.large || photo.src?.original
      : photo.src?.landscape || photo.src?.large2x || photo.src?.large || photo.src?.original;
  if (!downloadUrl) {
    throw new Error(`Pexels photo missing src for id ${photo.id}`);
  }

  const imgRes = await fetch(downloadUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download Pexels photo: HTTP ${imgRes.status}`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, buffer);

  const photographer = photo.photographer ?? "Pexels";
  const pageUrl = photo.url ?? `https://www.pexels.com/photo/${photo.id}/`;
  return {
    path: outPath,
    credit: `Photo by ${photographer} on Pexels`,
    url: pageUrl,
  };
}

const PHOTO_LAYOUTS = new Set(["screenshot", "split", "stat"]);

async function autoFillPexelsAssets(
  plan: VideoPlan,
  pexelsKey: string | undefined,
  projectDir: string,
  orientation: "portrait" | "landscape",
): Promise<VideoPlan> {
  const pexelsDir = path.join(projectDir, "pexels");
  await ensureDir(pexelsDir);

  const scenes = [];
  for (const scene of plan.scenes) {
    const layout = scene.layout ?? "big_callout";
    const hasUserShot = Boolean(scene.screenshot_path);
    const hasUserBroll = Boolean(scene.broll_path);
    const query = scene.pexels_query?.trim();

    if (layout === "broll") {
      if (hasUserBroll) {
        scenes.push(scene);
        continue;
      }
      if (!query || !pexelsKey) {
        emit({
          type: "log",
          step: "fetch_broll",
          message: !pexelsKey
            ? `Scene ${scene.id}: no Pexels key — fallback broll → big_callout`
            : `Scene ${scene.id}: missing pexels_query — fallback broll → big_callout`,
        });
        scenes.push({ ...scene, layout: "big_callout" as const });
        continue;
      }
      const outPath = path.join(pexelsDir, `${scene.id}.mp4`);
      try {
        emit({ type: "log", step: "fetch_broll", message: `Fetching Pexels video for ${scene.id}: "${query}"` });
        const result = await fetchPexelsVideo(query, pexelsKey, outPath, orientation);
        scenes.push({
          ...scene,
          broll_path: result.path,
          pexels_credit: result.credit,
          pexels_url: result.url,
        });
      } catch (e) {
        emit({
          type: "log",
          step: "fetch_broll",
          message: `Pexels video failed for ${scene.id}: ${e instanceof Error ? e.message : String(e)}. Fallback to big_callout.`,
        });
        scenes.push({ ...scene, layout: "big_callout" as const });
      }
      continue;
    }

    if (PHOTO_LAYOUTS.has(layout) && !hasUserShot && query && pexelsKey) {
      const outPath = path.join(pexelsDir, `${scene.id}.jpg`);
      try {
        emit({ type: "log", step: "fetch_broll", message: `Fetching Pexels photo for ${scene.id}: "${query}"` });
        const result = await fetchPexelsPhoto(query, pexelsKey, outPath, orientation);
        scenes.push({
          ...scene,
          screenshot_path: result.path,
          image_fit: scene.image_fit ?? ("cover" as const),
          pexels_credit: result.credit,
          pexels_url: result.url,
          layout: layout === "stat" ? layout : layout === "split" ? layout : "screenshot",
        });
      } catch (e) {
        emit({
          type: "log",
          step: "fetch_broll",
          message: `Pexels photo failed for ${scene.id}: ${e instanceof Error ? e.message : String(e)}`,
        });
        scenes.push(scene);
      }
      continue;
    }

    scenes.push(scene);
  }

  return { ...plan, scenes };
}

async function resolveUserAssetsFolder(plan: VideoPlan, projectDir: string): Promise<VideoPlan> {
  const userAssets = path.join(projectDir, "user_assets");
  try {
    await fs.access(userAssets);
  } catch {
    return plan;
  }

  const entries = await fs.readdir(userAssets);
  const byStem = new Map<string, string>();
  for (const name of entries) {
    const stem = path.parse(name).name;
    byStem.set(stem, path.join(userAssets, name));
  }

  const imageExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
  const videoExt = new Set([".mp4", ".webm", ".mov", ".mkv"]);

  const scenes = plan.scenes.map((scene) => {
    const file = byStem.get(scene.id);
    if (!file) return scene;
    const ext = path.extname(file).toLowerCase();
    if (videoExt.has(ext)) {
      return {
        ...scene,
        broll_path: file,
        layout: "broll" as const,
      };
    }
    if (imageExt.has(ext)) {
      return {
        ...scene,
        screenshot_path: file,
        image_fit: scene.image_fit ?? ("cover" as const),
        layout:
          scene.layout === "broll" || scene.layout === "stat" || scene.layout === "bar_chart" || scene.layout === "big_callout"
            ? scene.layout === "broll"
              ? ("screenshot" as const)
              : scene.layout
            : scene.layout ?? ("screenshot" as const),
      };
    }
    return scene;
  });

  return { ...plan, scenes };
}

async function findExistingVoiceover(projectDir: string): Promise<string | null> {
  const ttsDir = path.join(projectDir, "tts");
  const candidates = ["voiceover.wav", "voiceover.raw.wav"];
  for (const name of candidates) {
    const p = path.join(ttsDir, name);
    try {
      await fs.access(p);
      return p;
    } catch {
      /* continue */
    }
  }
  try {
    const entries = await fs.readdir(ttsDir);
    const wav = entries.find((e) => /^voiceover.*\.wav$/i.test(e));
    if (wav) return path.join(ttsDir, wav);
  } catch {
    /* none */
  }
  return null;
}

function voiceoverFingerprint(plan: VideoPlan): string {
  return plan.scenes.map((s) => s.voiceover.trim()).join("\n");
}

async function voiceoverCacheMatchesPlan(projectDir: string, plan: VideoPlan): Promise<boolean> {
  const fingerprintPath = path.join(projectDir, "tts", "voiceover.source.txt");
  try {
    const saved = await fs.readFile(fingerprintPath, "utf-8");
    return saved === voiceoverFingerprint(plan);
  } catch {
    // Legacy caches without fingerprint: allow reuse (UI clears wavs on script edit).
    return true;
  }
}

async function writeVoiceoverFingerprint(projectDir: string, plan: VideoPlan) {
  await ensureDir(path.join(projectDir, "tts"));
  await fs.writeFile(
    path.join(projectDir, "tts", "voiceover.source.txt"),
    voiceoverFingerprint(plan),
    "utf-8",
  );
}

async function assertSafePublicUrl(raw: string) {
  const { lookup } = await import("node:dns/promises");
  const net = await import("node:net");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blocked = new Set(["localhost", "metadata.google.internal", "169.254.169.254"]);
  if (blocked.has(host)) throw new Error("URL host is not allowed");
  const isPrivate = (ip: string) => {
    if (net.isIP(ip) === 4) {
      const [a, b] = ip.split(".").map(Number);
      return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    }
    if (net.isIP(ip) === 6) {
      const n = ip.toLowerCase();
      return n === "::1" || n.startsWith("fc") || n.startsWith("fd") || n.startsWith("fe80");
    }
    return true;
  };
  if (net.isIP(host)) {
    if (isPrivate(host)) throw new Error("Private IP addresses are not allowed");
    return url;
  }
  const result = await lookup(host, { all: true });
  if (!result.length || result.some((r) => isPrivate(r.address))) {
    throw new Error("URL resolves to a private or blocked address");
  }
  return url;
}

async function extractArticle(url: string, projectDir: string) {
  emit({ type: "step_start", step: "extract" });
  await assertSafePublicUrl(url);

  const fetchHtml = async () => {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      },
    });
    const html = await res.text();
    return { status: res.status, html };
  };

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  await context.addInitScript(() => {
    // @ts-expect-error - override webdriver flag
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  // Nhiều site chặn headless (403): ưu tiên fetch + setContent; SPA nghèo nội dung → fallback page.goto.
  let usedGoto = false;
  let html = "";
  try {
    const fetched = await withRetry("Article HTML fetch", fetchHtml, 2);
    html = fetched.html;
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 120_000 });
  } catch {
    usedGoto = true;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  }
  await page.waitForSelector("h1", { timeout: 30_000, state: "attached" }).catch(() => {});
  await page.waitForSelector("p", { timeout: 30_000, state: "attached" }).catch(() => {});
  await page.waitForTimeout(800);

  const pProbe = await page.locator("article p, main p, body p").count().catch(() => 0);
  if (!usedGoto && pProbe < 2) {
    emit({ type: "log", step: "extract", message: "Ít paragraph sau setContent — thử page.goto cho SPA." });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    usedGoto = true;
  }

  const cookieButtons = [
    "button:has-text('Accept')",
    "button:has-text('I agree')",
    "button:has-text('Đồng ý')",
    "button:has-text('Chấp nhận')",
  ];
  for (const sel of cookieButtons) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.count()) {
        await btn.click({ timeout: 800 });
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!html || usedGoto) {
    html = await page.content();
  }
  const domForTitle = new JSDOM(html, { url });
  const title =
    (await page.locator("h1").first().innerText().catch(() => ""))?.trim() ||
    domForTitle.window.document.querySelector("h1")?.textContent?.trim() ||
    domForTitle.window.document.querySelector("title")?.textContent?.trim() ||
    "";

  const rawHtmlPath = path.join(projectDir, "article", "raw.html");
  await ensureDir(path.dirname(rawHtmlPath));
  await fs.writeFile(rawHtmlPath, html, "utf-8");

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const text = (article?.textContent ?? "").trim() || (await page.locator("body").innerText().catch(() => "")).slice(0, 20_000);
  const excerpt = (article?.excerpt ?? "").trim();

  const rootCandidates = ["article", "main", ".cntn-wrp.artl-cnt", ".cntn-wrp", "body"];
  let articleRoot = "body";
  for (const cand of rootCandidates) {
    try {
      const count = await page.locator(`${cand} p`).count();
      if (count > 0) {
        articleRoot = cand;
        break;
      }
    } catch {
      // ignore
    }
  }

  const pLocators = page.locator(`${articleRoot} p`);
  const pCount = await pLocators.count();
  const paragraphs: { id: string; index: number; root: string; text: string }[] = [];
  for (let i = 0; i < Math.min(pCount, 60); i++) {
    const t = (await pLocators.nth(i).innerText().catch(() => "")).trim();
    if (!t) continue;
    paragraphs.push({
      id: `p_${String(i + 1).padStart(2, "0")}`,
      index: i,
      root: articleRoot,
      text: t,
    });
  }

  const articleJson = {
    url,
    title,
    excerpt,
    word_count: text ? text.split(/\s+/).length : 0,
    text,
    paragraphs,
  };
  await writeJson(path.join(projectDir, "article", "article.json"), articleJson);
  emit({ type: "step_done", step: "extract", title, paragraph_count: paragraphs.length });

  return { browser, page, articleJson };
}

function pickScreenshotParagraphs(paragraphs: { id: string; index: number; root: string; text: string }[]) {
  const longParas = paragraphs.filter((p) => p.text.length >= 80);
  const lead = longParas[0] ?? paragraphs[0];

  const hasNumber = (s: string) => /\d/.test(s);
  const scored = paragraphs
    .map((p, idx) => {
      const score =
        (hasNumber(p.text) ? 3 : 0) +
        (p.text.length >= 140 ? 1 : 0) +
        (idx > paragraphs.length * 0.6 ? 0.5 : 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const fact = scored[0]?.p ?? lead;
  const context = paragraphs[Math.min(Math.floor(paragraphs.length * 0.35), paragraphs.length - 1)];
  const impact = paragraphs[Math.min(Math.floor(paragraphs.length * 0.75), paragraphs.length - 1)];
  const close = paragraphs.at(-1) ?? impact;

  const uniqueById = new Map<string, { id: string; index: number; root: string; text: string }>();
  for (const p of [lead, fact, context, impact, close]) uniqueById.set(p.id, p);
  return {
    headline: "h1",
    lead: uniqueById.get(lead.id)!,
    fact: uniqueById.get(fact.id)!,
    context: uniqueById.get(context?.id ?? lead.id)!,
    impact: uniqueById.get(impact?.id ?? lead.id)!,
    close: uniqueById.get(close?.id ?? lead.id)!,
  };
}

/** Reject thin element crops / near-empty PNGs that look zoomed or black on 9:16. */
async function pngLooksUsable(filePath: string): Promise<boolean> {
  try {
    const st = await fs.stat(filePath);
    if (st.size < 12_000) return false;
    const fh = await fs.open(filePath, "r");
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    await fh.close();
    if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return st.size >= 12_000;
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w < 320 || h < 240) return false;
    // Extreme wide strips (e.g. single <p> crops) cause cover-zoom artefacts.
    if (h / w < 0.25) return false;
    return true;
  } catch {
    return false;
  }
}

async function captureViewport(
  page: import("playwright").Page,
  filePath: string,
): Promise<void> {
  await page.screenshot({ path: filePath, fullPage: false, type: "png" });
}

/** Scroll target into view, then capture full viewport (readable page context). */
async function captureViewportAround(
  page: import("playwright").Page,
  locator: import("playwright").Locator,
  filePath: string,
  fallbackPath?: string,
): Promise<void> {
  try {
    await locator.first().scrollIntoViewIfNeeded({ timeout: 5_000 });
    await page.evaluate(() => {
      const nudge = Math.floor(window.innerHeight * 0.22);
      window.scrollBy(0, -nudge);
    });
    await page.waitForTimeout(180);
    await captureViewport(page, filePath);
    if (await pngLooksUsable(filePath)) return;
  } catch {
    /* fall through */
  }
  if (fallbackPath) {
    try {
      await fs.copyFile(fallbackPath, filePath);
      return;
    } catch {
      /* fall through */
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  await captureViewport(page, filePath);
}

async function captureScreenshots(
  page: import("playwright").Page,
  projectDir: string,
  paragraphs: { id: string; index: number; root: string; text: string }[],
) {
  emit({ type: "step_start", step: "screenshot" });
  const outDir = path.join(projectDir, "screenshots");
  await ensureDir(outDir);

  if (paragraphs.length === 0) {
    const fallbackPath = path.join(outDir, "headline.png");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await captureViewport(page, fallbackPath);
    const names = ["lead", "fact", "context", "impact", "close"] as const;
    const meta: Record<string, unknown> = {
      headline: { selector: "body", path: fallbackPath },
    };
    for (const name of names) {
      const filePath = path.join(outDir, `${name}.png`);
      await fs.copyFile(fallbackPath, filePath);
      meta[name] = {
        id: `fallback_${name}`,
        index: 0,
        root: "body",
        text: "",
        path: filePath,
      };
    }
    await writeJson(path.join(outDir, "screenshots_meta.json"), meta);
    emit({ type: "step_done", step: "screenshot", files: Object.keys(meta).length, fallback: true });
    return meta as Record<string, { path: string }>;
  }

  const picks = pickScreenshotParagraphs(paragraphs);
  const meta: Record<string, unknown> = {};

  const headlinePath = path.join(outDir, "headline.png");
  // Prefer above-the-fold hero (full viewport) over a tiny heading element crop.
  try {
    const headlineLoc = page.locator(picks.headline).first();
    if ((await headlineLoc.count()) > 0) {
      await captureViewportAround(page, headlineLoc, headlinePath);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      await captureViewport(page, headlinePath);
    }
  } catch {
    await page.evaluate(() => window.scrollTo(0, 0));
    await captureViewport(page, headlinePath);
  }
  meta.headline = { selector: picks.headline, path: headlinePath };

  const shot = async (name: string, p: { id: string; index: number; root: string; text: string }) => {
    const filePath = path.join(outDir, `${name}.png`);
    const loc = page.locator(`${p.root} p`).nth(p.index);
    await captureViewportAround(page, loc, filePath, headlinePath);
    meta[name] = { ...p, path: filePath };
    return filePath;
  };

  await shot("lead", picks.lead);
  await shot("fact", picks.fact);
  await shot("context", picks.context);
  await shot("impact", picks.impact);
  await shot("close", picks.close);

  await writeJson(path.join(outDir, "screenshots_meta.json"), meta);
  emit({ type: "step_done", step: "screenshot", files: Object.keys(meta).length });
  return meta as Record<string, { path: string }>;
}

/** Extra URLs from a prompt: hero + headline shots on the same browser. */
async function captureSiteHero(
  browser: import("playwright").Browser,
  url: string,
  projectDir: string,
  slotPrefix: string,
): Promise<Record<string, { path: string }>> {
  await assertSafePublicUrl(url);
  emit({ type: "log", step: "screenshot", message: `Capturing extra site ${url}` });
  const context =
    browser.contexts()[0] ??
    (await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    }));
  const page = await context.newPage();
  const outDir = path.join(projectDir, "screenshots");
  await ensureDir(outDir);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1000);
    const heroPath = path.join(outDir, `${slotPrefix}_hero.png`);
    const headlinePath = path.join(outDir, `${slotPrefix}_headline.png`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await captureViewport(page, heroPath);
    try {
      const h1 = page.locator("h1").first();
      if ((await h1.count()) > 0) {
        await captureViewportAround(page, h1, headlinePath, heroPath);
      } else {
        await fs.copyFile(heroPath, headlinePath);
      }
    } catch {
      await fs.copyFile(heroPath, headlinePath);
    }
    return {
      [slotPrefix]: { path: heroPath },
      [`${slotPrefix}_headline`]: { path: headlinePath },
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

function getLayoutCycle(mode: LayoutMode): SceneLayout[] {
  if (mode === "mono") return ["screenshot", "stat", "big_callout"];
  if (mode === "dual") return ["screenshot", "big_callout", "stat", "bar_chart"];
  return ["screenshot", "big_callout", "bar_chart", "broll"];
}

function fallbackCallouts(lines: string[]) {
  const merged = lines.join(" • ").replace(/\s+/g, " ").trim();
  if (!merged) return [];
  return [merged.slice(0, 42)];
}

function normalizePlan(plan: VideoPlan, prefs: RenderPrefs) {
  const cycle = getLayoutCycle(prefs.layoutMode);
  const normalizedScenes = plan.scenes.map((scene, index) => {
    let layout: SceneLayout = (scene.layout as SceneLayout | undefined) ?? cycle[index % cycle.length];
    let stat = scene.stat;
    let chart = scene.chart;
    let image_fit = scene.image_fit;
    let duration_sec = scene.duration_sec;
    let interrupt_strength = scene.interrupt_strength;

    if (scene.role === "re_hook") {
      interrupt_strength = "strong";
    }

    if (layout === "stat" && !stat?.value) {
      const raw = scene.callouts?.[0]?.trim() || scene.caption_lines[0]?.trim();
      if (raw) {
        stat = {
          value: raw.slice(0, 18),
          label: (scene.caption_lines[1] || scene.caption_lines[0] || "Key point").slice(0, 80),
        };
      } else {
        layout = "big_callout";
      }
    } else if (layout === "bar_chart" && (!chart?.bars || chart.bars.length === 0)) {
      if (stat?.value) {
        layout = "stat";
      } else {
        layout = "big_callout";
        chart = undefined;
      }
    }

    if (layout === "screenshot" && !image_fit) {
      // Web screenshots + product UI → contain (cover zooms thin crops). Photos can still set cover.
      const p = (scene.screenshot_path || scene.screenshot_file || "").toLowerCase();
      image_fit =
        p.endsWith(".jpg") || p.endsWith(".jpeg") || p.includes("pexels") ? "cover" : "contain";
    }

    if (scene.role === "hook") {
      duration_sec = Math.min(duration_sec, 5);
      if (
        layout === "screenshot" &&
        !scene.screenshot_path &&
        !scene.screenshot_file &&
        !scene.broll_path
      ) {
        layout = stat?.value ? "stat" : "big_callout";
      }
    }

    if (prefs.preset === "ultra_25_35" && scene.role === "hook") {
      duration_sec = Math.min(duration_sec, 5);
      if (layout === "screenshot" && !scene.screenshot_path && !scene.broll_path) {
        layout = stat?.value ? "stat" : "big_callout";
      }
    }

    const callouts = prefs.enableCallouts
      ? (scene.callouts?.filter((x) => x.trim().length > 0).slice(0, 2) ?? fallbackCallouts(scene.caption_lines))
      : [];
    return {
      ...scene,
      layout,
      callouts,
      stat,
      chart,
      image_fit,
      duration_sec,
      interrupt_strength,
      caption_emphasis: scene.caption_emphasis?.filter(Boolean).slice(0, 3),
    };
  });

  let scenes = normalizedScenes;
  let target_duration_sec = plan.target_duration_sec;
  if (prefs.preset === "viral_30_45") {
    target_duration_sec = Math.max(30, Math.min(45, target_duration_sec));
    scenes = enforceViralSceneCount(scenes);
    target_duration_sec = Math.max(
      30,
      Math.min(
        45,
        scenes.reduce((sum, s) => sum + s.duration_sec, 0),
      ),
    );
  }

  return { ...plan, target_duration_sec, scenes };
}

/** Clamp viral plans to 8–10 scenes and ensure a mid-video re_hook. */
function enforceViralSceneCount(scenes: VideoPlan["scenes"]): VideoPlan["scenes"] {
  let next = [...scenes];
  if (!next.some((s) => s.role === "re_hook") && next.length >= 3) {
    const mid = Math.min(Math.max(2, Math.floor(next.length / 3)), next.length - 1);
    next[mid] = { ...next[mid], role: "re_hook", interrupt_strength: "strong" };
  }
  while (next.length > 10) {
    // Drop middle non-hook/non-takeaway scenes first
    const idx = next.findIndex((s, i) => i > 0 && i < next.length - 1 && s.role !== "re_hook" && s.role !== "hook");
    if (idx < 0) break;
    next.splice(idx, 1);
  }
  while (next.length < 8) {
    const n = next.length + 1;
    next.push({
      id: `s${n}`,
      role: next.length === 3 ? "re_hook" : "context",
      duration_sec: 4,
      caption_lines: ["Key detail", "Stay with me"],
      voiceover: "Here's another key detail you need to know.",
      layout: "big_callout",
      callouts: ["Key detail"],
      interrupt_strength: next.length === 3 ? "strong" : "normal",
    });
  }
  return next.map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }));
}

async function resolvePlanAssets(plan: VideoPlan, assetsDir: string | undefined, projectDir: string): Promise<VideoPlan> {
  let next = await resolveUserAssetsFolder(plan, projectDir);
  if (!assetsDir) return next;
  const absAssets = path.isAbsolute(assetsDir) ? assetsDir : path.join(process.cwd(), assetsDir);
  const shotsDir = path.join(projectDir, "screenshots");
  await ensureDir(shotsDir);

  const tryResolve = async (name: string): Promise<string | null> => {
    for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
      const candidate = path.join(absAssets, `${name}${ext}`);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        /* continue */
      }
    }
    const direct = path.join(absAssets, name);
    try {
      await fs.access(direct);
      return direct;
    } catch {
      return null;
    }
  };

  const scenes = await Promise.all(
    next.scenes.map(async (scene) => {
      let screenshot_path = scene.screenshot_path;
      const fileKey = scene.screenshot_file || scene.id;
      const found = await tryResolve(fileKey);
      if (found) {
        const dest = path.join(shotsDir, `${scene.id}${path.extname(found) || ".png"}`);
        await fs.copyFile(found, dest);
        screenshot_path = dest;
      } else if (screenshot_path && !path.isAbsolute(screenshot_path)) {
        const fromAssets = path.join(absAssets, screenshot_path);
        try {
          await fs.access(fromAssets);
          const dest = path.join(shotsDir, `${scene.id}${path.extname(fromAssets) || ".png"}`);
          await fs.copyFile(fromAssets, dest);
          screenshot_path = dest;
        } catch {
          /* keep as-is */
        }
      }

      if (!screenshot_path) return scene;
      const lower = screenshot_path.toLowerCase();
      const image_fit =
        scene.image_fit ??
        (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("pexels")
          ? "cover"
          : "contain");
      return {
        ...scene,
        screenshot_path,
        layout: scene.layout === "broll" || scene.layout === "stat" || scene.layout === "bar_chart" || scene.layout === "big_callout"
          ? scene.layout
          : "screenshot",
        image_fit,
      };
    }),
  );

  return { ...next, scenes };
}

function buildPlanPrompt(articleText: string, title: string, prefs: RenderPrefs) {
  const arc =
    prefs.preset === "deep_explainer"
      ? "10-12 scenes theo arc: hook → why_matters → re_hook → what_happened → evidence → context → impact → takeaway."
      : prefs.preset === "ultra_25_35"
        ? "4-5 scenes theo arc: hook → what_happened → impact → takeaway."
        : prefs.preset === "viral_30_45"
          ? "8-10 scenes theo arc: hook → why_matters → re_hook → what_happened → evidence → context → impact → takeaway (pacing nhanh, FYP)."
          : "7 scenes theo arc: hook → why_matters → what_happened → evidence → context → impact → takeaway.";
  const durationTarget =
    prefs.preset === "deep_explainer"
      ? "Tổng duration mục tiêu 90-110 giây (chấp nhận 80-120 giây)."
      : prefs.preset === "ultra_25_35"
        ? "Tổng duration 25-35 giây."
        : prefs.preset === "viral_30_45"
          ? "Tổng duration 30-45 giây."
          : "Tổng duration 60-80 giây.";
  const secondHookRule =
    prefs.preset === "deep_explainer"
      ? "- Bắt buộc có 1 re-hook quanh giây 12-15 (scene 3) để giữ retention."
      : prefs.preset === "viral_30_45"
        ? "- Bắt buộc có 1 re-hook quanh giây 8-12 (scene 3 hoặc 4) để giữ retention."
        : "";
  const calloutRule = prefs.enableCallouts
    ? "- Mỗi scene phải có callouts 1-2 item ngắn (6-28 ký tự), và callouts phải xuất hiện trong voiceover."
    : "- Để callouts là mảng rỗng [].";
  const layoutRule =
    prefs.layoutMode === "tri"
      ? "- layout dùng tin tức visual: screenshot, big_callout, stat, bar_chart, broll, split. Không lặp quá 2 scene cùng layout. hook/impact ưu tiên stat|big_callout; evidence ưu tiên screenshot|bar_chart."
      : prefs.layoutMode === "dual"
        ? "- layout dùng screenshot, big_callout, stat, bar_chart luân phiên."
        : "- layout dùng screenshot, stat hoặc big_callout; broll khi cần minh họa.";

  return `Bạn là biên tập viên video short-form tiếng Việt (TikTok/Reels/Shorts) dạng explainer tin tức.
Mục tiêu: kể lại rõ ràng chủ đề bất kỳ (kinh tế, xã hội, khoa học, thể thao, giải trí, chính trị, công nghệ…), giữ retention cao, dễ hiểu, không bịa — chỉ dựa vào nội dung đầu vào.

Trả về JSON theo schema:
{
  "title": string,
  "target_duration_sec": number,
  "audio_prompt": "string (Markdown chuẩn theo mẫu AUDIO PROFILE để đưa vào TTS)",
  "scenes": [
    {
      "id": "s1",
      "role": "hook|re_hook|why_matters|what_happened|evidence|context|impact|takeaway",
      "duration_sec": number (integer 3-12, KHÔNG dùng số thập phân),
      "caption_lines": [string, string?],
      "voiceover": "string (ví dụ: [excitedly] Chào các bạn!)",
      "layout": "screenshot|big_callout|split|broll|stat|bar_chart",
      "callouts": [string, string?],
      "stat": { "value": "10/10", "label": "công ty dùng AI", "delta": "optional" },
      "chart": { "title": "optional", "bars": [{ "label": "Hiểu rủi ro", "value": 80 }, { "label": "Sợ mù quáng", "value": 25 }] },
      "pexels_query": "string (1-3 từ khóa tiếng Anh; BẮT BUỘC cho mọi layout trừ big_callout — dùng tìm ảnh/video Pexels khi thiếu asset)"
    }
  ]
}

Quy tắc visual theo role:
- hook / impact / takeaway: ưu tiên layout "stat" hoặc "big_callout" (kèm object stat nếu dùng stat).
- evidence: ưu tiên "screenshot" hoặc "bar_chart" (kèm chart.bars lấy số từ bài, KHÔNG bịa).
- what_happened / context: "screenshot" hoặc "broll".
- Khi layout="stat" → BẮT BUỘC có "stat". Khi layout="bar_chart" → BẮT BUỘC có "chart.bars" (1-5 mục).
- Mọi scene không phải big_callout phải có pexels_query (ảnh stock / B-roll khi thiếu screenshot).

Yêu cầu cực kỳ quan trọng cho \`audio_prompt\`:
- BẠN BẮT BUỘC phải tạo ra một \`audio_prompt\` dạng Markdown có cấu trúc chính xác như sau:
\`\`\`markdown
# AUDIO PROFILE: [Tên một Voice phù hợp]
## "[Tiêu đề video]"

## THE SCENE: [Mô tả chi tiết bối cảnh phòng thu, thời gian, hành động của người nói]

### DIRECTOR'S NOTES
Style: [Mô tả phong cách đọc, độ mở của giọng, khẩu hình...]
Pace: [Mô tả tốc độ, nhịp điệu]
Accent: [Giọng vùng miền hoặc đặc trưng]

### SAMPLE CONTEXT
[Mô tả bối cảnh chuyên môn hoặc role của người nói]

#### TRANSCRIPT
[Sao chép toàn bộ voiceover của các scene ghép lại với nhau, bao gồm cả các tag cảm xúc như [shouting], [excitedly], v.v.]
\`\`\`
- Phần TRANSCRIPT bên trong \`audio_prompt\` PHẢI khớp 100% với việc ghép tất cả các \`voiceover\` trong mảng \`scenes\` lại với nhau.

Ràng buộc chung:
- ${arc}
- ${durationTarget}
${secondHookRule}
- caption_lines tối đa 2 dòng, mỗi dòng <= 42 ký tự.
- caption_lines phải là tóm tắt trực tiếp của voiceover, không thêm ý mới.
- voiceover phải mở đầu bằng câu diễn giải lại caption_lines, rồi mới giải thích thêm.
- duration từng scene phải đủ để đọc tự nhiên, tránh audio tràn scene kế.
${calloutRule}
${layoutRule}
- Ưu tiên câu ngắn, từ dễ hiểu, không hỏi kết mở.
- CRAFT (đạo diễn): hook PHẢI cụ thể (số / tình huống / hành động định danh) — cấm câu hỏi chung kiểu "bạn còn làm X?".
- Mỗi scene thêm beat MỚI; re_hook phải ĐỔI GÓC / tăng tension, không paraphrase hook ("quên cách cũ / đã có sản phẩm").
- Có beat bằng chứng (screenshot/stat/so sánh) khớp lời thoại; KHÔNG bịa số liệu ngoài nguồn.
- Giọng kể chuyện tự nhiên — cấm slogan brochure ("bạn xứng đáng hơn", "đừng chần chừ").
- takeaway = hành động rõ + lý do gắn beat trước.

Tiêu đề bài: ${title}
Nội dung bài (đã trích):\n${articleText.slice(0, 12000)}`;
}

function parsePlanFromModelOutput(raw: string) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Model không trả về JSON hợp lệ. Output: ${raw.slice(0, 400)}`);
  return VideoPlanSchema.parse(JSON.parse(jsonMatch[0])) as VideoPlan;
}

async function planVideoWithGemini(articleText: string, title: string, geminiKey: string, prefs: RenderPrefs) {
  emit({ type: "step_start", step: "plan" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = buildPlanPrompt(articleText, title, prefs);

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await ai.models.generateContent({
      model: prefs.contentModel || "gemini-3.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    try {
      const parsed = parsePlanFromModelOutput(res.text ?? "");
      const plan = normalizePlan(parsed, prefs);
      emit({
        type: "step_done",
        step: "plan",
        scenes: plan.scenes.length,
        target: plan.target_duration_sec,
        attempt,
        plan,
      });
      return plan;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      emit({ type: "log", step: "plan", message: `Plan parse retry ${attempt}: ${lastError}` });
    }
  }
  throw new Error(`Không tạo được video plan hợp lệ: ${lastError}`);
}

type PromptPageContext = {
  urls: string[];
  excerpts: string[];
};

function buildPromptPlanPrompt(
  userPrompt: string,
  prefs: RenderPrefs,
  pageContext?: PromptPageContext,
) {
  const hasPages = Boolean(pageContext?.urls.length);
  const arc =
    prefs.preset === "viral_30_45"
      ? "8-10 scenes theo arc: hook → why_matters → re_hook → what_happened → evidence → context → impact → takeaway (pacing nhanh, FYP)."
      : "4-6 scenes tập trung vào hook mạnh mẽ, diễn giải chi tiết và kết luận.";
  const durationTarget =
    prefs.preset === "viral_30_45"
      ? "Tổng duration mục tiêu 30-45 giây."
      : "Tổng duration mục tiêu 30-60 giây.";
  const calloutRule = prefs.enableCallouts
    ? "- Mỗi scene phải có callouts 1-2 item ngắn (6-28 ký tự), và callouts phải xuất hiện trong voiceover."
    : "- Để callouts là mảng rỗng [].";
  const layoutRule = hasPages
    ? `- Đã chụp screenshot các trang nguồn. Ưu tiên layout "screenshot" cho hook/evidence/what_happened (ít nhất 2–3 scene). Scene còn lại dùng big_callout|stat|split|broll + pexels_query.`
    : `- Layout MẶC ĐỊNH: "big_callout", "split", "stat", "bar_chart" hoặc "broll". ĐỪNG trả về "screenshot". Dùng "broll" cho ~30–50% cảnh. Mọi scene không phải big_callout phải có pexels_query.`;

  const pageBlock =
    hasPages && pageContext
      ? `\n\nCác trang đã mở và chụp ảnh (dùng làm bằng chứng visual; không bịa số liệu ngoài nội dung):\n${pageContext.urls
          .map(
            (u, i) =>
              `### ${u}\n${(pageContext.excerpts[i] ?? "").slice(0, 4000)}`,
          )
          .join("\n\n")}\n`
      : "";

  return `Bạn là biên tập viên video short-form tiếng Việt (TikTok/Reels/Shorts).
Mục tiêu: Tạo kịch bản video dựa trên yêu cầu của người dùng cho bất kỳ chủ đề tin tức/explainer nào, giữ retention cao, ngôn ngữ tự nhiên, không bịa.

Trả về JSON theo schema:
{
  "title": string,
  "target_duration_sec": number,
  "audio_prompt": "string (Markdown chuẩn theo mẫu AUDIO PROFILE để đưa vào TTS)",
  "scenes": [
    {
      "id": "s1",
      "role": "hook|why_matters|what_happened|evidence|context|impact|takeaway",
      "duration_sec": number (5-12),
      "caption_lines": [string, string?],
      "voiceover": "string (ví dụ: [excitedly] Chào các bạn!)",
      "layout": "big_callout|split|broll|stat|bar_chart|screenshot",
      "callouts": [string, string?],
      "stat": { "value": "string", "label": "string" },
      "chart": { "title": "string?", "bars": [{ "label": "string", "value": number }] },
      "pexels_query": "string (1-3 từ khóa tiếng Anh; BẮT BUỘC cho mọi layout trừ big_callout, ví dụ: 'city street', 'office', 'stock chart')"
    }
  ]
}

Yêu cầu cực kỳ quan trọng cho \`audio_prompt\`:
- BẠN BẮT BUỘC phải tạo ra một \`audio_prompt\` dạng Markdown có cấu trúc chính xác như sau:
\`\`\`markdown
# AUDIO PROFILE: [Tên một Voice phù hợp]
## "[Tiêu đề video]"

## THE SCENE: [Mô tả chi tiết bối cảnh phòng thu, thời gian, hành động của người nói]

### DIRECTOR'S NOTES
Style: [Mô tả phong cách đọc, độ mở của giọng, khẩu hình...]
Pace: [Mô tả tốc độ, nhịp điệu]
Accent: [Giọng vùng miền hoặc đặc trưng]

### SAMPLE CONTEXT
[Mô tả bối cảnh chuyên môn hoặc role của người nói]

#### TRANSCRIPT
[Sao chép toàn bộ voiceover của các scene ghép lại với nhau, bao gồm cả các tag cảm xúc như [shouting], [excitedly], v.v.]
\`\`\`
- Phần TRANSCRIPT bên trong \`audio_prompt\` PHẢI khớp 100% với việc ghép tất cả các \`voiceover\` trong mảng \`scenes\` lại với nhau.

Ràng buộc chung:
- ${arc}
- ${durationTarget}
- caption_lines tối đa 2 dòng, mỗi dòng <= 42 ký tự.
- caption_lines là tóm tắt trực tiếp của voiceover.
- voiceover mở đầu bằng câu diễn giải lại caption_lines.
${calloutRule}
${layoutRule}
- Giọng văn: Kể chuyện hấp dẫn như đồng nghiệp cảnh báo — dứt khoát, không brochure.
- CRAFT: hook cụ thể (số/tình huống/hành động); mỗi scene beat mới; re_hook escalate góc; proof khớp nguồn; CTA = action + reason; KHÔNG bịa số liệu.
${pageBlock}
Yêu cầu/Ý tưởng của người dùng:
"${userPrompt}"`;
}

async function planVideoFromPromptWithGemini(
  userPrompt: string,
  geminiKey: string,
  prefs: RenderPrefs,
  opts?: { pageContext?: PromptPageContext; hasScreenshots?: boolean },
) {
  emit({ type: "step_start", step: "plan" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = buildPromptPlanPrompt(userPrompt, prefs, opts?.pageContext);

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await ai.models.generateContent({
      model: prefs.contentModel || "gemini-3.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    try {
      const parsed = parsePlanFromModelOutput(res.text ?? "");
      // Without page screenshots, strip screenshot layouts (Pexels/callout path).
      if (!opts?.hasScreenshots) {
        parsed.scenes = parsed.scenes.map((s) => ({
          ...s,
          layout: s.layout === "screenshot" ? "big_callout" : s.layout,
        }));
      }
      const plan = normalizePlan(parsed, prefs);
      emit({
        type: "step_done",
        step: "plan",
        scenes: plan.scenes.length,
        target: plan.target_duration_sec,
        attempt,
        plan,
      });
      return plan;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      emit({ type: "log", step: "plan", message: `Plan parse retry ${attempt}: ${lastError}` });
    }
  }
  throw new Error(`Không tạo được video plan hợp lệ: ${lastError}`);
}

async function planVideoWithOpenAI(
  articleText: string,
  title: string,
  openaiKey: string,
  prefs: RenderPrefs,
) {
  emit({ type: "step_start", step: "plan" });
  const prompt = buildPlanPrompt(articleText, title, prefs);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "Bạn luôn trả về JSON hợp lệ duy nhất (không markdown, không giải thích). Không được thêm chi tiết ngoài input.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI plan error: HTTP ${res.status} ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as any;
  const parsed = parsePlanFromModelOutput(String(data?.choices?.[0]?.message?.content ?? ""));
  const plan = normalizePlan(parsed, prefs);
  emit({ type: "step_done", step: "plan", scenes: plan.scenes.length, target: plan.target_duration_sec, plan });
  return plan;
}

async function geminiTtsToWav(
  text: string,
  outFile: string,
  geminiKey: string,
  voiceName: string = "Zephyr",
  audioModel: string = "gemini-3.1-flash-tts-preview",
) {
  emit({ type: "step_start", step: "tts" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const model = audioModel || "gemini-3.1-flash-tts-preview";

  const response = await withRetry("Gemini TTS", () =>
    ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }),
  );

  const dataB64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!dataB64) throw new Error("Không nhận được audio từ Gemini TTS.");
  const pcm = Buffer.from(dataB64, "base64");

  await ensureDir(path.dirname(outFile));
  await new Promise<void>((resolve, reject) => {
    const writer = new wav.FileWriter(outFile, {
      channels: 1,
      sampleRate: 24000,
      bitDepth: 16,
    });
    writer.on("finish", () => resolve());
    writer.on("error", (e) => reject(e));
    writer.write(pcm);
    writer.end();
  });

  emit({ type: "step_done", step: "tts", wav: outFile });
}

async function openaiTtsToWav(text: string, outFile: string, openaiKey: string) {
  emit({ type: "step_start", step: "tts" });

  await ensureDir(path.dirname(outFile));

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "wav",
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS error: HTTP ${res.status} ${t.slice(0, 300)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);

  emit({ type: "step_done", step: "tts", wav: outFile });
}

async function macosSayTtsToWav(text: string, outFile: string) {
  if (process.platform !== "darwin") {
    throw new Error(
      'TTS provider "macos" chỉ hỗ trợ trên macOS. Dùng Gemini (--tts gemini) hoặc OpenAI (--tts openai) trên Windows.',
    );
  }
  emit({ type: "step_start", step: "tts" });

  const tmpAiff = outFile.replace(/\.wav$/i, ".aiff");
  await ensureDir(path.dirname(outFile));

  const { execFile } = await import("node:child_process");
  const execFilePLocal = (file: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  // macOS built-in TTS (Vietnamese voice: Linh when available)
  await execFilePLocal("say", ["-v", "Linh", "-o", tmpAiff, text]);

  // Convert to mono 24k wav for consistent muxing
  await execFilePLocal("ffmpeg", ["-y", "-i", tmpAiff, "-ar", "24000", "-ac", "1", outFile]);

  emit({ type: "step_done", step: "tts", wav: outFile });
}

async function rewritePlanVoiceoverWithGemini(
  plan: VideoPlan,
  targetSec: number,
  geminiKey: string,
  prefs: RenderPrefs,
) {
  emit({ type: "step_start", step: "plan_rewrite" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = `Rút gọn voiceover để tổng audio đọc tự nhiên khớp khoảng ${targetSec} giây.
Giữ nguyên id, role, duration_sec, layout, callouts; chỉ rút gọn voiceover và caption_lines khi cần.
Không bịa thông tin mới.

Trả về JSON theo schema đầy đủ (giống input) và vẫn phải có:
- caption_lines tối đa 2 dòng, <=42 ký tự mỗi dòng.
- voiceover mở đầu bằng câu diễn giải lại caption_lines.

INPUT PLAN JSON:
${JSON.stringify(plan)}`;

  const res = await ai.models.generateContent({
    model: prefs.contentModel || "gemini-3.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
  });
  const parsed = parsePlanFromModelOutput(res.text ?? "");
  const rewritten = normalizePlan(parsed, prefs);
  emit({
    type: "step_done",
    step: "plan_rewrite",
    scenes: rewritten.scenes.length,
    target: rewritten.target_duration_sec,
  });
  return rewritten;
}

async function probeDurationSec(filePath: string) {
  const { execFile } = await import("node:child_process");
  const execFileP = (file: string, args: string[]) =>
    new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(Object.assign(err, { stdout, stderr }));
        resolve({ stdout, stderr });
      });
    });

  const probe = await execFileP("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const json = JSON.parse(probe.stdout);
  const duration = Number(json?.format?.duration ?? 0);
  return Number.isFinite(duration) ? duration : 0;
}

function buildAtempoChain(factor: number) {
  if (!Number.isFinite(factor) || factor <= 0) return "atempo=1";
  const parts: number[] = [];
  let f = factor;

  while (f > 2.0) {
    parts.push(2.0);
    f /= 2.0;
  }
  while (f < 0.5) {
    parts.push(0.5);
    f /= 0.5;
  }

  parts.push(Math.round(f * 1000) / 1000);
  return parts.map((p) => `atempo=${p}`).join(",");
}

type AudioFitResult = {
  path: string;
  inDur: number;
  target: number;
  factor: number;
  action: "noop" | "speed_up" | "pad_silence" | "needs_rewrite";
  requiresRewrite: boolean;
};

async function fitAudioToTargetDuration(
  inPath: string,
  outPath: string,
  targetSec: number,
  maxSpeedFactor = 1.5,
): Promise<AudioFitResult> {
  emit({ type: "step_start", step: "audio_fit" });
  const inDur = await probeDurationSec(inPath);
  const target = Math.max(1, targetSec);
  const delta = inDur - target;
  const factor = target > 0 ? inDur / target : 1;

  // If close enough, avoid re-encode to keep quality and speed.
  if (Math.abs(delta) <= 0.75) {
    emit({ type: "step_done", step: "audio_fit", action: "noop", inDur, target });
    return { path: inPath, inDur, target, factor, action: "noop", requiresRewrite: false };
  }

  const { execFile } = await import("node:child_process");
  const execFileP = (file: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  await ensureDir(path.dirname(outPath));

  if (inDur > target) {
    if (factor > maxSpeedFactor) {
      emit({
        type: "step_done",
        step: "audio_fit",
        action: "needs_rewrite",
        inDur,
        target,
        factor,
        maxSpeedFactor,
      });
      return { path: inPath, inDur, target, factor, action: "needs_rewrite", requiresRewrite: true };
    }
    const chain = buildAtempoChain(factor);
    await execFileP("ffmpeg", ["-y", "-i", inPath, "-af", chain, "-t", String(target), "-ar", "24000", "-ac", "1", outPath]);
    emit({ type: "step_done", step: "audio_fit", action: "speed_up", inDur, target, factor });
    return { path: outPath, inDur, target, factor, action: "speed_up", requiresRewrite: false };
  }

  // Pad with silence to avoid trimming the final video when muxing with -shortest.
  await execFileP("ffmpeg", ["-y", "-i", inPath, "-af", "apad", "-t", String(target), "-ar", "24000", "-ac", "1", outPath]);
  emit({ type: "step_done", step: "audio_fit", action: "pad_silence", inDur, target });
  return { path: outPath, inDur, target, factor, action: "pad_silence", requiresRewrite: false };
}

function sceneCutTimesSec(scenes: VideoPlan["scenes"]): number[] {
  let t = 0;
  const cuts: number[] = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    t += Math.max(3, Math.min(12, scenes[i].duration_sec || 5));
    cuts.push(t);
  }
  return cuts;
}

async function mixCutWhoosh(
  execFileP: (file: string, args: string[]) => Promise<void>,
  voicePath: string,
  cutTimesSec: number[],
  outPath: string,
) {
  if (cutTimesSec.length === 0) {
    await fs.copyFile(voicePath, outPath);
    return;
  }

  const args = ["-y", "-i", voicePath];
  for (const t of cutTimesSec) {
    const ms = Math.round(t * 1000);
    args.push(
      "-f",
      "lavfi",
      "-i",
      `anoisesrc=d=0.07:c=pink:a=0.12,highpass=f=800,adelay=${ms}|${ms}`,
    );
  }
  const mixInputs = `[0:a]${cutTimesSec.map((_, i) => `[${i + 1}:a]`).join("")}`;
  const filter = `${mixInputs}amix=inputs=${cutTimesSec.length + 1}:duration=first:dropout_transition=0,alimiter=limit=0.95[aout]`;
  args.push("-filter_complex", filter, "-map", "[aout]", "-ar", "24000", "-ac", "1", outPath);
  await execFileP("ffmpeg", args);
}

async function renderRemotionVideo(
  projectDir: string,
  plan: VideoPlan,
  audioPath: string,
  screenshotMeta: Record<string, { path: string }>,
  prefs: RenderPrefs,
) {
  emit({ type: "step_start", step: "render" });

  const roleToShot: Partial<Record<SceneRole, string>> = {
    hook: screenshotMeta.headline?.path,
    why_matters: screenshotMeta.lead?.path,
    what_happened: screenshotMeta.fact?.path,
    evidence: screenshotMeta.fact?.path,
    context: screenshotMeta.context?.path,
    impact: screenshotMeta.impact?.path,
    takeaway: screenshotMeta.close?.path,
  };
  const scenesWithShots = await Promise.all(
    plan.scenes.map(async (s) => {
      const shotPath =
        s.screenshot_path ||
        roleToShot[s.role as SceneRole] ||
        screenshotMeta.headline?.path;
      const screenshot_src = shotPath
        ? await fileToDataUrl(
            shotPath,
            shotPath.toLowerCase().endsWith(".jpg") || shotPath.toLowerCase().endsWith(".jpeg")
              ? "image/jpeg"
              : "image/png",
          )
        : undefined;
      const broll_src = s.broll_path ? await fileToDataUrl(s.broll_path, "video/mp4") : undefined;
      const lower = (shotPath || "").toLowerCase();
      const image_fit =
        s.image_fit ??
        (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("pexels")
          ? "cover"
          : "contain");
      return {
        ...s,
        screenshot_path: shotPath,
        screenshot_src,
        broll_src,
        image_fit,
        layout: s.layout ?? (shotPath ? "screenshot" : "big_callout"),
        callouts: s.callouts ?? [],
        stat: s.stat,
        chart: s.chart,
      };
    }),
  );

  const inputProps = {
    title: plan.title,
    scenes: scenesWithShots,
    showProgress: prefs.enableProgress,
    showCallouts: prefs.enableCallouts,
    layoutMode: prefs.layoutMode,
    // Render silent in Remotion (more robust); we'll mux audio using ffmpeg afterwards.
    audioPath: "",
    audioSrc: "",
  };

  const entryPoint = path.join(process.cwd(), "remotion", "index.ts");
  const bundleLocation = path.join(process.cwd(), ".remotion-bundle");
  await ensureDir(bundleLocation);

  const serveUrl = await bundle({
    entryPoint,
    outDir: bundleLocation,
    enableCaching: true,
    webpackOverride: (currentConfig) => currentConfig,
  });

  const comps = await getCompositions(serveUrl, { inputProps });
  const targetCompId = prefs.template || "NewsStoryV1";
  const comp = comps.find((c) => c.id === targetCompId);
  if (!comp) throw new Error(`Không tìm thấy composition ${targetCompId}.`);

  const renderDir = path.join(projectDir, "render");
  await ensureDir(renderDir);
  const silentOut = path.join(renderDir, "out.silent.mp4");

  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "h264",
    outputLocation: silentOut,
    inputProps,
  });

  // Mux audio using system ffmpeg (copy video, encode audio to AAC).
  const finalOut = path.join(renderDir, "out.mp4");
  const { execFile } = await import("node:child_process");
  const execFileP = (file: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  let muxAudioPath = audioPath;
  if (prefs.enableCutSfx) {
    const cuts = sceneCutTimesSec(plan.scenes);
    muxAudioPath = path.join(renderDir, "voice_with_cuts.wav");
    await mixCutWhoosh(execFileP, audioPath, cuts, muxAudioPath);
  }

  await execFileP("ffmpeg", [
    "-y",
    "-i",
    silentOut,
    "-i",
    muxAudioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ac",
    "1",
    "-shortest",
    "-movflags",
    "+faststart",
    finalOut,
  ]);

  emit({ type: "step_done", step: "render", mp4: finalOut });
  return finalOut;
}

async function qc(projectDir: string, mp4Path: string) {
  emit({ type: "step_start", step: "qc" });
  const qcDir = path.join(projectDir, "qc");
  await ensureDir(qcDir);

  const probe = await execFileP("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    mp4Path,
  ]);
  const ffprobeJson = JSON.parse(probe.stdout);
  await writeJson(path.join(qcDir, "ffprobe.json"), ffprobeJson);

  await execFileP("ffmpeg", ["-y", "-i", mp4Path, "-frames:v", "1", path.join(qcDir, "thumb.png")]);

  const duration = Number(ffprobeJson?.format?.duration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0.25) {
    throw new Error(`QC failed: video duration invalid (${duration}).`);
  }

  const notes = `# Review notes (manual)\n\n- Hook 0–4s:\n- Scene pacing:\n- Captions (readable, no overflow):\n- TTS naturalness:\n- Factual accuracy vs source:\n- Auto duration: ${duration.toFixed(2)}s\n`;
  await fs.writeFile(path.join(qcDir, "review_notes.md"), notes, "utf-8");

  emit({ type: "step_done", step: "qc", qcDir, durationSec: duration });
  return qcDir;
}

async function assignScreenshotsToScenes(
  plan: VideoPlan,
  screenshots: Record<string, { path: string }>,
): Promise<VideoPlan> {
  const preferredOrder = [
    "headline",
    "lead",
    "fact",
    "context",
    "impact",
    "close",
    ...Object.keys(screenshots)
      .filter((k) => k.startsWith("site_"))
      .sort(),
  ];
  const candidateKeys = [
    ...preferredOrder.filter((k) => screenshots[k]?.path),
    ...Object.keys(screenshots).filter((k) => !preferredOrder.includes(k) && screenshots[k]?.path),
  ];
  const ordered: string[] = [];
  for (const key of candidateKeys) {
    const p = screenshots[key]?.path;
    if (!p) continue;
    if (await pngLooksUsable(p)) ordered.push(key);
    else {
      emit({
        type: "log",
        step: "screenshot",
        message: `Skipping unusable screenshot slot "${key}" (${p})`,
      });
    }
  }
  if (!ordered.length) return plan;

  let shotIndex = 0;
  const rolesPreferShot = new Set(["evidence", "what_happened", "hook", "context", "re_hook"]);

  const scenes = plan.scenes.map((scene) => {
    if (scene.screenshot_path || scene.broll_path) return scene;
    const explicit = scene.layout === "screenshot";
    const soft = rolesPreferShot.has(scene.role) && shotIndex < ordered.length;
    if (!explicit && !soft) return scene;
    if (shotIndex >= ordered.length) return scene;
    const slotPath = screenshots[ordered[shotIndex]]?.path;
    shotIndex += 1;
    if (!slotPath) return scene;
    return {
      ...scene,
      layout: "screenshot" as const,
      screenshot_path: slotPath,
      broll_path: undefined,
      image_fit: scene.image_fit ?? "contain",
    };
  });

  return { ...plan, scenes };
}

async function loadPlanFromDisk(planPath: string, prefs: RenderPrefs): Promise<VideoPlan> {
  const raw = JSON.parse(await fs.readFile(planPath, "utf-8"));
  return normalizePlan(VideoPlanSchema.parse(raw) as VideoPlan, prefs);
}

async function writePlanAndMeta(projectDir: string, plan: VideoPlan) {
  await ensureDir(path.join(projectDir, "plan"));
  await writeJson(path.join(projectDir, "plan", "video_plan.json"), plan);
}

async function prepareVoiceover(
  plan: VideoPlan,
  args: z.infer<typeof ArgsSchema>,
  prefs: RenderPrefs,
  baseOut: string,
): Promise<{ plan: VideoPlan; fittedAudioPath: string }> {
  const audioPathRaw = path.join(baseOut, "tts", "voiceover.raw.wav");
  const audioPath = path.join(baseOut, "tts", "voiceover.wav");

  const existing = await findExistingVoiceover(baseOut);
  const cacheMatches = existing ? await voiceoverCacheMatchesPlan(baseOut, plan) : false;

  if (existing && !args.audioPath && cacheMatches) {
    emit({ type: "log", step: "tts", message: `Reuse existing voiceover: ${existing}` });
    return { plan, fittedAudioPath: existing };
  }

  if (existing && !cacheMatches) {
    emit({
      type: "log",
      step: "tts",
      message: "Script voiceover changed; regenerating TTS instead of reusing cached wav.",
    });
  }

  if (args.audioPath) {
    emit({ type: "log", step: "tts", message: "Chế độ Audio: Bỏ qua TTS, dùng file upload." });
    await ensureDir(path.join(baseOut, "tts"));
    await execFileP("ffmpeg", ["-y", "-i", args.audioPath, audioPathRaw]);
    await writeVoiceoverFingerprint(baseOut, plan);
    return { plan, fittedAudioPath: audioPathRaw };
  }

  const ttsProvider =
    args.tts ??
    (args.geminiKey
      ? "gemini"
      : args.openaiKey
        ? "openai"
        : process.platform === "darwin"
          ? "macos"
          : null);

  if (!ttsProvider) {
    throw new Error(
      "Không có TTS provider. Cần GEMINI_API_KEY hoặc OPENAI_API_KEY (Windows không hỗ trợ macos say).",
    );
  }

  let nextPlan = plan;
  let fittedAudioPath = audioPathRaw;

  for (let retry = 0; retry < 3; retry++) {
    const voiceover = nextPlan.scenes.map((s) => s.voiceover.trim()).join("\n");
    const ttsInput = nextPlan.audio_prompt ? nextPlan.audio_prompt : voiceover;

    if (ttsProvider === "gemini") {
      if (!args.geminiKey) throw new Error("tts=gemini nhưng thiếu GEMINI_API_KEY.");
      await geminiTtsToWav(
        ttsInput,
        audioPathRaw,
        args.geminiKey,
        args.voice,
        prefs.audioModel || "gemini-3.1-flash-tts-preview",
      );
    } else if (ttsProvider === "openai") {
      if (!args.openaiKey) throw new Error("tts=openai nhưng thiếu OPENAI_API_KEY.");
      await openaiTtsToWav(voiceover, audioPathRaw, args.openaiKey);
    } else {
      await macosSayTtsToWav(voiceover, audioPathRaw);
    }

    const planTotalSec = nextPlan.scenes.reduce((s, sc) => s + (sc.duration_sec ?? 0), 0);
    const fit = await fitAudioToTargetDuration(audioPathRaw, audioPath, planTotalSec, 1.5);
    fittedAudioPath = fit.path;

    if (!fit.requiresRewrite) break;
    if (!args.geminiKey) {
      emit({
        type: "log",
        step: "audio_fit",
        message: `Không có GEMINI_API_KEY để rewrite script, buộc speed-up cao (x${fit.factor.toFixed(2)}).`,
      });
      const forcedFit = await fitAudioToTargetDuration(audioPathRaw, audioPath, planTotalSec, 3);
      fittedAudioPath = forcedFit.path;
      break;
    }
    if (retry >= 2) {
      throw new Error(
        `Đã thử rút gọn voiceover nhiều lần nhưng vẫn quá dài (x${fit.factor.toFixed(2)}).`,
      );
    }
    nextPlan = await rewritePlanVoiceoverWithGemini(nextPlan, planTotalSec, args.geminiKey, prefs);
    emit({
      type: "log",
      step: "plan_rewrite",
      message: `Đã rút gọn voiceover lần ${retry + 1} để giữ tốc đọc <= 1.5x`,
    });
  }

  await writeVoiceoverFingerprint(baseOut, nextPlan);
  return { plan: nextPlan, fittedAudioPath };
}

async function runRenderStage(
  plan: VideoPlan,
  args: z.infer<typeof ArgsSchema>,
  prefs: RenderPrefs,
  baseOut: string,
  screenshotsMeta: Record<string, { path: string }>,
) {
  const orientation = args.platform === "youtube" ? "landscape" : "portrait";

  emit({ type: "step_start", step: "fetch_broll" });
  let next = await resolvePlanAssets(plan, args.assetsDir, baseOut);
  next = await autoFillPexelsAssets(next, args.pexelsKey, baseOut, orientation);
  next = {
    ...next,
    scenes: next.scenes.map((s) => {
      if (s.layout !== "screenshot" || !s.screenshot_path || s.image_fit) return s;
      const lower = s.screenshot_path.toLowerCase();
      const image_fit =
        lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("pexels")
          ? ("cover" as const)
          : ("contain" as const);
      return { ...s, image_fit };
    }),
  };
  emit({ type: "step_done", step: "fetch_broll" });

  const voice = await prepareVoiceover(next, args, prefs, baseOut);
  next = voice.plan;
  await writePlanAndMeta(baseOut, next);

  const mp4 = await renderRemotionVideo(baseOut, next, voice.fittedAudioPath, screenshotsMeta, prefs);
  try {
    await fs.access(mp4);
  } catch {
    throw new Error(`QC failed: missing output file ${mp4}`);
  }
  await qc(baseOut, mp4);
  emit({ type: "done", projectDir: baseOut, mp4 });
}

async function main() {
  const args = await parseArgs(process.argv);
  if (args.viralBrief && args.prompt) {
    args.prompt = `${args.viralBrief}\n\nUser topic: ${args.prompt}`;
  } else if (args.viralBrief && !args.prompt && !args.url) {
    (args as { prompt?: string }).prompt = args.viralBrief;
  }
  const prefs = toRenderPrefs(args);
  const stage = args.stage ?? "full";

  if (stage === "render") {
    if (!args.projectDir && !args.planFile) {
      throw new Error("stage=render cần --projectDir hoặc --planFile.");
    }
  } else if (!args.planFile && !args.geminiKey && !args.openaiKey) {
    throw new Error(
      "Thiếu cấu hình. Hãy truyền --planFile, hoặc truyền --geminiKey/--openaiKey (hoặc set env GEMINI_API_KEY / OPENAI_API_KEY).",
    );
  }

  await preflightTools();

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}__${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  let browser: import("playwright").Browser | undefined;
  try {
    emit({ type: "step_start", step: "config", prefs, stage });

    // ── stage=render: load existing project ──────────────────────────────────
    if (stage === "render") {
      const baseOut = args.projectDir
        ? path.isAbsolute(args.projectDir)
          ? args.projectDir
          : path.join(process.cwd(), args.projectDir)
        : path.dirname(path.dirname(args.planFile!));
      await ensureDir(baseOut);

      const planPath =
        args.planFile ??
        path.join(baseOut, "plan", "video_plan.json");
      let plan = await loadPlanFromDisk(planPath, prefs);
      emit({
        type: "step_done",
        step: "plan",
        scenes: plan.scenes.length,
        target: plan.target_duration_sec,
        source: "planFile",
        plan,
      });

      // Prefer prefs saved alongside project if present
      try {
        const prefsPath = path.join(baseOut, "plan", "render_prefs.json");
        const saved = JSON.parse(await fs.readFile(prefsPath, "utf-8")) as Partial<RenderPrefs>;
        Object.assign(prefs, saved);
      } catch {
        /* optional */
      }

      await runRenderStage(plan, args, prefs, baseOut, {});
      return;
    }

    // ── stage=plan | full: create project + plan ─────────────────────────────
    const slug = args.url ? slugify(args.url) : "prompt-" + stamp;
    const baseOut = args.outDir ?? path.join(process.cwd(), "output", `${stamp}__${slug}`);
    await ensureDir(baseOut);

    let screenshotsMeta: Record<string, { path: string }> = {};
    let plan: VideoPlan;

    if (args.audioPath && args.script) {
      const isLandscape = args.platform === "youtube";
      emit({
        type: "log",
        step: "config",
        message: isLandscape
          ? "Chế độ audio+script (YouTube landscape): bỏ qua extract/screenshot."
          : "Chế độ audio+script (TikTok 9:16): bỏ qua extract/screenshot.",
      });
      if (!isLandscape) {
        prefs.template = args.template && args.template !== "YouTubeStoryV1" ? args.template : "NewsStoryV1";
      } else {
        prefs.template = args.template && args.template !== "NewsStoryV1" ? args.template : "YouTubeStoryV1";
      }
      const duration = await getAudioDurationSec(args.audioPath);
      if (args.planFile) {
        plan = await loadPlanFromDisk(args.planFile, prefs);
        plan.target_duration_sec = Math.round(duration);
        const total = plan.scenes.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);
        if (total > 0 && Math.abs(total - duration) > 2) {
          const factor = duration / total;
          for (const s of plan.scenes) {
            s.duration_sec = Math.max(3, Math.min(12, Math.round((s.duration_sec ?? 0) * factor)));
          }
        }
        emit({
          type: "step_done",
          step: "plan",
          scenes: plan.scenes.length,
          target: plan.target_duration_sec,
          source: "planFile",
          plan,
        });
      } else if (args.geminiKey) {
        plan = await planVideoFromScriptWithGemini(args.script, duration, args.geminiKey, prefs);
      } else {
        throw new Error(
          "Audio+script mode cần --geminiKey (hoặc GEMINI_API_KEY) để lập plan, hoặc truyền --planFile có sẵn.",
        );
      }
      // Stage plan: copy audio early so render can reuse
      await ensureDir(path.join(baseOut, "tts"));
      const audioPathRaw = path.join(baseOut, "tts", "voiceover.raw.wav");
      await execFileP("ffmpeg", ["-y", "-i", args.audioPath, audioPathRaw]);
    } else if (args.prompt) {
      const urlsInPrompt = extractHttpUrls(args.prompt, 3);
      if (urlsInPrompt.length > 0) {
        emit({
          type: "log",
          step: "config",
          message: `Chế độ Prompt+URL: phát hiện ${urlsInPrompt.length} link — extract & screenshot.`,
        });
      } else {
        emit({ type: "log", step: "config", message: "Chế độ Prompt: Bỏ qua extract/screenshot." });
      }

      if (args.planFile) {
        plan = await loadPlanFromDisk(args.planFile, prefs);
        emit({
          type: "step_done",
          step: "plan",
          scenes: plan.scenes.length,
          target: plan.target_duration_sec,
          source: "planFile",
          plan,
        });
      } else if (args.geminiKey) {
        let pageContext: PromptPageContext | undefined;
        if (urlsInPrompt.length > 0) {
          const pages: PromptPageContext = { urls: [], excerpts: [] };
          const first = await extractArticle(urlsInPrompt[0], baseOut);
          browser = first.browser;
          screenshotsMeta = await captureScreenshots(
            first.page,
            baseOut,
            first.articleJson.paragraphs,
          );
          pages.urls.push(urlsInPrompt[0]);
          pages.excerpts.push(
            first.articleJson.text || first.articleJson.title || urlsInPrompt[0],
          );

          for (let i = 1; i < urlsInPrompt.length; i++) {
            try {
              const extra = await captureSiteHero(browser, urlsInPrompt[i], baseOut, `site_${i}`);
              Object.assign(screenshotsMeta, extra);
              pages.urls.push(urlsInPrompt[i]);
              pages.excerpts.push(`Landing/page capture for ${urlsInPrompt[i]}`);
            } catch (e) {
              emit({
                type: "log",
                step: "screenshot",
                message: `Bỏ qua URL ${urlsInPrompt[i]}: ${e instanceof Error ? e.message : String(e)}`,
              });
            }
          }
          pageContext = pages;
          await writeJson(path.join(baseOut, "screenshots", "screenshots_meta.json"), {
            ...screenshotsMeta,
            promptUrls: urlsInPrompt,
          });
        }

        plan = await planVideoFromPromptWithGemini(args.prompt, args.geminiKey, prefs, {
          pageContext,
          hasScreenshots: Boolean(pageContext?.urls.length),
        });
        if (Object.keys(screenshotsMeta).length) {
          plan = await assignScreenshotsToScenes(plan, screenshotsMeta);
          const assigned = plan.scenes.filter((s) => s.screenshot_path).length;
          emit({ type: "step_done", step: "assign_screenshots", assigned });
        }
      } else {
        throw new Error("Chế độ Prompt hiện tại chỉ hỗ trợ Gemini. Vui lòng cung cấp GEMINI_API_KEY.");
      }
    } else if (args.url) {
      const res = await extractArticle(args.url, baseOut);
      browser = res.browser;
      const articleJson = res.articleJson;

      screenshotsMeta = await captureScreenshots(res.page, baseOut, articleJson.paragraphs);
      const sourceText = articleJson.text || articleJson.paragraphs.map((p: { text: string }) => p.text).join("\n");

      if (args.planFile) {
        plan = await loadPlanFromDisk(args.planFile, prefs);
        emit({
          type: "step_done",
          step: "plan",
          scenes: plan.scenes.length,
          target: plan.target_duration_sec,
          source: "planFile",
          plan,
        });
      } else if (args.geminiKey) {
        plan = await planVideoWithGemini(sourceText, articleJson.title, args.geminiKey, prefs);
      } else {
        plan = await planVideoWithOpenAI(sourceText, articleJson.title, args.openaiKey!, prefs);
      }

      plan = await assignScreenshotsToScenes(plan, screenshotsMeta);
      const assignedCount = plan.scenes.filter((s) => s.layout === "screenshot" && s.screenshot_path).length;
      emit({ type: "step_done", step: "assign_screenshots", assigned: assignedCount });
    } else {
      throw new Error("Phải cung cấp --url, --prompt, hoặc --audioPath + --script.");
    }

    await writePlanAndMeta(baseOut, plan);
    await writeJson(path.join(baseOut, "plan", "render_prefs.json"), prefs);
    emit({ type: "plan_ready", projectDir: baseOut, plan, stage });

    if (stage === "plan") {
      emit({ type: "done", projectDir: baseOut, planReady: true });
      return;
    }

    // stage=full continues into render
    await runRenderStage(plan, args, prefs, baseOut, screenshotsMeta);
  } catch (err) {
    emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
