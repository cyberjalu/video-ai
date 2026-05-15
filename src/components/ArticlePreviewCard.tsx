import { FileText, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "./Card";
import { Badge } from "./Badge";

function lengthBucket(words: number) {
  if (words < 350) return { label: "Short article", color: "text-sky-300", hint: "Quick, punchy video · ~25–35s" };
  if (words < 900) return { label: "Medium article", color: "text-violet-300", hint: "Balanced explainer · ~60–80s" };
  return { label: "Long article", color: "text-amber-300", hint: "Deeper breakdown · ~90–120s" };
}

export function ArticlePreviewCard({
  title,
  source,
  estimatedWords,
  suggestedScenes,
  suggestedDurationSec,
}: {
  title: string;
  source?: string;
  estimatedWords?: number;
  suggestedScenes?: number;
  suggestedDurationSec?: number;
}) {
  const bucket = estimatedWords ? lengthBucket(estimatedWords) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow-label mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Editorial Brief
            </div>
            <div className="display-title text-[24px] leading-none text-zinc-100">Source intake recognized</div>
          </div>
          {source ? (
            <Badge variant="muted" className="shrink-0 gap-1 text-[9px]">
              <Globe className="h-3 w-3" />
              {source}
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <div className="mt-4 text-base font-semibold leading-7 text-zinc-100 line-clamp-3">{title}</div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Word count / length */}
          <div className="surface-inset rounded-[20px] px-4 py-3">
            <div className="eyebrow-label">Length</div>
            <div className={`mt-1 text-sm font-bold ${bucket?.color ?? "text-zinc-300"}`}>
              {bucket ? bucket.label : "—"}
            </div>
            {estimatedWords ? (
              <div className="mt-0.5 text-[11px] text-zinc-600">{estimatedWords.toLocaleString()} words</div>
            ) : null}
            {bucket ? <div className="mt-1 text-[11px] text-zinc-600">{bucket.hint}</div> : null}
          </div>

          {/* Video plan */}
          <div className="surface-inset rounded-[20px] px-4 py-3">
            <div className="eyebrow-label">Plan</div>
            <div className="mt-1 text-sm font-bold text-zinc-200">
              {suggestedScenes ? `${suggestedScenes} scenes` : "—"}
              {suggestedDurationSec ? (
                <span className="ml-2 text-[11px] font-semibold text-zinc-500">{suggestedDurationSec}s</span>
              ) : null}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-zinc-600">
              Hook · key facts · proof · closing CTA
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
