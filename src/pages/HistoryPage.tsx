import { History } from "lucide-react";
import { EmptyState } from "../components/EmptyState";

export function HistoryPage() {
  return (
    <div className="mx-auto w-full max-w-[980px]">
      <EmptyState
        title="No videos yet"
        description="Create your first video from an article URL."
        icon={<History className="h-5 w-5" />}
      />
    </div>
  );
}

