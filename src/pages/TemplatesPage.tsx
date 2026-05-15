import { Check, Columns3 } from "lucide-react";
import { Card } from "../components/Card";
import type { RenderOptions, TemplateId } from "../lib/types";
import { cn } from "../lib/cn";
import { PageTransition } from "../components/PageTransition";

const TEMPLATES: Array<{
  id: TemplateId;
  name: string;
  description: string;
  tags: string[];
  colors: string[];
}> = [
  {
    id: "NewsStoryV1",
    name: "Cyberpunk Glitch",
    description: "Nền tối với glitch effect, text neon sáng (cyan, magenta), thích hợp cho content tech, crypto, trending.",
    tags: ["Tech", "Trendy", "Neon"],
    colors: ["bg-cyan-400", "bg-violet-500", "bg-black"],
  },
  {
    id: "CorporateNewsV1",
    name: "Corporate Slate",
    description: "Sạch sẽ, chuyên nghiệp lấy cảm hứng từ các bản tin tài chính. Border vuông vức, ít animation rườm rà.",
    tags: ["Finance", "Clean", "Professional"],
    colors: ["bg-slate-800", "bg-blue-600", "bg-[#070d1a]"],
  },
];

export function TemplatesPage({
  options,
  onChangeOptions,
}: {
  options: RenderOptions;
  onChangeOptions: (v: RenderOptions) => void;
}) {
  return (
    <PageTransition className="mx-auto w-full max-w-[980px] space-y-5">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-cyan-400" />
              Templates
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              Chọn giao diện video (khung hình, font chữ, màu nền) để áp dụng cho lần render tiếp theo.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {TEMPLATES.map((tpl) => {
          const isActive = options.template === tpl.id;
          return (
            <Card
              key={tpl.id}
              className={cn(
                "group relative cursor-pointer overflow-hidden p-6 transition-all duration-300",
                isActive
                  ? "border-cyan-400/40 bg-cyan-400/[0.04] shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/20"
                  : "border-white/5 hover:border-white/15 hover:bg-white/5",
              )}
              onClick={() => onChangeOptions({ ...options, template: tpl.id })}
            >
              {isActive && (
                <div className="absolute right-4 top-4 rounded-full bg-cyan-400/20 p-1">
                  <Check className="h-4 w-4 text-cyan-400" />
                </div>
              )}

              {/* Preview abstraction */}
              <div className="mb-6 flex h-40 w-full items-center justify-center rounded-xl bg-black/40 shadow-inner">
                <div className="relative h-[80%] w-[45%] overflow-hidden rounded-[8px] sm:w-[35%]">
                  <div
                    className={cn(
                      "absolute inset-0 opacity-80",
                      tpl.colors[2]
                    )}
                  />
                  <div className="absolute inset-x-2 bottom-3 flex flex-col gap-1.5">
                    <div className={cn("h-1/2 w-full rounded-sm opacity-60", tpl.colors[1])} />
                    <div className={cn("h-4 w-5/6 rounded-sm opacity-80", tpl.colors[0])} />
                    <div className="h-8 w-full rounded-sm bg-white/20 backdrop-blur-sm" />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-base font-semibold text-zinc-100">{tpl.name}</div>
                <div className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {tpl.description}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tpl.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageTransition>
  );
}
