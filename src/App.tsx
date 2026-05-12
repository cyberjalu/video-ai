import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

type RenderPreset = "deep_explainer" | "news_60_80" | "ultra_25_35";
type LayoutMode = "tri" | "mono" | "dual";

type RenderOptions = {
  preset: RenderPreset;
  enable_callouts: boolean;
  enable_progress: boolean;
  layout_mode: LayoutMode;
};

const DEFAULT_OPTIONS: RenderOptions = {
  preset: "deep_explainer",
  enable_callouts: true,
  enable_progress: true,
  layout_mode: "tri",
};

function App() {
  const [url, setUrl] = useState(
    "https://openai.com/index/gpt-5-5-with-trusted-access-for-cyber/",
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_OPTIONS);
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("GEMINI_API_KEY") ?? "";
    const preset = (localStorage.getItem("RENDER_PRESET") as RenderPreset | null) ?? DEFAULT_OPTIONS.preset;
    const layoutMode = (localStorage.getItem("RENDER_LAYOUT_MODE") as LayoutMode | null) ?? DEFAULT_OPTIONS.layout_mode;
    const enableCallouts = localStorage.getItem("RENDER_ENABLE_CALLOUTS");
    const enableProgress = localStorage.getItem("RENDER_ENABLE_PROGRESS");

    setGeminiKey(saved);
    setOptions({
      preset: ["deep_explainer", "news_60_80", "ultra_25_35"].includes(preset)
        ? preset
        : DEFAULT_OPTIONS.preset,
      layout_mode: ["tri", "mono", "dual"].includes(layoutMode)
        ? layoutMode
        : DEFAULT_OPTIONS.layout_mode,
      enable_callouts:
        enableCallouts == null ? DEFAULT_OPTIONS.enable_callouts : enableCallouts === "true",
      enable_progress:
        enableProgress == null ? DEFAULT_OPTIONS.enable_progress : enableProgress === "true",
    });
  }, []);

  useEffect(() => {
    let un1: null | (() => void) = null;
    let un2: null | (() => void) = null;
    let un3: null | (() => void) = null;
    (async () => {
      un1 = await listen<string>("render_log", (e) => {
        setLog((prev) => (prev ? `${prev}\n${e.payload}` : e.payload));
      });
      un2 = await listen<number>("render_done", (e) => {
        setLog((prev) => `${prev}\n\n✅ Render xong (exit code ${e.payload}).`);
      });
      un3 = await listen<string>("render_error", (e) => {
        setLog((prev) => `${prev}\n\n❌ ${e.payload}`);
      });
    })();
    return () => {
      un1?.();
      un2?.();
      un3?.();
    };
  }, []);

  const renderCmd = useMemo(() => {
    const redacted = geminiKey ? "<GEMINI_API_KEY>" : "<SET_GEMINI_API_KEY>";
    return `cd url-to-tiktok-video-tauri\nGEMINI_API_KEY=${redacted} npm run worker:render -- --url "${url}" --preset "${options.preset}" --enableCallouts "${String(options.enable_callouts)}" --enableProgress "${String(options.enable_progress)}" --layoutMode "${options.layout_mode}"`;
  }, [url, geminiKey, options]);

  function saveSettings() {
    localStorage.setItem("GEMINI_API_KEY", geminiKey.trim());
    localStorage.setItem("RENDER_PRESET", options.preset);
    localStorage.setItem("RENDER_LAYOUT_MODE", options.layout_mode);
    localStorage.setItem("RENDER_ENABLE_CALLOUTS", String(options.enable_callouts));
    localStorage.setItem("RENDER_ENABLE_PROGRESS", String(options.enable_progress));
    setIsSettingsOpen(false);
  }

  return (
    <main className="container">
      <header className="app-header">
        <div>
          <h1>URL → Video TikTok (Demo)</h1>
          <p className="sub">
            Render MP4 dọc 1080×1920, caption tiếng Việt, font Montserrat, TTS bằng Gemini.
          </p>
        </div>
        <button onClick={() => setIsSettingsOpen(true)}>Settings</button>
      </header>

      <section className="panel">
        <label>
          URL bài viết
          <input value={url} onChange={(e) => setUrl(e.currentTarget.value)} />
        </label>
        <div className="row">
          <button
            onClick={async () => {
              setLog("");
              const key = (localStorage.getItem("GEMINI_API_KEY") ?? "").trim();
              if (!key) {
                setIsSettingsOpen(true);
                setLog("❌ Bạn cần nhập GEMINI_API_KEY trong Settings trước.");
                return;
              }
              try {
                await invoke("start_render", {
                  url,
                  gemini_api_key: key,
                  options,
                });
                setLog("⏳ Đã bắt đầu render... (log sẽ chạy ở dưới)\n");
              } catch (e) {
                setLog(`❌ Không start được render: ${String(e)}`);
              }
            }}
          >
            Render
          </button>
          <button
            className="secondary"
            onClick={() => navigator.clipboard.writeText(renderCmd)}
          >
            Copy lệnh render
          </button>
        </div>

        <pre className="code">{renderCmd}</pre>
      </section>

      <section className="panel">
        <h3>Log</h3>
        <textarea readOnly value={log} placeholder="Log sẽ hiển thị ở đây..." />
      </section>

      {isSettingsOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Settings</h2>
            <label>
              Gemini API key (GEMINI_API_KEY)
              <input
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.currentTarget.value)}
                placeholder="Nhập GEMINI_API_KEY..."
              />
            </label>
            <p className="hint">
              Key được lưu local trong app (localStorage). TTS dùng model{" "}
              <code>gemini-3.1-flash-tts-preview</code>.
            </p>
            <label>
              Viral preset
              <select
                value={options.preset}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, preset: e.currentTarget.value as RenderPreset }))
                }
              >
                <option value="deep_explainer">Deep explainer (80–120s)</option>
                <option value="news_60_80">News explainer (60–80s)</option>
                <option value="ultra_25_35">Ultra short (25–35s)</option>
              </select>
            </label>
            <label>
              Layout mode
              <select
                value={options.layout_mode}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, layout_mode: e.currentTarget.value as LayoutMode }))
                }
              >
                <option value="tri">Tri layout (đa dạng 3 kiểu)</option>
                <option value="dual">Dual layout (2 kiểu)</option>
                <option value="mono">Mono layout (1 kiểu)</option>
              </select>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={options.enable_callouts}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, enable_callouts: e.currentTarget.checked }))
                }
              />
              Bật callout chips (1–2/scene)
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={options.enable_progress}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, enable_progress: e.currentTarget.checked }))
                }
              />
              Bật progress badge (3/10)
            </label>
            <div className="row">
              <button onClick={saveSettings}>Lưu</button>
              <button className="secondary" onClick={() => setIsSettingsOpen(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
