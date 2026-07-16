import type React from "react";
import { cn } from "../lib/cn";

export function Card({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "strong" | "inset" }) {
  const variants = {
    default: "surface-panel rounded-[var(--app-radius-lg)]",
    strong: "surface-panel-strong rounded-[var(--app-radius-lg)]",
    inset: "surface-inset rounded-[var(--app-radius-md)]",
  } as const;

  return (
    <div
      className={cn(
        "transition-[border-color,box-shadow,transform,background-color] duration-200",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
