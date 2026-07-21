"use client";

import type React from "react";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap-client";

/**
 * Home studio entrance + scroll reveals.
 * Uses clearProps so opacity/visibility never stick after Strict Mode / route changes.
 */
export function HomeMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const hero = gsap.utils.toArray<HTMLElement>(".gsap-hero");
      const phone = root.current?.querySelector(".gsap-phone");
      const strip = gsap.utils.toArray<HTMLElement>(".gsap-strip .filmstrip-frame");
      const sections = gsap.utils.toArray<HTMLElement>(".gsap-section");

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          gsap.set([...hero, phone, ...strip].filter(Boolean), {
            clearProps: "opacity,visibility,transform",
          });
        },
      });

      if (hero.length) {
        tl.from(hero, {
          y: 24,
          opacity: 0,
          duration: 0.6,
          stagger: 0.07,
        });
      }

      if (phone) {
        tl.from(
          phone,
          {
            y: 32,
            opacity: 0,
            scale: 0.97,
            duration: 0.7,
          },
          "-=0.4",
        );
      }

      if (strip.length) {
        tl.from(
          strip,
          {
            y: 16,
            opacity: 0,
            duration: 0.4,
            stagger: { each: 0.05, from: "start" },
          },
          "-=0.3",
        );
      }

      sections.forEach((el) => {
        gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "opacity,transform",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });
    });
    return () => mm.revert();
  }, { scope: root });

  return <div ref={root}>{children}</div>;
}
