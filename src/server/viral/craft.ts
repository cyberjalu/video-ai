import { GoogleGenAI } from "@google/genai";
import type { VideoPlan } from "@/lib/domain/types";

export type CraftCriterionId =
  | "hook_specific"
  | "hook_promise"
  | "novelty"
  | "rehook_escalate"
  | "proof_beat"
  | "cta_reason"
  | "anti_brochure"
  | "no_fabrication";

export type StoryBeat = {
  sceneId: string;
  role: string;
  summary: string;
  hasProofCue: boolean;
};

export type CraftCriterionResult = {
  id: CraftCriterionId;
  pass: boolean;
  weight: number;
  reason?: string;
};

export type CraftReport = {
  pass: boolean;
  score: number;
  threshold: number;
  criteria: CraftCriterionResult[];
  reasons: string[];
  beats?: StoryBeat[];
  mode: "light" | "full";
  judgedBy: "heuristics" | "heuristics+llm";
  rewritten: boolean;
  skippedRewrite?: boolean;
  createdAt: string;
};

export type CraftQcOptions = {
  mode?: "light" | "full";
  sourceText?: string;
  hasSourceScreenshots?: boolean;
  geminiKey?: string;
  contentModel?: string;
  rewritten?: boolean;
  skippedRewrite?: boolean;
};

const BROCHURE_PHRASES = [
  "bạn xứng đáng hơn",
  "đừng chần chừ",
  "quên cách cũ đi",
  "giải quyết tất cả",
  "toàn diện",
  "siêu nhanh",
  "you deserve better",
  "don't wait",
  "game changer",
  "next level",
  "transform your",
];

const CTA_ACTION =
  /\b(thử|star|follow|comment|đăng ký|mở|tải|dùng|try|download|click|join|share|github)\b/i;

function craftEnabled(): boolean {
  const v = process.env.CRAFT_QC?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): Set<string> {
  return new Set(
    norm(s)
      .split(" ")
      .filter((w) => w.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sceneText(scene: VideoPlan["scenes"][number]): string {
  return [...(scene.caption_lines ?? []), scene.voiceover ?? "", ...(scene.callouts ?? [])].join(" ");
}

function hasDigitOrMetric(text: string): boolean {
  return /\d/.test(text) || /\b(api|ci\/cd|pr|poc|proof|exploit|bug|lỗ hổng|pentest)\b/i.test(text);
}

function hasNamedAction(text: string): boolean {
  // Concrete verb+object patterns common in VI/EN tool demos
  return /\b(mất|bỏ sót|quét|sửa|merge|deploy|scan|fix|miss|waste|manual|thủ công|tự động)\b/i.test(
    text,
  );
}

export function distillBeats(plan: VideoPlan): StoryBeat[] {
  return plan.scenes.map((s) => ({
    sceneId: s.id,
    role: s.role,
    summary: (s.caption_lines?.join(" ") || s.voiceover || "").slice(0, 160),
    hasProofCue:
      s.layout === "screenshot" ||
      s.layout === "stat" ||
      s.layout === "bar_chart" ||
      Boolean(s.screenshot_path || s.screenshot_file),
  }));
}

function checkHookSpecific(plan: VideoPlan): CraftCriterionResult {
  const hook = plan.scenes.find((s) => s.role === "hook");
  const weight = 20;
  if (!hook) {
    return { id: "hook_specific", pass: false, weight, reason: "Thiếu scene hook" };
  }
  const text = sceneText(hook);
  const specific = hasDigitOrMetric(text) || hasNamedAction(text);
  const onlyQuestion =
    /^\s*[^?]+\?\s*$/.test((hook.caption_lines ?? []).join(" ")) && !hasDigitOrMetric(text);
  const pass = specific && !onlyQuestion;
  return {
    id: "hook_specific",
    pass,
    weight,
    reason: pass
      ? undefined
      : "Hook thiếu chi tiết cụ thể (số / hành động định danh) — tránh câu hỏi chung",
  };
}

function checkHookPromise(plan: VideoPlan): CraftCriterionResult {
  const hook = plan.scenes.find((s) => s.role === "hook");
  const weight = 10;
  if (!hook) {
    return { id: "hook_promise", pass: false, weight, reason: "Thiếu scene hook" };
  }
  const lines = (hook.caption_lines ?? []).filter((l) => l.trim());
  const blob = lines.join(" ");
  const pass = lines.length >= 1 && blob.length >= 12 && !/^(wow|omg|hot)\b/i.test(blob);
  return {
    id: "hook_promise",
    pass,
    weight,
    reason: pass ? undefined : "Caption hook chưa truyền được vấn đề / hướng giải trong 1–2 dòng",
  };
}

function checkNovelty(plan: VideoPlan): CraftCriterionResult {
  const weight = 15;
  const scenes = plan.scenes;
  if (scenes.length < 2) {
    return { id: "novelty", pass: true, weight };
  }
  let repeats = 0;
  for (let i = 1; i < scenes.length; i++) {
    const prev = tokenize(sceneText(scenes[i - 1]!));
    const cur = tokenize(sceneText(scenes[i]!));
    if (jaccard(prev, cur) >= 0.55) repeats += 1;
  }
  const repeatRatio = repeats / (scenes.length - 1);
  const pass = repeatRatio <= 0.25;
  return {
    id: "novelty",
    pass,
    weight,
    reason: pass
      ? undefined
      : `Quá nhiều scene lặp ý (≈${Math.round(repeatRatio * 100)}% cặp liền kề giống nhau)`,
  };
}

function checkRehookEscalate(plan: VideoPlan): CraftCriterionResult {
  const weight = 25;
  const hook = plan.scenes.find((s) => s.role === "hook");
  const rehook = plan.scenes.find((s) => s.role === "re_hook");
  if (!rehook) {
    return {
      id: "rehook_escalate",
      pass: false,
      weight,
      reason: "Thiếu scene re_hook",
    };
  }
  if (!hook) {
    return { id: "rehook_escalate", pass: false, weight, reason: "Thiếu scene hook để so escalate" };
  }
  const sim = jaccard(tokenize(sceneText(hook)), tokenize(sceneText(rehook)));
  const reNorm = norm(sceneText(rehook));
  // Product-reveal paraphrases of the hook — fail even if token overlap is low.
  const paraphraseBrand =
    reNorm.includes("quen cach cu") ||
    reNorm.includes("da co ") ||
    reNorm.includes("forget the old") ||
    /\bmeet\b/.test(reNorm);
  const pass = sim < 0.45 && !paraphraseBrand;
  return {
    id: "rehook_escalate",
    pass,
    weight,
    reason: pass
      ? undefined
      : "re_hook gần như paraphrase hook — cần đổi góc / tăng tension",
  };
}

function checkProofBeat(
  plan: VideoPlan,
  hasSourceScreenshots?: boolean,
): CraftCriterionResult {
  const weight = 15;
  const proofScenes = plan.scenes.filter(
    (s) =>
      s.layout === "screenshot" ||
      s.layout === "stat" ||
      s.layout === "bar_chart" ||
      s.role === "evidence" ||
      s.role === "what_happened",
  );
  const softProof = plan.scenes.some((s) =>
    /\b(\d+|%|so với|before|after|chứng|proof|demo)\b/i.test(sceneText(s)),
  );
  const shotCount = plan.scenes.filter(
    (s) => s.layout === "screenshot" || s.screenshot_path || s.screenshot_file,
  ).length;

  let pass = proofScenes.length >= 1 || softProof;
  let reason: string | undefined;
  if (hasSourceScreenshots && shotCount < 2) {
    pass = false;
    reason = "Có ảnh nguồn nhưng chưa gắn ≥2 scene screenshot/proof";
  } else if (!pass) {
    reason = "Thiếu beat bằng chứng (screenshot / stat / so sánh)";
  }
  return { id: "proof_beat", pass, weight, reason };
}

function checkCtaReason(plan: VideoPlan): CraftCriterionResult {
  const weight = 10;
  const take = [...plan.scenes].reverse().find((s) => s.role === "takeaway") ?? plan.scenes.at(-1);
  if (!take) {
    return { id: "cta_reason", pass: false, weight, reason: "Thiếu scene takeaway" };
  }
  const text = sceneText(take);
  const hasAction = CTA_ACTION.test(text);
  const hasReason =
    /\b(vì|để|so that|because|giúp|tránh|nhanh hơn|for )\b/i.test(text) || text.length > 40;
  const pass = hasAction && hasReason;
  return {
    id: "cta_reason",
    pass,
    weight,
    reason: pass ? undefined : "CTA thiếu hành động rõ hoặc lý do gắn beat trước",
  };
}

function checkAntiBrochure(plan: VideoPlan): CraftCriterionResult {
  const weight = 10;
  const all = plan.scenes.map(sceneText).join(" \n ");
  const hits = BROCHURE_PHRASES.filter((p) => norm(all).includes(norm(p)));
  const pass = hits.length <= 1;
  return {
    id: "anti_brochure",
    pass,
    weight,
    reason: pass
      ? undefined
      : `Giọng brochure / slogan rỗng: ${hits.slice(0, 3).join(", ")}`,
  };
}

function checkNoFabrication(plan: VideoPlan, sourceText?: string): CraftCriterionResult {
  const weight = 15;
  if (!sourceText?.trim()) {
    return { id: "no_fabrication", pass: true, weight };
  }
  const source = norm(sourceText);
  const sourceNums = new Set((sourceText.match(/\d+(?:[.,]\d+)?%?/g) ?? []).map((n) => n.replace(",", ".")));
  const planNums = new Set(
    plan.scenes
      .flatMap((s) => sceneText(s).match(/\d+(?:[.,]\d+)?%?/g) ?? [])
      .map((n) => n.replace(",", ".")),
  );
  const invented: string[] = [];
  for (const n of planNums) {
    if (n.length >= 2 && !sourceNums.has(n) && !source.includes(norm(n))) {
      // allow small scene indexes / durations style numbers in captions rarely — skip 1-digit
      if (Number(n.replace("%", "")) > 12 || n.includes("%")) invented.push(n);
    }
  }
  const pass = invented.length === 0;
  return {
    id: "no_fabrication",
    pass,
    weight,
    reason: pass
      ? undefined
      : `Số liệu có thể bịa (không thấy trong nguồn): ${invented.slice(0, 4).join(", ")}`,
  };
}

export function runCraftQcHeuristics(
  plan: VideoPlan,
  options: CraftQcOptions = {},
): CraftReport {
  const mode = options.mode ?? "full";
  const threshold = 70;
  const criteria: CraftCriterionResult[] = [];

  criteria.push(checkHookSpecific(plan));
  criteria.push(checkAntiBrochure(plan));
  criteria.push(checkNoFabrication(plan, options.sourceText));

  if (mode === "full") {
    criteria.push(checkHookPromise(plan));
    criteria.push(checkNovelty(plan));
    criteria.push(checkRehookEscalate(plan));
    criteria.push(checkProofBeat(plan, options.hasSourceScreenshots));
    criteria.push(checkCtaReason(plan));
  }

  let score = 100;
  const reasons: string[] = [];
  for (const c of criteria) {
    if (!c.pass) {
      score -= c.weight;
      if (c.reason) reasons.push(c.reason);
    }
  }
  score = Math.max(0, Math.min(100, score));

  const mandatory = criteria.filter((c) =>
    mode === "full"
      ? c.id === "hook_specific" || c.id === "rehook_escalate" || c.id === "no_fabrication"
      : c.id === "hook_specific" || c.id === "no_fabrication",
  );
  const mandatoryOk = mandatory.every((c) => c.pass);
  const pass = score >= threshold && mandatoryOk;

  return {
    pass,
    score,
    threshold,
    criteria,
    reasons: reasons.slice(0, 8),
    beats: distillBeats(plan),
    mode,
    judgedBy: "heuristics",
    rewritten: Boolean(options.rewritten),
    skippedRewrite: options.skippedRewrite,
    createdAt: new Date().toISOString(),
  };
}

type LlmJudge = {
  noveltyPass?: boolean;
  escalatePass?: boolean;
  noveltyReason?: string;
  escalateReason?: string;
};

async function judgeNoveltyEscalate(
  plan: VideoPlan,
  geminiKey: string,
  contentModel?: string,
): Promise<LlmJudge | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const scenes = plan.scenes
      .map((s) => `${s.id}|${s.role}|${(s.caption_lines ?? []).join(" / ")}`)
      .join("\n");
    const prompt = `You grade TikTok script craft. Return ONLY JSON:
{"noveltyPass":boolean,"escalatePass":boolean,"noveltyReason":"short vi","escalateReason":"short vi"}
Rules:
- noveltyPass=true if >=75% scenes add a NEW beat (not paraphrase of previous).
- escalatePass=true if re_hook changes angle/tension vs hook (not "forget old way / use product" paraphrase).
Scenes:
${scenes}`;
    const res = await ai.models.generateContent({
      model: contentModel || "gemini-2.5-flash",
      contents: prompt,
    });
    const text = res.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as LlmJudge;
  } catch {
    return null;
  }
}

function applyLlmJudge(report: CraftReport, judge: LlmJudge): CraftReport {
  const criteria = report.criteria.map((c) => {
    if (c.id === "novelty" && typeof judge.noveltyPass === "boolean") {
      return {
        ...c,
        pass: judge.noveltyPass,
        reason: judge.noveltyPass ? undefined : judge.noveltyReason || c.reason,
      };
    }
    if (c.id === "rehook_escalate" && typeof judge.escalatePass === "boolean") {
      return {
        ...c,
        pass: judge.escalatePass,
        reason: judge.escalatePass ? undefined : judge.escalateReason || c.reason,
      };
    }
    return c;
  });
  let score = 100;
  const reasons: string[] = [];
  for (const c of criteria) {
    if (!c.pass) {
      score -= c.weight;
      if (c.reason) reasons.push(c.reason);
    }
  }
  score = Math.max(0, Math.min(100, score));
  const mandatoryOk = criteria
    .filter((c) => c.id === "hook_specific" || c.id === "rehook_escalate" || c.id === "no_fabrication")
    .every((c) => c.pass);
  return {
    ...report,
    criteria,
    score,
    reasons: reasons.slice(0, 8),
    pass: score >= report.threshold && mandatoryOk,
    judgedBy: "heuristics+llm",
  };
}

export async function runCraftQc(
  plan: VideoPlan,
  options: CraftQcOptions = {},
): Promise<CraftReport | null> {
  if (!craftEnabled()) return null;
  let report = runCraftQcHeuristics(plan, options);
  const needJudge =
    options.mode !== "light" &&
    Boolean(options.geminiKey?.trim()) &&
    (!report.pass ||
      report.criteria.some(
        (c) => (c.id === "novelty" || c.id === "rehook_escalate") && !c.pass,
      ));
  if (needJudge && options.geminiKey) {
    const judge = await judgeNoveltyEscalate(plan, options.geminiKey, options.contentModel);
    if (judge) report = applyLlmJudge(report, judge);
  }
  return report;
}

export function buildCraftRewriteAppendix(report: CraftReport): string {
  const lines = report.reasons.length
    ? report.reasons.map((r) => `- ${r}`).join("\n")
    : report.criteria
        .filter((c) => !c.pass)
        .map((c) => `- ${c.id}: ${c.reason ?? "fail"}`)
        .join("\n");
  return `

FIX CRAFT (director-level — mandatory):
${lines}
Rules: specific hook (number or named situation); each scene adds a NEW beat; re_hook MUST escalate angle (not paraphrase hook); proof beats tied to source; takeaway = clear action + reason; conversational voice — ban empty brochure slogans; NEVER invent stats/names not in source/prompt.`;
}

export function craftModeForPreset(preset?: string, templateId?: string): "light" | "full" {
  if (preset === "viral_30_45" || templateId === "viral-fast") return "full";
  return "light";
}
