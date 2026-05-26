import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Montserrat (includes Vietnamese glyphs via latin-ext)
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/latin-ext-400.css";
import "@fontsource/montserrat/latin-ext-600.css";
import "@fontsource/montserrat/latin-ext-700.css";

import type { NewsStoryV1Props, NewsScene } from "./NewsStoryV1";

export const CorporateBg: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#070d1a" }}>
      {/* Subtle radial gradient */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(30,58,138,0.4) 0%, rgba(7,13,26,1) 80%)",
        }}
      />
      
      {/* Dot Grid */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(148,163,184,0.15) 2px, transparent 2px)",
          backgroundSize: "40px 40px",
          backgroundPosition: `0px ${t * 15}px`,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const Watermarks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const floatY = Math.sin(t * 0.8) * 2;
  const glow = 0.2 + (Math.sin(t * 1.2) + 1) * 0.05;

  const badgeBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    background: "rgba(15,23,42,0.60)",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow: `0 4px 12px rgba(0,0,0,0.5)`,
    backdropFilter: "blur(10px)",
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 0.2,
    transform: `translateY(${floatY}px)`,
  };

  return (
    <div style={{ pointerEvents: "none", width: "100%", maxWidth: 920 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <div style={badgeBase}>@radiobaomat</div>
        <div
          style={{
            ...badgeBase,
          }}
        >
          <span style={{ color: "#94a3b8" }}>♥</span>
          <span>i-love-tiktok</span>
        </div>
      </div>
    </div>
  );
};

const ProgressBadge: React.FC<{ index: number; total: number }> = ({ index, total }) => {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid rgba(148,163,184,0.25)",
        background: "rgba(15,23,42,0.8)",
        color: "#cbd5e1",
        fontSize: 20,
        fontWeight: 600,
      }}
    >
      {index + 1}/{total}
    </div>
  );
};

const CalloutChips: React.FC<{ items: string[]; frame: number; enabled: boolean }> = ({
  items,
  frame,
  enabled,
}) => {
  if (!enabled || items.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
        maxWidth: 920,
      }}
    >
      {items.slice(0, 2).map((item, idx) => {
        const enterStart = idx === 0 ? 0 : 16;
        const local = Math.max(0, frame - enterStart);
        const opacity = interpolate(local, [0, 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const translateY = interpolate(local, [0, 8], [20, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`${item}-${idx}`}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              padding: "10px 18px",
              borderRadius: 8,
              background: "rgba(30,41,59,0.9)",
              border: "1px solid rgba(71,85,105,0.5)",
              color: "#e2e8f0",
              fontSize: 26,
              fontWeight: 600,
              boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
};

const VisualCard: React.FC<{ src?: string; brollSrc?: string; layout?: string; frame: number; height: number }> = ({ src, brollSrc, layout, frame, height }) => {
  if (layout === "broll" && brollSrc) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          height,
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow:
            "0 18px 55px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06) inset",
          background: "rgba(15,23,42,0.4)",
        }}
      >
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
  }

  if (!src) return null;
  const t = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(t, [0, 1], [15, 0]);
  const opacity = interpolate(t, [0, 0.25, 1], [0, 1, 1]);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        height,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow:
          "0 18px 55px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06) inset",
        background: "rgba(15,23,42,0.4)",
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(18px) brightness(0.7)",
          opacity: 0.6,
          transform: "scale(1.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
};

const CutFlashOverlay: React.FC<{ cutFrames: number[] }> = ({ cutFrames }) => {
  const frame = useCurrentFrame();
  let intensity = 0;
  for (const cut of cutFrames) {
    const distance = Math.abs(frame - cut);
    if (distance <= 8) {
      intensity = Math.max(intensity, 1 - distance / 8);
    }
  }
  if (intensity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: "#000",
        opacity: intensity * 0.8,
      }}
    />
  );
};

const SceneView: React.FC<{
  scene: NewsScene;
  sceneIndex: number;
  totalScenes: number;
  showProgress: boolean;
  showCallouts: boolean;
}> = ({ scene, sceneIndex, totalScenes, showProgress, showCallouts }) => {
  const frame = useCurrentFrame();

  const caption = scene.caption_lines.join("\n");
  const fontSize = clamp(48 - Math.max(0, caption.length - 70) * 0.35, 30, 48);

  const safePadTop = 100;
  const safePadBottom = 220;
  const safePadX = 64;
  const layout = scene.layout ?? "screenshot";
  const callouts = scene.callouts ?? [];
  const cardHeight = layout === "split" ? 380 : 560;
  const bigCalloutText = callouts[0] ?? scene.caption_lines[0];

  return (
    <AbsoluteFill style={{ backgroundColor: "#070d1a", fontFamily: "Montserrat, sans-serif" }}>
      <CorporateBg />
      <AbsoluteFill
        style={{
          paddingTop: safePadTop,
          paddingBottom: safePadBottom,
          paddingLeft: safePadX,
          paddingRight: safePadX,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
        }}
      >
        {showProgress ? <ProgressBadge index={sceneIndex} total={totalScenes} /> : null}
        <Watermarks />

        {layout === "big_callout" ? (
          <div
            style={{
              width: "100%",
              maxWidth: 920,
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.3)",
              background: "rgba(15,23,42,0.8)",
              padding: "40px 30px",
              boxShadow: "0 24px 50px rgba(0,0,0,0.52)",
            }}
          >
            <div
              style={{
                color: "#f8fafc",
                fontSize: clamp(64 - Math.max(0, bigCalloutText.length - 16) * 0.5, 42, 64),
                fontWeight: 700,
                lineHeight: 1.08,
                textShadow: "0 4px 12px rgba(0,0,0,0.6)",
              }}
            >
              {bigCalloutText}
            </div>
          </div>
        ) : (
          <VisualCard src={scene.screenshot_src} brollSrc={scene.broll_src} layout={layout} frame={frame} height={cardHeight} />
        )}

        <CalloutChips
          items={callouts}
          frame={frame}
          enabled={showCallouts && layout === "big_callout"}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(7,13,26,1) 60%, rgba(7,13,26,0.8) 85%, transparent)",
            borderTop: "2px solid rgba(30,58,138,0.5)",
            padding: `120px 64px 40px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              whiteSpace: "pre-line",
              color: "#f1f5f9",
              fontSize,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.4,
              textShadow: "0 4px 12px rgba(0,0,0,0.8)",
            }}
          >
            {caption}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CorporateNewsV1: React.FC<NewsStoryV1Props> = ({
  title,
  audioPath,
  audioSrc,
  scenes,
  showProgress = true,
  showCallouts = true,
}) => {
  const { fps } = useVideoConfig();

  const seq = useMemo(() => {
    let from = 0;
    return (scenes ?? []).map((s) => {
      const dur = Math.max(3, Math.min(12, s.duration_sec || 5));
      const frames = Math.round(dur * fps);
      const out = { from, frames, scene: s };
      from += frames;
      return out;
    });
  }, [scenes, fps]);
  const cutFrames = useMemo(() => seq.slice(1).map((s) => s.from), [seq]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A12" }}>
      {audioSrc || audioPath ? <Audio src={audioSrc ?? audioPath} /> : null}

      {seq.map(({ from, frames, scene }, index) => (
        <Sequence key={scene.id} from={from} durationInFrames={frames}>
          <SceneView
            scene={scene}
            sceneIndex={index}
            totalScenes={seq.length}
            showProgress={showProgress}
            showCallouts={showCallouts}
          />
        </Sequence>
      ))}
      <CutFlashOverlay cutFrames={cutFrames} />
      <div style={{ display: "none" }}>{title}</div>
    </AbsoluteFill>
  );
};
