"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP, ScrollTrigger };

/** Run GSAP only when the user allows motion. */
export function withMotionPreference(setup: () => void | (() => void)) {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const cleanup = setup();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  });
  return () => mm.revert();
}
