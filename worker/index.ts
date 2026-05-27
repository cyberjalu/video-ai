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
  
  const prompt = `Bạn là một đạo diễn video YouTube chuyên nghiệp.
Nhiệm vụ của bạn là phân tích kịch bản (script) sau đây và chia nó thành các cảnh (scenes).
Tổng thời lượng của video là đúng ${durationSec.toFixed(1)} giây. Bạn hãy tự phân bổ thời gian (duration_sec) cho từng cảnh sao cho tỷ lệ thuận với độ dài câu thoại, và TỔNG THỜI GIAN CÁC CẢNH PHẢI BẰNG ĐÚNG ${Math.round(durationSec)} giây.

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
      "duration_sec": 5,
      "caption_lines": ["Dòng 1", "Dòng 2"],
      "voiceover": "Câu nói tương ứng trong kịch bản",
      "layout": "broll",
      "pexels_query": "hacker"
    }
  ]
}

Quy tắc:
- Mọi cảnh PHẢI CÓ layout là "broll".
- Mọi cảnh PHẢI CÓ pexels_query (1-3 từ khóa tiếng Anh ngắn gọn như "nature", "working", "happy person").
- caption_lines: trích xuất vài từ khóa ngắn gọn làm phụ đề.
- voiceover: Lấy CHÍNH XÁC lời thoại từ kịch bản để khớp. KHÔNG ĐƯỢC BỊA THÊM HOẶC SỬA ĐỔI LỜI THOẠI!`;

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
  tts: z.enum(["gemini", "openai", "macos"]).optional(),
  outDir: z.string().optional(),
  preset: z.enum(["deep_explainer", "news_60_80", "ultra_25_35"]).optional(),
  template: z.string().optional(),
  layoutMode: z.enum(["tri", "dual", "mono"]).optional(),
  enableCallouts: z.boolean().optional(),
  enableProgress: z.boolean().optional(),
  voice: z.string().optional(),
  contentModel: z.string().optional(),
  audioModel: z.string().optional(),
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

type SceneLayout = "screenshot" | "big_callout" | "split" | "broll";
type RenderPreset = "deep_explainer" | "news_60_80" | "ultra_25_35";
type LayoutMode = "tri" | "dual" | "mono";

type RenderPrefs = {
  preset: RenderPreset;
  template: string;
  layoutMode: LayoutMode;
  enableCallouts: boolean;
  enableProgress: boolean;
  contentModel?: string;
  audioModel?: string;
};

const VideoPlanSchema = z.object({
  title: z.string(),
  target_duration_sec: z.number().int().min(20).max(180),
  audio_prompt: z.string().optional(),
  scenes: z
    .array(
      z.object({
        id: z.string(),
        role: z.custom<SceneRole>(),
        duration_sec: z.number().int().min(3).max(14),
        caption_lines: z.array(z.string()).min(1).max(2),
        voiceover: z.string(),
        layout: z.enum(["screenshot", "big_callout", "split", "broll"]).optional(),
        callouts: z.array(z.string()).max(2).optional(),
        screenshot_path: z.string().optional(),
        pexels_query: z.string().optional(),
        broll_path: z.string().optional(),
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

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const v = argv[i + 1];
    out[key] = v;
    i++;
  }
  const parseBool = (value: string | undefined) => {
    if (value == null) return undefined;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
    return undefined;
  };

  return ArgsSchema.parse({
    url: out.url,
    prompt: out.prompt,
    audioPath: out.audioPath,
    script: out.script,
    platform: out.platform as any,
    geminiKey: out.geminiKey ?? process.env.GEMINI_API_KEY,
    openaiKey: out.openaiKey ?? process.env.OPENAI_API_KEY,
    pexelsKey: out.pexelsKey ?? process.env.PEXELS_API_KEY,
    planFile: out.planFile,
    tts: out.tts as "gemini" | "openai" | "macos" | undefined,
    outDir: out.outDir,
    preset: out.preset as RenderPreset | undefined,
    template: out.template,
    layoutMode: out.layoutMode as LayoutMode | undefined,
    enableCallouts: parseBool(out.enableCallouts),
    enableProgress: parseBool(out.enableProgress),
    voice: out.voice,
    contentModel: out.contentModel,
    audioModel: out.audioModel,
  });
}

function toRenderPrefs(args: z.infer<typeof ArgsSchema>): RenderPrefs {
  return {
    preset: args.preset ?? "deep_explainer",
    template: args.template ?? "NewsStoryV1",
    layoutMode: args.layoutMode ?? "tri",
    enableCallouts: args.enableCallouts ?? true,
    enableProgress: args.enableProgress ?? true,
  };
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

async function fetchPexelsVideo(query: string, pexelsKey: string, outPath: string, orientation: "portrait" | "landscape" = "portrait"): Promise<string> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`;
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
  const mp4Files = videoFiles.filter((f: any) => f.file_type === "video/mp4" || f.link.includes(".mp4"));
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

  return outPath;
}

async function extractArticle(url: string, projectDir: string) {
  emit({ type: "step_start", step: "extract" });

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

  // Nhiều site chặn headless browser (403). Ưu tiên fetch HTML trực tiếp, rồi setContent để chụp screenshot.
  const fetched = await fetchHtml();
  await page.setContent(fetched.html, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("h1", { timeout: 60_000, state: "attached" }).catch(() => {});
  await page.waitForSelector("p", { timeout: 60_000, state: "attached" }).catch(() => {});
  await page.waitForTimeout(800);

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

  const html = fetched.html;
  const domForTitle = new JSDOM(html, { url });
  const title =
    domForTitle.window.document.querySelector("h1")?.textContent?.trim() ??
    domForTitle.window.document.querySelector("title")?.textContent?.trim() ??
    "";

  const rawHtmlPath = path.join(projectDir, "article", "raw.html");
  await ensureDir(path.dirname(rawHtmlPath));
  await fs.writeFile(rawHtmlPath, html, "utf-8");

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const text = (article?.textContent ?? "").trim();
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
        (p.text.includes("OpenAI") ? 1 : 0) +
        (p.text.includes("GPT") ? 1 : 0) +
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
    await page.screenshot({ path: fallbackPath });
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
  await page.locator(picks.headline).first().scrollIntoViewIfNeeded();
  await page.locator(picks.headline).first().screenshot({ path: headlinePath });
  meta.headline = { selector: picks.headline, path: headlinePath };

  const shot = async (name: string, p: { id: string; index: number; root: string; text: string }) => {
    const filePath = path.join(outDir, `${name}.png`);
    const loc = page.locator(`${p.root} p`).nth(p.index);
    await loc.scrollIntoViewIfNeeded();
    await loc.screenshot({ path: filePath });
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

function getLayoutCycle(mode: LayoutMode): SceneLayout[] {
  if (mode === "mono") return ["screenshot"];
  if (mode === "dual") return ["screenshot", "big_callout"];
  return ["screenshot", "big_callout", "split"];
}

function fallbackCallouts(lines: string[]) {
  const merged = lines.join(" • ").replace(/\s+/g, " ").trim();
  if (!merged) return [];
  return [merged.slice(0, 42)];
}

function normalizePlan(plan: VideoPlan, prefs: RenderPrefs) {
  const cycle = getLayoutCycle(prefs.layoutMode);
  const normalizedScenes = plan.scenes.map((scene, index) => {
    const layout = scene.layout ?? cycle[index % cycle.length];
    const callouts = prefs.enableCallouts
      ? (scene.callouts?.filter((x) => x.trim().length > 0).slice(0, 2) ?? fallbackCallouts(scene.caption_lines))
      : [];
    return {
      ...scene,
      layout,
      callouts,
    };
  });
  return { ...plan, scenes: normalizedScenes };
}

function buildPlanPrompt(articleText: string, title: string, prefs: RenderPrefs) {
  const arc =
    prefs.preset === "deep_explainer"
      ? "10-12 scenes theo arc: hook → why_matters → re_hook → what_happened → evidence → context → impact → takeaway."
      : prefs.preset === "ultra_25_35"
        ? "4-5 scenes theo arc: hook → what_happened → impact → takeaway."
        : "7 scenes theo arc: hook → why_matters → what_happened → evidence → context → impact → takeaway.";
  const durationTarget =
    prefs.preset === "deep_explainer"
      ? "Tổng duration mục tiêu 90-110 giây (chấp nhận 80-120 giây)."
      : prefs.preset === "ultra_25_35"
        ? "Tổng duration 25-35 giây."
        : "Tổng duration 60-80 giây.";
  const secondHookRule =
    prefs.preset === "deep_explainer"
      ? "- Bắt buộc có 1 re-hook quanh giây 12-15 (scene 3) để giữ retention."
      : "";
  const calloutRule = prefs.enableCallouts
    ? "- Mỗi scene phải có callouts 1-2 item ngắn (6-28 ký tự), và callouts phải xuất hiện trong voiceover."
    : "- Để callouts là mảng rỗng [].";
  const layoutRule =
    prefs.layoutMode === "tri"
      ? "- layout luân phiên các kiểu: screenshot, big_callout, split, broll; không lặp quá 2 scene liên tiếp. Chọn broll cho các scene phù hợp với video minh họa nền (B-roll)."
      : prefs.layoutMode === "dual"
        ? "- layout dùng screenshot, big_callout và broll luân phiên để tránh đều đều."
        : "- layout dùng screenshot hoặc broll cho tất cả scene.";

  return `Bạn là biên tập viên video TikTok tiếng Việt dạng explainer về an ninh mạng.
Mục tiêu: giữ retention cao, dễ hiểu, không bịa, chỉ dựa vào nội dung đầu vào.

Trả về JSON theo schema:
{
  "title": string,
  "target_duration_sec": number,
  "audio_prompt": "string (Markdown chuẩn theo mẫu AUDIO PROFILE để đưa vào TTS)",
  "scenes": [
    {
      "id": "s1",
      "role": "hook|re_hook|why_matters|what_happened|evidence|context|impact|takeaway",
      "duration_sec": number (3-14),
      "caption_lines": [string, string?],
      "voiceover": "string (ví dụ: [excitedly] Chào các bạn!)",
      "layout": "screenshot|big_callout|split|broll",
      "callouts": [string, string?],
      "pexels_query": "string (1-3 từ khóa tiếng Anh cực kỳ ngắn gọn và chính xác để tìm video B-roll minh họa, ví dụ: 'hacker', 'server room', 'frustrated man'. BẮT BUỘC phải có nếu layout là 'broll')"
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
${secondHookRule}
- caption_lines tối đa 2 dòng, mỗi dòng <= 42 ký tự.
- caption_lines phải là tóm tắt trực tiếp của voiceover, không thêm ý mới.
- voiceover phải mở đầu bằng câu diễn giải lại caption_lines, rồi mới giải thích thêm.
- duration từng scene phải đủ để đọc tự nhiên, tránh audio tràn scene kế.
${calloutRule}
${layoutRule}
- Ưu tiên câu ngắn, từ dễ hiểu, không hỏi kết mở.

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
      });
      return plan;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      emit({ type: "log", step: "plan", message: `Plan parse retry ${attempt}: ${lastError}` });
    }
  }
  throw new Error(`Không tạo được video plan hợp lệ: ${lastError}`);
}

function buildPromptPlanPrompt(userPrompt: string, prefs: RenderPrefs) {
  const arc = "4-6 scenes tập trung vào hook mạnh mẽ, diễn giải chi tiết và kết luận.";
  const durationTarget = "Tổng duration mục tiêu 30-60 giây.";
  const calloutRule = prefs.enableCallouts
    ? "- Mỗi scene phải có callouts 1-2 item ngắn (6-28 ký tự), và callouts phải xuất hiện trong voiceover."
    : "- Để callouts là mảng rỗng [].";

  return `Bạn là biên tập viên video TikTok tiếng Việt.
Mục tiêu: Tạo kịch bản video dựa trên yêu cầu của người dùng, giữ retention cao, ngôn ngữ tự nhiên.

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
      "layout": "big_callout|split|broll",
      "callouts": [string, string?],
      "pexels_query": "string (1-3 từ khóa tiếng Anh cực kỳ ngắn gọn và chính xác để tìm video B-roll minh họa, ví dụ: 'hacker', 'sad person'. BẮT BUỘC phải có nếu layout là 'broll')"
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
- Layout MẶC ĐỊNH bắt buộc là "big_callout", "split" hoặc "broll". ĐỪNG trả về "screenshot". Hãy dùng "broll" cho khoảng 50% số lượng cảnh (kèm pexels_query) để video thêm sinh động.
- Giọng văn: Kể chuyện hấp dẫn, cuốn hút, dứt khoát.

Yêu cầu/Ý tưởng của người dùng:
"${userPrompt}"`;
}

async function planVideoFromPromptWithGemini(userPrompt: string, geminiKey: string, prefs: RenderPrefs) {
  emit({ type: "step_start", step: "plan" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = buildPromptPlanPrompt(userPrompt, prefs);

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await ai.models.generateContent({
      model: prefs.contentModel || "gemini-3.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    try {
      const parsed = parsePlanFromModelOutput(res.text ?? "");
      // Force big_callout
      parsed.scenes = parsed.scenes.map(s => ({ ...s, layout: s.layout === 'screenshot' ? 'big_callout' : s.layout }));
      const plan = normalizePlan(parsed, prefs);
      emit({
        type: "step_done",
        step: "plan",
        scenes: plan.scenes.length,
        target: plan.target_duration_sec,
        attempt,
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
  emit({ type: "step_done", step: "plan", scenes: plan.scenes.length, target: plan.target_duration_sec });
  return plan;
}

async function geminiTtsToWav(text: string, outFile: string, geminiKey: string, voiceName: string = "Zephyr", audioModel: string = "gemini-3.1-flash-tts-preview") {
  emit({ type: "step_start", step: "tts" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

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
  emit({ type: "step_start", step: "tts" });

  const tmpAiff = outFile.replace(/\.wav$/i, ".aiff");
  await ensureDir(path.dirname(outFile));

  const { execFile } = await import("node:child_process");
  const execFileP = (file: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  // macOS built-in TTS (Vietnamese voice: Linh)
  await execFileP("say", ["-v", "Linh", "-o", tmpAiff, text]);

  // Convert to mono 24k wav for consistent muxing
  await execFileP("ffmpeg", ["-y", "-i", tmpAiff, "-ar", "24000", "-ac", "1", outFile]);

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
      const shotPath = roleToShot[s.role as SceneRole] ?? screenshotMeta.headline?.path;
      const screenshot_src = shotPath ? await fileToDataUrl(shotPath, "image/png") : undefined;
      const broll_src = s.broll_path ? await fileToDataUrl(s.broll_path, "video/mp4") : undefined;
      return {
        ...s,
        screenshot_path: shotPath,
        screenshot_src,
        broll_src,
        layout: s.layout ?? "screenshot",
        callouts: s.callouts ?? [],
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

  await execFileP("ffmpeg", [
    "-y",
    "-i",
    silentOut,
    "-i",
    audioPath,
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

  const notes = `# Review notes (manual)\n\n- Hook 0–4s: \n- Nhịp scene: \n- Caption (Montserrat, không tràn): \n- TTS tiếng Việt (tự nhiên/đọc sai): \n- Có bịa chi tiết không: \n`;
  await fs.writeFile(path.join(qcDir, "review_notes.md"), notes, "utf-8");

  emit({ type: "step_done", step: "qc", qcDir });
  return qcDir;
}

async function main() {
  const args = parseArgs(process.argv);
  const prefs = toRenderPrefs(args);
  if (!args.planFile && !args.geminiKey && !args.openaiKey) {
    throw new Error(
      "Thiếu cấu hình. Hãy truyền --planFile, hoặc truyền --geminiKey/--openaiKey (hoặc set env GEMINI_API_KEY / OPENAI_API_KEY).",
    );
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}__${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const slug = args.url ? slugify(args.url) : "prompt-" + stamp;
  const baseOut = args.outDir ?? path.join(process.cwd(), "output", `${stamp}__${slug}`);
  await ensureDir(baseOut);

  try {
    emit({ type: "step_start", step: "config", prefs });
    
    let browser, page, articleJson, screenshotsMeta: Record<string, { path: string }> = {};
    let plan: VideoPlan;

    if (args.platform === "youtube" && args.audioPath && args.script) {
      emit({ type: "log", step: "config", message: "Chế độ YouTube: Bỏ qua extract/screenshot." });
      const duration = await getAudioDurationSec(args.audioPath);
      plan = await planVideoFromScriptWithGemini(args.script, duration, args.geminiKey!, prefs);
    } else if (args.prompt) {
      emit({ type: "log", step: "config", message: "Chế độ Prompt: Bỏ qua extract/screenshot." });
      if (args.planFile) {
        plan = normalizePlan(VideoPlanSchema.parse(JSON.parse(await fs.readFile(args.planFile, "utf-8"))) as VideoPlan, prefs);
      } else if (args.geminiKey) {
        plan = await planVideoFromPromptWithGemini(args.prompt, args.geminiKey, prefs);
      } else {
        throw new Error("Chế độ Prompt hiện tại chỉ hỗ trợ Gemini. Vui lòng cung cấp GEMINI_API_KEY.");
      }
    } else if (args.url) {
      const res = await extractArticle(args.url, baseOut);
      browser = res.browser;
      page = res.page;
      articleJson = res.articleJson;
      
      screenshotsMeta = await captureScreenshots(page, baseOut, articleJson.paragraphs);
      const sourceText = articleJson.text || articleJson.paragraphs.map((p: { text: string }) => p.text).join("\n");

      if (args.planFile) {
        plan = normalizePlan(VideoPlanSchema.parse(JSON.parse(await fs.readFile(args.planFile, "utf-8"))) as VideoPlan, prefs);
      } else if (args.geminiKey) {
        plan = await planVideoWithGemini(sourceText, articleJson.title, args.geminiKey, prefs);
      } else {
        plan = await planVideoWithOpenAI(sourceText, articleJson.title, args.openaiKey!, prefs);
      }
    } else {
      throw new Error("Phải cung cấp --url hoặc --prompt.");
    }

    // Fetch B-roll videos if any scenes use layout: "broll" and we have pexelsKey
    const brollScenes = plan.scenes.filter((s) => s.layout === "broll" && s.pexels_query);
    if (brollScenes.length > 0) {
      if (args.pexelsKey) {
        emit({ type: "step_start", step: "fetch_broll", count: brollScenes.length });
        const brollsDir = path.join(baseOut, "brolls");
        await ensureDir(brollsDir);

        for (const scene of brollScenes) {
          const query = scene.pexels_query!;
          const outPath = path.join(brollsDir, `scene_${scene.id}.mp4`);
          emit({ type: "log", step: "fetch_broll", message: `Fetching Pexels B-roll for scene ${scene.id} with query: "${query}"` });
          try {
            const orientation = args.platform === "youtube" ? "landscape" : "portrait";
            await fetchPexelsVideo(query, args.pexelsKey, outPath, orientation);
            scene.broll_path = outPath;
            emit({ type: "log", step: "fetch_broll", message: `Successfully downloaded B-roll for scene ${scene.id}: ${outPath}` });
          } catch (e) {
            emit({
              type: "log",
              step: "fetch_broll",
              message: `Failed to download B-roll for scene ${scene.id}: ${e instanceof Error ? e.message : String(e)}. Fallback to big_callout.`,
            });
            scene.layout = "big_callout";
          }
        }
        emit({ type: "step_done", step: "fetch_broll" });
      } else {
        emit({
          type: "log",
          step: "fetch_broll",
          message: "Warning: Pexels API key not provided, falling back all broll scenes to big_callout layout.",
        });
        for (const scene of brollScenes) {
          scene.layout = "big_callout";
        }
      }
    }

    const audioPathRaw = path.join(baseOut, "tts", "voiceover.raw.wav");
    const audioPath = path.join(baseOut, "tts", "voiceover.wav");
    let fittedAudioPath = audioPathRaw;

    if (args.audioPath) {
      emit({ type: "log", step: "tts", message: "Chế độ Audio: Bỏ qua TTS, dùng file upload." });
      await ensureDir(path.join(baseOut, "tts"));
      await execFileP("ffmpeg", ["-y", "-i", args.audioPath, audioPathRaw]);
      fittedAudioPath = audioPathRaw;
    } else {
      const ttsProvider =
        args.tts ??
        (args.geminiKey ? "gemini" : args.openaiKey ? "openai" : "macos");

      for (let retry = 0; retry < 3; retry++) {
        const voiceover = plan.scenes.map((s) => s.voiceover.trim()).join("\n");
        const ttsInput = plan.audio_prompt ? plan.audio_prompt : voiceover;

        if (ttsProvider === "gemini") {
          if (!args.geminiKey) throw new Error("tts=gemini nhưng thiếu GEMINI_API_KEY.");
          await geminiTtsToWav(ttsInput, audioPathRaw, args.geminiKey, args.voice);
        } else if (ttsProvider === "openai") {
          if (!args.openaiKey) throw new Error("tts=openai nhưng thiếu OPENAI_API_KEY.");
          await openaiTtsToWav(voiceover, audioPathRaw, args.openaiKey);
        } else {
          await macosSayTtsToWav(voiceover, audioPathRaw);
        }

        const planTotalSec = plan.scenes.reduce((s, sc) => s + (sc.duration_sec ?? 0), 0);
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
        plan = await rewritePlanVoiceoverWithGemini(plan, planTotalSec, args.geminiKey, prefs);
        emit({
          type: "log",
          step: "plan_rewrite",
          message: `Đã rút gọn voiceover lần ${retry + 1} để giữ tốc đọc <= 1.5x`,
        });
      }
    }

    await ensureDir(path.join(baseOut, "plan"));
    await writeJson(path.join(baseOut, "plan", "video_plan.json"), plan);

    const mp4 = await renderRemotionVideo(baseOut, plan, fittedAudioPath, screenshotsMeta, prefs);
    await qc(baseOut, mp4);

    if (browser) await browser.close();
    emit({ type: "done", projectDir: baseOut, mp4 });
  } catch (err) {
    emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
