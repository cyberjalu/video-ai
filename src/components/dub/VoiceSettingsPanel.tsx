export function VoiceSettingsPanel({
  voice,
  onChangeVoice,
  mode,
  onChangeMode,
  duckLevel,
  onChangeDuckLevel,
  disabled,
}: {
  voice: string;
  onChangeVoice: (v: string) => void;
  mode: "replace" | "duck";
  onChangeMode: (m: "replace" | "duck") => void;
  duckLevel: number;
  onChangeDuckLevel: (l: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="text-sm font-semibold text-zinc-200 mb-2">Voice Settings</div>
      
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium text-zinc-400">Voice Model</span>
        <select
          value={voice}
          onChange={(e) => onChangeVoice(e.target.value)}
          disabled={disabled}
          className="rounded-[12px] border border-white/[0.09] bg-[rgba(6,7,10,0.72)] px-3 py-2 text-sm text-zinc-200 focus:border-red-400/40 focus:outline-none disabled:opacity-50"
        >
          <option value="Achird">Achird (Neutral Vietnamese)</option>
          <option value="Zephyr">Zephyr</option>
          <option value="Aoede">Aoede</option>
          <option value="Charon">Charon</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium text-zinc-400">Original Audio Mode</span>
        <select
          value={mode}
          onChange={(e) => onChangeMode(e.target.value as "replace" | "duck")}
          disabled={disabled}
          className="rounded-[12px] border border-white/[0.09] bg-[rgba(6,7,10,0.72)] px-3 py-2 text-sm text-zinc-200 focus:border-red-400/40 focus:outline-none disabled:opacity-50"
        >
          <option value="replace">Replace (Remove original audio)</option>
          <option value="duck">Duck (Keep original, lower volume)</option>
        </select>
      </label>

      {mode === "duck" && (
        <label className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-medium text-zinc-400">
            <span>Ducking Level</span>
            <span>{Math.round(duckLevel * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={duckLevel}
            onChange={(e) => onChangeDuckLevel(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full accent-red-400 disabled:opacity-50 cursor-pointer"
          />
        </label>
      )}
    </div>
  );
}
