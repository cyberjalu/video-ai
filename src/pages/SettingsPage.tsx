import { KeyRound, Palette, Save, Speaker, Folder, Ticket } from "lucide-react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import type { RenderOptions } from "../lib/types";

export function SettingsPage({
  geminiKey,
  onChangeGeminiKey,
  licenseKey,
  onChangeLicenseKey,
  licenseStatus,
  options,
  onChangeOptions,
  onSave,
}: {
  geminiKey: string;
  onChangeGeminiKey: (v: string) => void;
  licenseKey: string;
  onChangeLicenseKey: (v: string) => void;
  licenseStatus: "Activated" | "Trial" | "Locked";
  options: RenderOptions;
  onChangeOptions: (v: RenderOptions) => void;
  onSave: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Settings</div>
            <div className="mt-1 text-sm text-zinc-400">
              Configure ClipNews AI. Keys are stored locally on this device.
            </div>
          </div>
          <Badge
            className={
              licenseStatus === "Activated"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : licenseStatus === "Locked"
                  ? "border-red-400/20 bg-red-400/10 text-red-200"
                  : "border-white/10 bg-white/5 text-zinc-200"
            }
          >
            {licenseStatus}
          </Badge>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <KeyRound className="h-4 w-4 text-zinc-300" />
          API key
        </div>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <div className="text-xs font-semibold text-zinc-300">Gemini API key</div>
            <input
              value={geminiKey}
              onChange={(e) => onChangeGeminiKey(e.currentTarget.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              placeholder="Paste your Gemini API key…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="text-xs text-zinc-400">
              ClipNews AI never shows a built-in master key. Use your own key, or activate a license when available.
            </div>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Ticket className="h-4 w-4 text-zinc-300" />
          License
        </div>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <div className="text-xs font-semibold text-zinc-300">License key</div>
            <input
              value={licenseKey}
              onChange={(e) => onChangeLicenseKey(e.currentTarget.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              placeholder="XXXX-XXXX-XXXX…"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled>
              <Ticket className="h-4 w-4" />
              Activate
            </SecondaryButton>
            <div className="text-xs text-zinc-400">
              Activation flow is a placeholder in this UI pass.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Folder className="h-4 w-4 text-zinc-300" />
            Output folder
          </div>
          <div className="mt-3 text-sm text-zinc-400">
            Videos are saved in the app’s output directory. Folder selection UI can be wired later.
          </div>
          <div className="mt-4">
            <SecondaryButton disabled className="w-full justify-center">
              Choose folder
            </SecondaryButton>
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
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
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
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
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
            <Palette className="h-4 w-4 text-zinc-300" />
            Theme
          </div>
          <div className="mt-4 grid gap-2">
            <select
              disabled
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200"
            >
              <option>Dark (default)</option>
            </select>
            <div className="text-xs text-zinc-400">Theme switcher is a placeholder in this UI pass.</div>
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
    </div>
  );
}

