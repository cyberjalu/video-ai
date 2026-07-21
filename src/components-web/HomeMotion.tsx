"use client";

import type React from "react";
import { useRef } from "react";
import { gsap, useGSAP, withMotionPreference } from "@/lib/gsap-client";

/**
 * Home studio entrance + scroll reveals.
 * Mark children with `.gsap-hero`, `.gsap-phone`, `.gsap-strip`, `.gsap-section`.
 */
export function HomeMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () =>
      withMotionPreference(() => {
        const hero = gsap.utils.toArray<HTMLElement>(".gsap-hero");
        const phone = root.current?.querySelector(".gsap-phone");
        const strip = gsap.utils.toArray<HTMLElement>(".gsap-strip .filmstrip-frame");
        const sections = gsap.utils.toArray<HTMLElement>(".gsap-section");

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (hero.length) {
          tl.from(hero, {
            y: 28,
            autoAlpha: 0,
            duration: 0.65,
            stagger: 0.07,
          });
        }

        if (phone) {
          tl.from(
            phone,
            {
              y: 36,
              autoAlpha: 0,
              scale: 0.96,
              duration: 0.75,
              ease: "power3.out",
            },
            "-=0.45",
          );
        }

        if (strip.length) {
          tl.from(
            strip,
            {
              y: 18,
              autoAlpha: 0,
              duration: 0.45,
              stagger: { each: 0.05, from: "start" },
            },
            "-=0.35",
          );
        }

        sections.forEach((el) => {
          gsap.from(el, {
            y: 22,
            autoAlpha: 0,
            duration: 0.55,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          });
        });
      }),
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
