import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import wav from "wav";

const execFileP = (file: string, args: string[]) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout, stderr });
    });
  });

function emit(event: unknown) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

const ArgsSchema = z.object({
  action: z.enum(["extract", "transcribe", "tts", "merge"]),
  video: z.string().optional(),
  audio: z.string().optional(),
  text: z.string().optional(),
  outDir: z.string().optional(),
  voice: z.string().optional(),
  mode: z.enum(["replace", "duck"]).optional(),
  duckLevel: z.string().optional(),
});

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
  return ArgsSchema.parse(out);
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function extractAudio(videoPath: string, outDir: string) {
  emit({ type: "step_start", step: "extract_original_audio" });
  await ensureDir(outDir);
  const outAudioPath = path.join(outDir, "original_audio.wav");
  
  // Extract to 16kHz mono WAV for efficient transcription
  await execFileP("ffmpeg", [
    "-y",
    "-i", videoPath,
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", "16000",
    "-ac", "1",
    outAudioPath,
  ]);
  
  emit({ type: "step_done", step: "extract_original_audio", audioPath: outAudioPath });
}

async function transcribeAudio(audioPath: string, geminiKey: string) {
  emit({ type: "step_start", step: "transcribe_original" });
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  
  emit({ type: "log", step: "transcribe_original", message: "Uploading audio to Gemini..." });
  
  // Using the GoogleGenAI files API
  const uploadResult = await ai.files.upload({
    file: audioPath,
    mimeType: "audio/wav",
  });
  
  emit({ type: "log", step: "transcribe_original", message: "Audio uploaded. Generating transcript..." });
  
  const prompt = `You are a professional audio transcription service.
Transcribe the spoken Vietnamese audio accurately. 
Output ONLY a JSON array of objects representing sentences or logical segments, each with an 'id' and 'text'.
Do not output any markdown formatting, only the raw JSON array.
Example:
[
  { "id": "seg_1", "text": "Xin chào các bạn." },
  { "id": "seg_2", "text": "Hôm nay chúng ta sẽ cùng tìm hiểu về AI." }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
          { text: prompt },
        ],
      },
    ],
    config: {
      temperature: 0.2,
    }
  });

  // Clean up uploaded file
  try {
    await ai.files.delete({ name: uploadResult.name });
  } catch (e) {
    // Ignore cleanup errors
  }

  const rawText = response.text ?? "";
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON transcript from Gemini output.");
  }
  
  const segments = JSON.parse(jsonMatch[0]);
  emit({ type: "step_done", step: "transcribe_original", segments });
}

export function buildGeminiTtsPrompt(transcript: string) {
  return `# AUDIO PROFILE: Vietnamese Voiceover Narrator
## "Neutral Vietnamese Video Dub"

## THE SCENE:
A clean studio voiceover recording for a short-form video.
The delivery must sound natural, clear, modern, and trustworthy.
The speaker is recording for a Vietnamese audience and should sound like a standard Vietnam Vietnamese narrator.
No exaggerated acting, no theatrical performance, no cartoonish tone.

### DIRECTOR'S NOTES
Style:
- Natural and neutral Vietnamese voiceover
- Clear diction, smooth phrasing, and confident delivery
- Friendly but not overly emotional
- Suitable for narration and dubbing over user-uploaded videos

Pacing:
- Medium pace
- Short natural pauses between sentences
- Do not rush
- Keep timing suitable for voiceover syncing

Accent:
- Standard Vietnamese accent from Vietnam
- Pronunciation should be natural, clean, and easy to understand for a broad Vietnamese audience

### TRANSCRIPT
${transcript}`;
}

async function generateTts(text: string, outDir: string, geminiKey: string, voiceName: string) {
  emit({ type: "step_start", step: "generate_dub_tts" });
  await ensureDir(outDir);
  const outAudioPath = path.join(outDir, "dubbed_audio.wav");
  
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = buildGeminiTtsPrompt(text);

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || "Achird" },
        },
      },
    },
  });

  const dataB64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!dataB64) throw new Error("Không nhận được audio từ Gemini TTS.");
  const pcm = Buffer.from(dataB64, "base64");

  await new Promise<void>((resolve, reject) => {
    const writer = new wav.FileWriter(outAudioPath, {
      channels: 1,
      sampleRate: 24000,
      bitDepth: 16,
    });
    writer.on("finish", () => resolve());
    writer.on("error", (e) => reject(e));
    writer.write(pcm);
    writer.end();
  });

  emit({ type: "step_done", step: "generate_dub_tts", audioPath: outAudioPath });
}

async function mergeAudio(videoPath: string, audioPath: string, outDir: string, mode: "replace" | "duck", duckLevelStr?: string) {
  emit({ type: "step_start", step: "merge_dub_video" });
  await ensureDir(outDir);
  const outVideoPath = path.join(outDir, "final_dubbed_video.mp4");
  
  const duckLevel = duckLevelStr ? parseFloat(duckLevelStr) : 0.2;

  if (mode === "replace") {
    // Replace original audio completely
    await execFileP("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-map", "0:v:0", // Original video
      "-map", "1:a:0", // New audio
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outVideoPath,
    ]);
  } else {
    // Duck original audio
    await execFileP("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-filter_complex", `[0:a]volume=${duckLevel}[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[outa]`,
      "-map", "0:v:0",
      "-map", "[outa]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outVideoPath,
    ]);
  }

  emit({ type: "step_done", step: "merge_dub_video", mp4: outVideoPath });
}

async function main() {
  const args = parseArgs(process.argv);
  const geminiKey = process.env.GEMINI_API_KEY;

  try {
    if (args.action === "extract") {
      if (!args.video || !args.outDir) throw new Error("Missing --video or --outDir");
      await extractAudio(args.video, args.outDir);
    } 
    else if (args.action === "transcribe") {
      if (!args.audio || !geminiKey) throw new Error("Missing --audio or GEMINI_API_KEY");
      await transcribeAudio(args.audio, geminiKey);
    }
    else if (args.action === "tts") {
      if (!args.text || !args.outDir || !geminiKey) throw new Error("Missing --text, --outDir, or GEMINI_API_KEY");
      await generateTts(args.text, args.outDir, geminiKey, args.voice || "Achird");
    }
    else if (args.action === "merge") {
      if (!args.video || !args.audio || !args.outDir) throw new Error("Missing --video, --audio, or --outDir");
      await mergeAudio(args.video, args.audio, args.outDir, args.mode || "duck", args.duckLevel);
    }
  } catch (error) {
    emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

main().catch((err) => {
  emit({ type: "error", message: String(err) });
  process.exit(1);
});
