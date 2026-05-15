import { useEffect, useState } from "react";
import { History, FolderOpen } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { listOutputDirs, readTextFileSafe } from "../lib/tauri";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { VideoPlan } from "../lib/types";
import { SecondaryButton } from "../components/Buttons";
import { PageTransition } from "../components/PageTransition";

type HistoryItem = {
  path: string;
  folderName: string;
  dateStr: string;
  plan: VideoPlan | null;
  status: "Completed" | "Incomplete";
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const dirs = await listOutputDirs();
        const loaded: HistoryItem[] = [];

        for (const dir of dirs) {
          // dir might be absolute path depending on Rust implementation
          const folderName = dir.split("/").pop() || dir;
          
          let planData: VideoPlan | null = null;
          let status: "Completed" | "Incomplete" = "Incomplete";

          try {
            const planStr = await readTextFileSafe(`${dir}/plan/video_plan.json`);
            planData = JSON.parse(planStr) as VideoPlan;
            status = "Completed"; // simplistic check, you'd check out.mp4 in production
          } catch (e) {
            // ignore
          }

          // Parse date from "2026-05-13__1303__..."
          let dateStr = "Unknown date";
          const match = folderName.match(/^(\d{4}-\d{2}-\d{2})__(\d{2})(\d{2})/);
          if (match) {
            dateStr = `${match[1]} ${match[2]}:${match[3]}`;
          }

          loaded.push({
            path: dir,
            folderName,
            dateStr,
            plan: planData,
            status,
          });
        }
        setItems(loaded);
      } catch (e) {
        console.error("Error loading history", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <PageTransition className="mx-auto w-full max-w-[980px] space-y-4">
        <div className="h-32 w-full animate-pulse rounded-xl bg-white-5" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-white-5" />
      </PageTransition>
    );
  }

  if (items.length === 0) {
    return (
      <PageTransition className="mx-auto w-full max-w-[980px]">
        <EmptyState
          title="No videos yet"
          description="Create your first video from an article URL."
          icon={<History className="h-5 w-5" />}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto w-full max-w-[980px] space-y-5">
      <div className="flex items-center gap-2 px-1 pb-2">
        <History className="h-5 w-5 text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-100">Generation History</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.path} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="line-clamp-2 text-base font-semibold text-zinc-100 h-12">
                {item.plan?.title || "Untitled Video"}
              </div>
              <Badge
                className={
                  item.status === "Completed"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
                }
              >
                {item.status}
              </Badge>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
              <div>{item.dateStr}</div>
              {item.plan && (
                <>
                  <div className="h-1 w-1 rounded-full bg-zinc-700" />
                  <div>{formatDuration(item.plan.target_duration_sec)}</div>
                  <div className="h-1 w-1 rounded-full bg-zinc-700" />
                  <div>{item.plan.scenes.length} scenes</div>
                </>
              )}
            </div>

            <div className="mt-6">
              <SecondaryButton
                className="w-full justify-center text-xs"
                onClick={() => revealItemInDir(item.path)}
              >
                <FolderOpen className="mr-2 h-3.5 w-3.5" />
                Open folder
              </SecondaryButton>
            </div>
          </Card>
        ))}
      </div>
    </PageTransition>
  );
}
