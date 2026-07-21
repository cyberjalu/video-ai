import type React from "react";
import { cn } from "@/lib/cn";

export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("page-enter", className)}>{children}</div>;
}
