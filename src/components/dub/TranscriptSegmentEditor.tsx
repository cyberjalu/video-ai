import { TranscriptSegment } from "../../lib/dubbing";
import { cn } from "../../lib/cn";

export function TranscriptSegmentEditor({
  segments,
  onChange,
  disabled,
}: {
  segments: TranscriptSegment[];
  onChange: (segs: TranscriptSegment[]) => void;
  disabled: boolean;
}) {
  const handleChange = (index: number, text: string) => {
    const next = [...segments];
    next[index] = { ...next[index], text };
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {segments.map((seg, i) => (
        <div key={seg.id} className="flex gap-3">
          <div className="mt-2 text-xs font-mono text-zinc-500 w-8 shrink-0 text-right">
            {i + 1}
          </div>
          <textarea
            value={seg.text}
            onChange={(e) => handleChange(i, e.target.value)}
            disabled={disabled}
            rows={2}
            className={cn(
              "flex-1 rounded-[14px] border bg-[rgba(6,7,10,0.72)] px-4 py-3 text-sm text-zinc-200 transition-all focus:outline-none resize-none",
              disabled ? "opacity-60 cursor-not-allowed border-transparent" : "border-white/[0.09] focus:border-red-400/40 focus:ring-1 focus:ring-red-400/10"
            )}
          />
        </div>
      ))}
      {segments.length === 0 && (
        <div className="text-sm text-zinc-500 italic py-4 text-center">
          No transcript segments available.
        </div>
      )}
    </div>
  );
}
