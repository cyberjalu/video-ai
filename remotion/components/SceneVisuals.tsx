import React from "react";
import { Img, Video, interpolate, useCurrentFrame } from "remotion";

export type SceneLayout =
  | "screenshot"
  | "big_callout"
  | "split"
  | "broll"
  | "stat"
  | "bar_chart";

export type StatData = {
  value: string;
  label: string;
  delta?: string;
};

export type ChartData = {
  title?: string;
  bars: Array<{ label: string; value: number }>;
};

export type SceneVisualTheme = "neon" | "corporate";

const THEMES = {
  neon: {
    border: "rgba(0,255,255,0.22)",
    glow: "0 24px 50px rgba(0,0,0,0.52), 0 0 22px rgba(0,255,255,0.2)",
    panel: "linear-gradient(130deg, rgba(4,26,39,0.76) 0%, rgba(22,9,49,0.68) 100%)",
    accent: "#67e8f9",
    bar: "linear-gradient(90deg, #22d3ee 0%, #a78bfa 100%)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
  },
  corporate: {
    border: "rgba(148,163,184,0.3)",
    glow: "0 24px 50px rgba(0,0,0,0.52)",
    panel: "rgba(15,23,42,0.88)",
    accent: "#93c5fd",
    bar: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
    text: "#f8fafc",
    muted: "rgba(226,232,240,0.75)",
  },
} as const;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function cardShell(
  theme: SceneVisualTheme,
  height: number,
  extra?: React.CSSProperties,
): React.CSSProperties {
  const t = THEMES[theme];
  return {
    width: "100%",
    maxWidth: 920,
    height,
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
    border: `1px solid ${t.border}`,
    boxShadow: t.glow,
    background: t.panel,
    ...extra,
  };
}

export const StatCard: React.FC<{
  stat: StatData;
  frame: number;
  height: number;
  theme?: SceneVisualTheme;
}> = ({ stat, frame, height, theme = "neon" }) => {
  const t = THEMES[theme];
  const progress = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(progress, [0, 1], [0.88, 1]);
  const opacity = interpolate(progress, [0, 0.35, 1], [0, 1, 1]);

  return (
    <div style={{ ...cardShell(theme, height), transform: `scale(${scale})`, opacity }}>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          padding: "36px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: t.accent,
            fontSize: clamp(96 - Math.max(0, stat.value.length - 4) * 6, 56, 96),
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -1,
            textShadow: "0 8px 28px rgba(0,0,0,0.55)",
          }}
        >
          {stat.value}
        </div>
        <div
          style={{
            color: t.text,
            fontSize: 34,
            fontWeight: 650,
            lineHeight: 1.25,
            maxWidth: 720,
          }}
        >
          {stat.label}
        </div>
        {stat.delta ? (
          <div
            style={{
              marginTop: 4,
              color: t.muted,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {stat.delta}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const BarChartCard: React.FC<{
  chart: ChartData;
  frame: number;
  height: number;
  theme?: SceneVisualTheme;
}> = ({ chart, frame, height, theme = "neon" }) => {
  const t = THEMES[theme];
  const bars = (chart.bars ?? []).slice(0, 5);
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={cardShell(theme, height)}>
      <div style={{ height: "100%", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {chart.title ? (
          <div style={{ color: t.text, fontSize: 28, fontWeight: 700, textAlign: "left" }}>{chart.title}</div>
        ) : null}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          {bars.map((bar, i) => {
            const delay = i * 4;
            const barProgress = interpolate(frame, [delay, delay + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const widthPct = (Math.abs(bar.value) / max) * 100 * barProgress;
            return (
              <div key={`${bar.label}-${i}`} style={{ opacity: enter }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    color: t.muted,
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  <span>{bar.label}</span>
                  <span style={{ color: t.text }}>{Math.round(bar.value)}</span>
                </div>
                <div
                  style={{
                    height: 18,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: t.bar,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ScreenshotCard: React.FC<{
  src?: string;
  frame: number;
  height: number;
  durationInFrames?: number;
  imageFit?: "cover" | "contain";
  theme?: SceneVisualTheme;
}> = ({ src, frame, height, durationInFrames = 90, imageFit = "cover", theme = "neon" }) => {
  if (!src) return null;
  const t = THEMES[theme];
  const intro = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ken = interpolate(frame, [0, Math.max(durationInFrames, 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(ken, [0, 1], [1.0, 1.08]);
  const translateY = interpolate(ken, [0, 1], [0, -18]);
  const opacity = interpolate(intro, [0, 0.25, 1], [0, 1, 1]);
  const fit = imageFit === "contain" ? "contain" : "cover";

  return (
    <div
      style={{
        ...cardShell(theme, height),
        opacity,
        background: theme === "neon" ? "rgba(0,0,0,0.25)" : "rgba(2,6,23,0.9)",
      }}
    >
      {fit === "cover" ? (
        <Img
          src={src}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(18px) contrast(1.05) saturate(1.05)",
            opacity: 0.55,
            transform: "scale(1.08)",
          }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      )}
      <div
        style={{
          position: "absolute",
          inset: fit === "contain" ? 18 : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            transform: `scale(${scale}) translateY(${translateY}px)`,
            borderRadius: fit === "contain" ? 12 : 0,
            boxShadow: fit === "contain" ? `0 12px 40px rgba(0,0,0,0.45)` : undefined,
            background: fit === "contain" ? "rgba(15,23,42,0.9)" : undefined,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          border: `1px solid ${t.border}`,
          borderRadius: 22,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      />
    </div>
  );
};

export const BrollCard: React.FC<{
  brollSrc?: string;
  height: number;
  theme?: SceneVisualTheme;
}> = ({ brollSrc, height, theme = "neon" }) => {
  if (!brollSrc) return null;
  return (
    <div style={cardShell(theme, height, { background: "rgba(0,0,0,0.25)" })}>
      <Video
        src={brollSrc}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
};

export const BigCalloutCard: React.FC<{
  text: string;
  height?: number;
  frame?: number;
  theme?: SceneVisualTheme;
}> = ({ text, frame = 0, theme = "neon" }) => {
  const t = THEMES[theme];
  const progress = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(progress, [0, 1], [0.82, 1]);
  const opacity = interpolate(progress, [0, 0.4, 1], [0, 1, 1]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        borderRadius: 20,
        border: `1px solid ${t.border}`,
        background: t.panel,
        padding: "36px 30px",
        boxShadow: t.glow,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          color: t.text,
          fontSize: clamp(64 - Math.max(0, text.length - 16) * 0.5, 42, 64),
          fontWeight: 700,
          lineHeight: 1.08,
          textShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const SplitCard: React.FC<{
  screenshotSrc?: string;
  calloutText?: string;
  captionLines?: string[];
  frame: number;
  height: number;
  imageFit?: "cover" | "contain";
  theme?: SceneVisualTheme;
}> = ({ screenshotSrc, calloutText, captionLines = [], frame, height, imageFit = "cover", theme = "neon" }) => {
  const t = THEMES[theme];
  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const text = calloutText || captionLines[0] || captionLines.join(" · ") || "Key point";

  if (!screenshotSrc) {
    return <BigCalloutCard text={text} frame={frame} theme={theme} />;
  }

  return (
    <div
      style={{
        ...cardShell(theme, height),
        opacity: enter,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
      }}
    >
      <div style={{ position: "relative", overflow: "hidden", minHeight: height }}>
        <Img
          src={screenshotSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: imageFit,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "28px 24px",
          background: t.panel,
          textAlign: "left",
        }}
      >
        <div
          style={{
            color: t.accent,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Proof
        </div>
        <div
          style={{
            color: t.text,
            fontSize: clamp(36 - Math.max(0, text.length - 20) * 0.4, 24, 36),
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {text}
        </div>
        {captionLines[1] ? (
          <div style={{ color: t.muted, fontSize: 20, marginTop: 12, fontWeight: 600 }}>{captionLines[1]}</div>
        ) : null}
      </div>
    </div>
  );
};

export const SceneVisual: React.FC<{
  layout?: SceneLayout | string;
  screenshotSrc?: string;
  brollSrc?: string;
  stat?: StatData;
  chart?: ChartData;
  calloutText?: string;
  captionLines?: string[];
  imageFit?: "cover" | "contain";
  frame: number;
  height: number;
  durationInFrames?: number;
  theme?: SceneVisualTheme;
}> = ({
  layout = "screenshot",
  screenshotSrc,
  brollSrc,
  stat,
  chart,
  calloutText,
  captionLines,
  imageFit,
  frame,
  height,
  durationInFrames,
  theme = "neon",
}) => {
  if (layout === "split") {
    return (
      <SplitCard
        screenshotSrc={screenshotSrc}
        calloutText={calloutText}
        captionLines={captionLines}
        frame={frame}
        height={height}
        imageFit={imageFit}
        theme={theme}
      />
    );
  }
  if (layout === "stat" && stat) {
    return <StatCard stat={stat} frame={frame} height={height} theme={theme} />;
  }
  if (layout === "bar_chart" && chart?.bars?.length) {
    return <BarChartCard chart={chart} frame={frame} height={height} theme={theme} />;
  }
  if (layout === "big_callout") {
    return <BigCalloutCard text={calloutText || ""} frame={frame} theme={theme} />;
  }
  if (layout === "broll") {
    return <BrollCard brollSrc={brollSrc} height={height} theme={theme} />;
  }
  return (
    <ScreenshotCard
      src={screenshotSrc}
      frame={frame}
      height={height}
      durationInFrames={durationInFrames}
      imageFit={imageFit}
      theme={theme}
    />
  );
};
