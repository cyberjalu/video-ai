import { KeyRound, Palette, Save, Speaker, Folder, LayoutGrid } from "lucide-react";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/Buttons";
import type { LayoutMode, RenderOptions } from "../lib/types";
import { PageTransition } from "../components/PageTransition";

export function SettingsPage({
  geminiKey,
  onChangeGeminiKey,
  pexelsKey,
  onChangePexelsKey,
  options,
  onChangeOptions,
  onSave,
}: {
  geminiKey: string;
  onChangeGeminiKey: (v: string) => void;
  pexelsKey: string;
  onChangePexelsKey: (v: string) => void;
  options: RenderOptions;
  onChangeOptions: (v: RenderOptions) => void;
  onSave: () => void;
}) {
  return (
    <PageTransition className="mx-auto w-full max-w-[980px] space-y-5">
      <Card className="p-6">
        <div>
          <div className="text-lg font-semibold text-zinc-100">Settings</div>
          <div className="mt-1 text-sm text-zinc-400">
            Configure ClipNews. API keys are stored locally in this browser profile (localStorage).
            ClipNews is free and open source — no license key required.
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <KeyRound className="h-4 w-4 text-zinc-300" />
          API keys
        </div>
        <div className="mt-4 grid gap-5">
          <label className="grid gap-2">
            <div className="text-xs font-semibold text-zinc-300">Gemini API key</div>
            <input
              value={geminiKey}
              onChange={(e) => onChangeGeminiKey(e.currentTarget.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400/50"
              placeholder="Paste your Gemini API key…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              type="password"
            />
            <div className="text-xs text-zinc-400">
              Required for script planning and TTS. Get a key at Google AI Studio.
            </div>
          </label>

          <label className="grid gap-2">
            <div className="text-xs font-semibold text-zinc-300">Pexels API key (optional)</div>
            <input
              value={pexelsKey}
              onChange={(e) => onChangePexelsKey(e.currentTarget.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400/50"
              placeholder="Paste your Pexels API key…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              type="password"
            />
            <div className="text-xs text-zinc-400 space-y-1.5">
              <p>
                Used to auto-fill empty scenes with stock photos and videos. Get a free key at{" "}
                <a
                  href="https://www.pexels.com/api/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline-offset-2 hover:underline"
                >
                  pexels.com/api
                </a>
                .
              </p>
              <p>
                <a
                  href="https://www.pexels.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline-offset-2 hover:underline"
                >
                  Photos provided by Pexels
                </a>
                . Credit photographers when possible. Default rate limit: 200 requests/hour.
              </p>
            </div>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Folder className="h-4 w-4 text-zinc-300" />
          Output folder
        </div>
        <div className="mt-3 text-sm text-zinc-400">
          Videos are saved under the project <code className="text-zinc-300">./output</code> directory
          (next to the repo root when running from source).
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Palette className="h-4 w-4 text-zinc-300" />
            AI Models
          </div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <div className="text-xs font-semibold text-zinc-300">Content Model</div>
              <select
                value={options.contentModel ?? "gemini-3.5-flash"}
                onChange={(e) => onChangeOptions({ ...options, contentModel: e.currentTarget.value })}
                className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400/50"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              </select>
            </label>
            <label className="grid gap-2">
              <div className="text-xs font-semibold text-zinc-300">Audio Model</div>
              <select
                value={options.audioModel ?? "gemini-3.1-flash-tts-preview"}
                onChange={(e) => onChangeOptions({ ...options, audioModel: e.currentTarget.value })}
                className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400/50"
              >
                <option value="gemini-3.1-flash-tts-preview">Gemini 3.1 Flash TTS Preview</option>
                <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash TTS Preview</option>
              </select>
            </label>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Speaker className="h-4 w-4 text-zinc-300" />
            Voice style
          </div>
          <div className="mt-4 grid gap-2">
            <select
              value={options.voice ?? "Zephyr"}
              onChange={(e) => onChangeOptions({ ...options, voice: e.currentTarget.value })}
              className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400/50"
            >
              <option value="Achernar">Achernar – Soft</option>
              <option value="Achird">Achird – Friendly</option>
              <option value="Algenib">Algenib – Gravelly</option>
              <option value="Algieba">Algieba – Smooth</option>
              <option value="Alnilam">Alnilam – Firm</option>
              <option value="Aoede">Aoede – Breezy</option>
              <option value="Autonoe">Autonoe – Bright</option>
              <option value="Callirrhoe">Callirrhoe – Easy-going</option>
              <option value="Charon">Charon – Informative</option>
              <option value="Despina">Despina – Smooth</option>
              <option value="Enceladus">Enceladus – Breathy</option>
              <option value="Erinome">Erinome – Clear</option>
              <option value="Fenrir">Fenrir – Excitable</option>
              <option value="Gacrux">Gacrux – Mature</option>
              <option value="Iapetus">Iapetus – Clear</option>
              <option value="Kore">Kore – Firm</option>
              <option value="Laomedeia">Laomedeia – Upbeat</option>
              <option value="Leda">Leda – Youthful</option>
              <option value="Orus">Orus – Firm</option>
              <option value="Puck">Puck – Upbeat</option>
              <option value="Pulcherrima">Pulcherrima – Forward</option>
              <option value="Rasalgethi">Rasalgethi – Informative</option>
              <option value="Sadachbia">Sadachbia – Lively</option>
              <option value="Sadaltager">Sadaltager – Knowledgeable</option>
              <option value="Schedar">Schedar – Even</option>
              <option value="Sulafat">Sulafat – Warm</option>
              <option value="Umbriel">Umbriel – Easy-going</option>
              <option value="Vindemiatrix">Vindemiatrix – Gentle</option>
              <option value="Zephyr">Zephyr – Bright</option>
              <option value="Zubenelgenubi">Zubenelgenubi – Casual</option>
            </select>
            <div className="text-xs text-zinc-400">Select the Gemini TTS voice used for narration.</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm font-semibold text-zinc-100">Default video length</div>
          <div className="mt-4 grid gap-2">
            <select
              value={options.preset}
              onChange={(e) => onChangeOptions({ ...options, preset: e.currentTarget.value as RenderOptions["preset"] })}
              className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400/50"
            >
              <option value="deep_explainer">Deep explainer (80–120s)</option>
              <option value="news_60_80">News explainer (60–80s)</option>
              <option value="ultra_25_35">Ultra short (25–35s)</option>
            </select>
            <div className="text-xs text-zinc-400">Used as the default render preset.</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <LayoutGrid className="h-4 w-4 text-zinc-300" />
            Layout & overlays
          </div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <div className="text-xs font-semibold text-zinc-300">Layout mode</div>
              <select
                value={options.layout_mode}
                onChange={(e) =>
                  onChangeOptions({ ...options, layout_mode: e.currentTarget.value as LayoutMode })
                }
                className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400/50"
              >
                <option value="tri">Tri (screenshot / callout / split + b-roll)</option>
                <option value="dual">Dual</option>
                <option value="mono">Mono (screenshot / b-roll)</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={options.enable_callouts}
                onChange={(e) => onChangeOptions({ ...options, enable_callouts: e.currentTarget.checked })}
                className="h-4 w-4 rounded border-white/20 bg-black/40"
              />
              Enable callout chips
            </label>
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={options.enable_progress}
                onChange={(e) => onChangeOptions({ ...options, enable_progress: e.currentTarget.checked })}
                className="h-4 w-4 rounded border-white/20 bg-black/40"
              />
              Enable progress bar in video
            </label>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-400">Changes apply immediately for new renders.</div>
          <PrimaryButton onClick={onSave}>
            <Save className="h-4 w-4" />
            Save settings
          </PrimaryButton>
        </div>
      </Card>
    </PageTransition>
  );
}
