"use client";

import type React from "react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP, withMotionPreference } from "@/lib/gsap-client";

/** Soft page enter — replaces CSS `.page-enter` with scoped GSAP (auto-cleanup). */
export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () =>
      withMotionPreference(() => {
        if (!root.current) return;
        gsap.from(root.current, {
          autoAlpha: 0,
          y: 14,
          duration: 0.42,
          ease: "power2.out",
        });
      }),
    { scope: root },
  );

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
