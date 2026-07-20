import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type SceneChromeVariant = "neon" | "corporate" | "youtube";
export type InterruptStrength = "normal" | "strong";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const VARIANTS = {
  neon: {
    accent: "#67e8f9",
    hookAccent: "#a5f3fc",
    text: "#ffffff",
    badgeBorder: "rgba(0,255,255,0.25)",
    badgeBg: "rgba(0,0,0,0.42)",
    badgeShadow: "0 0 24px rgba(0,255,255,0.14)",
    chipBg: "rgba(7,17,38,0.72)",
    chipBorder: "rgba(0,255,255,0.25)",
    captionBg: "rgba(0,0,0,0.38)",
    captionBorder: "rgba(255,255,255,0.10)",
    progressTrack: "rgba(255,255,255,0.12)",
    progressFill: "linear-gradient(90deg, #22d3ee 0%, #a78bfa 100%)",
    cutGradient:
      "linear-gradient(140deg, rgba(0,255,255,0.5) 0%, rgba(255,255,255,0.0) 40%, rgba(255,0,255,0.48) 100%)",
    captionMode: "inline" as const,
  },
  corporate: {
    accent: "#93c5fd",
    hookAccent: "#bfdbfe",
    text: "#f1f5f9",
    badgeBorder: "rgba(148,163,184,0.25)",
    badgeBg: "rgba(15,23,42,0.8)",
    badgeShadow: "none",
    chipBg: "rgba(30,41,59,0.9)",
    chipBorder: "rgba(71,85,105,0.5)",
    captionBg: "transparent",
    captionBorder: "transparent",
    progressTrack: "rgba(148,163,184,0.2)",
    progressFill: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
    cutGradient: "#000",
    captionMode: "bottom-gradient" as const,
  },
  youtube: {
    accent: "#67e8f9",
    hookAccent: "#a5f3fc",
    text: "#ffffff",
    badgeBorder: "rgba(0,255,255,0.25)",
    badgeBg: "rgba(0,0,0,0.42)",
    badgeShadow: "0 0 24px rgba(0,255,255,0.14)",
    chipBg: "rgba(7,17,38,0.72)",
    chipBorder: "rgba(0,255,255,0.25)",
    captionBg: "rgba(0,0,0,0.38)",
    captionBorder: "rgba(255,255,255,0.10)",
    progressTrack: "rgba(255,255,255,0.12)",
    progressFill: "linear-gradient(90deg, #22d3ee 0%, #a78bfa 100%)",
    cutGradient:
      "linear-gradient(140deg, rgba(0,255,255,0.5) 0%, rgba(255,255,255,0.0) 40%, rgba(255,0,255,0.48) 100%)",
    captionMode: "inline" as const,
  },
} as const;

function resolveInterruptStrength(role: string, override?: InterruptStrength): InterruptStrength {
  if (override) return override;
  if (role === "re_hook") return "strong";
  return "normal";
}

function captionScaleForRole(role: string): number {
  if (role === "hook") return 1.16;
  if (role === "re_hook" || role === "takeaway") return 1.08;
  return 1;
}

function accentForRole(role: string, variant: SceneChromeVariant): string {
  const t = VARIANTS[variant];
  if (role === "hook") return t.hookAccent;
  if (role === "re_hook" || role === "takeaway") return t.accent;
  return t.text;
}

function renderCaptionWithEmphasis(text: string, emphasis: string[], accent: string) {
  if (!emphasis.length) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const word of emphasis) {
    const idx = lower.indexOf(word.toLowerCase(), cursor);
    if (idx < 0) continue;
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <span key={`${word}-${idx}`} style={{ color: accent, fontWeight: 800 }}>
        {text.slice(idx, idx + word.length)}
      </span>,
    );
    cursor = idx + word.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? parts : text;
}

export const CutFlashOverlay: React.FC<{
  cutFrames: number[];
  variant?: SceneChromeVariant;
}> = ({ cutFrames, variant = "neon" }) => {
  const frame = useCurrentFrame();
  const t = VARIANTS[variant];
  let intensity = 0;
  for (const cut of cutFrames) {
    const distance = Math.abs(frame - cut);
    if (distance <= 7) {
      intensity = Math.max(intensity, 1 - distance / 7);
    }
  }
  if (intensity <= 0) return null;
  const opacity = variant === "corporate" ? intensity * 0.8 : intensity * 0.42;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: t.cutGradient,
        mixBlendMode: variant === "corporate" ? undefined : "screen",
        opacity,
      }}
    />
  );
};

export const SceneEnterFlash: React.FC<{
  frame: number;
  strength?: InterruptStrength;
  variant?: SceneChromeVariant;
}> = ({ frame, strength = "normal", variant = "neon" }) => {
  if (frame > 8) return null;
  const t = VARIANTS[variant];
  const peak = strength === "strong" ? 0.55 : 0.32;
  const opacity = interpolate(frame, [0, 2, 8], [peak, peak * 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0.01) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: t.cutGradient,
        mixBlendMode: variant === "corporate" ? undefined : "screen",
        opacity,
      }}
    />
  );
};

const ProgressTimeline: React.FC<{
  globalFrame: number;
  totalFrames: number;
  variant: SceneChromeVariant;
}> = ({ globalFrame, totalFrames, variant }) => {
  const t = VARIANTS[variant];
  const pct = totalFrames > 0 ? clamp(globalFrame / totalFrames, 0, 1) : 0;
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        height: 4,
        borderRadius: 999,
        background: t.progressTrack,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          borderRadius: 999,
          background: t.progressFill,
        }}
      />
    </div>
  );
};

const ProgressBadge: React.FC<{
  index: number;
  total: number;
  variant: SceneChromeVariant;
}> = ({ index, total, variant }) => {
  const t = VARIANTS[variant];
  return (
    <div
      style={{
        alignSelf: "flex-start",
        padding: variant === "corporate" ? "6px 12px" : "8px 14px",
        borderRadius: variant === "corporate" ? 6 : 999,
        border: `1px solid ${t.badgeBorder}`,
        background: t.badgeBg,
        color: t.text,
        fontSize: variant === "corporate" ? 20 : 22,
        fontWeight: variant === "corporate" ? 600 : 700,
        boxShadow: t.badgeShadow,
      }}
    >
      {index + 1}/{total}
    </div>
  );
};

const CalloutChips: React.FC<{
  items: string[];
  frame: number;
  enabled: boolean;
  variant: SceneChromeVariant;
}> = ({ items, frame, enabled, variant }) => {
  if (!enabled || items.length === 0) return null;
  const t = VARIANTS[variant];
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
        maxWidth: variant === "youtube" ? 1600 : 920,
      }}
    >
      {items.slice(0, 2).map((item, idx) => {
        const enterStart = idx === 0 ? 0 : 16;
        const local = Math.max(0, frame - enterStart);
        const opacity = interpolate(local, [0, 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const motion =
          variant === "corporate"
            ? `translateY(${interpolate(local, [0, 8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`
            : `scale(${interpolate(local, [0, 8], [0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`;
        return (
          <div
            key={`${item}-${idx}`}
            style={{
              opacity,
              transform: motion,
              padding: "10px 14px",
              borderRadius: variant === "corporate" ? 8 : 14,
              background: t.chipBg,
              border: `1px solid ${t.chipBorder}`,
              color: t.text,
              fontSize: 26,
              fontWeight: 600,
              boxShadow: variant === "corporate" ? "0 8px 16px rgba(0,0,0,0.4)" : "0 10px 24px rgba(0,0,0,0.5), 0 0 16px rgba(0,255,255,0.16)",
              backdropFilter: variant === "corporate" ? "blur(8px)" : undefined,
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
};

export const SceneChrome: React.FC<{
  variant: SceneChromeVariant;
  role: string;
  sceneIndex: number;
  totalScenes: number;
  sceneStartFrame: number;
  totalDurationFrames: number;
  frame: number;
  captionLines: string[];
  captionEmphasis?: string[];
  callouts: string[];
  layout: string;
  showProgress: boolean;
  showCallouts: boolean;
  interruptStrength?: InterruptStrength;
  children: React.ReactNode;
}> = ({
  variant,
  role,
  sceneIndex,
  totalScenes,
  sceneStartFrame,
  totalDurationFrames,
  frame,
  captionLines,
  captionEmphasis = [],
  callouts,
  layout,
  showProgress,
  showCallouts,
  interruptStrength,
  children,
}) => {
  const t = VARIANTS[variant];
  const caption = captionLines.join("\n");
  const baseFontSize = variant === "corporate" ? 48 : 52;
  const minFont = variant === "corporate" ? 30 : 34;
  const maxFont = variant === "corporate" ? 48 : 52;
  const fontSize = clamp(baseFontSize - Math.max(0, caption.length - 70) * 0.35, minFont, maxFont) * captionScaleForRole(role);
  const accent = accentForRole(role, variant);
  const strength = resolveInterruptStrength(role, interruptStrength);
  const globalFrame = sceneStartFrame + frame;
  const emphasis = captionEmphasis.length ? captionEmphasis : callouts.slice(0, 2);

  const captionContent = (
    <div
      style={{
        whiteSpace: "pre-line",
        color: t.text,
        fontSize,
        fontWeight: 700,
        lineHeight: variant === "corporate" ? 1.4 : 1.15,
        textShadow:
          variant === "corporate"
            ? "0 4px 12px rgba(0,0,0,0.8)"
            : "0 4px 20px rgba(0,0,0,0.85), 0 0 14px rgba(0,255,255,0.12)",
        width: "100%",
        maxWidth: variant === "youtube" ? 1600 : 920,
        wordWrap: "break-word",
        background: t.captionBg,
        padding: variant === "corporate" ? 0 : "22px 30px",
        borderRadius: variant === "corporate" ? 0 : 16,
        backdropFilter: variant === "corporate" ? undefined : "blur(10px)",
        border: t.captionBorder !== "transparent" ? `1px solid ${t.captionBorder}` : undefined,
      }}
    >
      {caption.split("\n").map((line, i) => (
        <div key={i} style={{ color: i === 0 ? accent : t.text }}>
          {renderCaptionWithEmphasis(line, emphasis, accent)}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <SceneEnterFlash frame={frame} strength={strength} variant={variant} />
      {showProgress ? (
        <div style={{ width: "100%", maxWidth: 920, display: "flex", flexDirection: "column", gap: 10 }}>
          <ProgressTimeline globalFrame={globalFrame} totalFrames={totalDurationFrames} variant={variant} />
          <ProgressBadge index={sceneIndex} total={totalScenes} variant={variant} />
        </div>
      ) : null}

      {children}

      <CalloutChips
        items={callouts}
        frame={frame}
        enabled={showCallouts && (layout === "big_callout" || layout === "stat")}
        variant={variant}
      />

      {t.captionMode === "bottom-gradient" ? (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background:
              "linear-gradient(to top, rgba(7,13,26,1) 60%, rgba(7,13,26,0.8) 85%, transparent)",
            borderTop: "2px solid rgba(30,58,138,0.5)",
            padding: "120px 64px 40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          {captionContent}
        </div>
      ) : (
        captionContent
      )}
    </>
  );
};
