"use client";

import type React from "react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap-client";

/** Soft page enter — transform only (no autoAlpha) so text never sticks invisible. */
export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!root.current) return;
    const el = root.current;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el, {
        y: 12,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
