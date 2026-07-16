import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TechnicalGlitchBg } from "./TechnicalGlitchBg";

// Montserrat (includes Vietnamese glyphs via latin-ext)
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/latin-ext-400.css";
import "@fontsource/montserrat/latin-ext-600.css";
import "@fontsource/montserrat/latin-ext-700.css";

export type NewsScene = {
  id: string;
  role: string;
  duration_sec: number;
  caption_lines: string[];
  voiceover: string;
  layout?: "screenshot" | "big_callout" | "split" | "broll";
  callouts?: string[];
  screenshot_path?: string;
  screenshot_src?: string;
  broll_path?: string;
  broll_src?: string;
};

export type YouTubeStoryV1Props = {
  title: string;
  audioPath: string;
  audioSrc?: string;
  scenes: NewsScene[];
  showProgress?: boolean;
  showCallouts?: boolean;
  layoutMode?: "tri" | "dual" | "mono";
};

export const calcDurationInFrames = ({ props, fps }: { props: YouTubeStoryV1Props; fps: number }) => {
  const totalSec = (props.scenes ?? []).reduce(
    (s, sc) => s + Math.max(3, Math.min(12, sc.duration_sec ?? 5)),
    0,
  );
  return Math.max(Math.round((totalSec || 60) * fps), fps * 10);
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const ProgressBadge: React.FC<{ index: number; total: number }> = ({ index, total }) => {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid rgba(0,255,255,0.25)",
        background: "rgba(0,0,0,0.42)",
        color: "white",
        fontSize: 22,
        fontWeight: 700,
        boxShadow: "0 0 24px rgba(0,255,255,0.14)",
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
        maxWidth: 1600,
      }}
    >
      {items.slice(0, 2).map((item, idx) => {
        const enterStart = idx === 0 ? 0 : 16;
        const local = Math.max(0, frame - enterStart);
        const opacity = interpolate(local, [0, 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(local, [0, 8], [0.94, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`${item}-${idx}`}
            style={{
              opacity,
              transform: `scale(${scale})`,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(7,17,38,0.72)",
              border: "1px solid rgba(0,255,255,0.25)",
              color: "white",
              fontSize: 26,
              fontWeight: 600,
              boxShadow: "0 10px 24px rgba(0,0,0,0.5), 0 0 16px rgba(0,255,255,0.16)",
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
          maxWidth: 1600,
          height,
          borderRadius: 22,
          overflow: "hidden",
          position: "relative",
          border: "1px solid rgba(0,255,255,0.18)",
          boxShadow:
            "0 18px 55px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 34px rgba(0,255,255,0.12)",
          background: "rgba(0,0,0,0.25)",
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
  const scale = interpolate(t, [0, 1], [1.03, 1]);
  const opacity = interpolate(t, [0, 0.25, 1], [0, 1, 1]);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1600,
        height,
        borderRadius: 22,
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(0,255,255,0.18)",
        boxShadow:
          "0 18px 55px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 34px rgba(0,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        transform: `scale(${scale})`,
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
          filter: "blur(18px) contrast(1.05) saturate(1.05)",
          opacity: 0.55,
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
            filter: "contrast(1.06) saturate(1.06)",
          }}
        />
      </div>
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

const CutFlashOverlay: React.FC<{ cutFrames: number[] }> = ({ cutFrames }) => {
  const frame = useCurrentFrame();
  let intensity = 0;
  for (const cut of cutFrames) {
    const distance = Math.abs(frame - cut);
    if (distance <= 7) {
      intensity = Math.max(intensity, 1 - distance / 7);
    }
  }
  if (intensity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background:
          "linear-gradient(140deg, rgba(0,255,255,0.5) 0%, rgba(255,255,255,0.0) 40%, rgba(255,0,255,0.48) 100%)",
        mixBlendMode: "screen",
        opacity: intensity * 0.42,
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
  const { durationInFrames } = useVideoConfig();

  const caption = scene.caption_lines.join("\n");
  const fontSize = clamp(52 - Math.max(0, caption.length - 70) * 0.35, 34, 52);

  const safePadTop = 80;
  const safePadBottom = 120;
  const safePadX = 120;
  const layout = scene.layout ?? "screenshot";
  const callouts = scene.callouts ?? [];
  const cardHeight = layout === "split" ? 360 : 500;
  const bigCalloutText = callouts[0] ?? scene.caption_lines[0];

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A12", fontFamily: "Montserrat, sans-serif" }}>
      <TechnicalGlitchBg />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.48) 72%)",
        }}
      />
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
        {layout === "big_callout" ? (
          <div
            style={{
              width: "100%",
              maxWidth: 1600,
              borderRadius: 20,
              border: "1px solid rgba(0,255,255,0.22)",
              background: "linear-gradient(130deg, rgba(4,26,39,0.76) 0%, rgba(22,9,49,0.68) 100%)",
              padding: "36px 30px",
              boxShadow: "0 24px 50px rgba(0,0,0,0.52), 0 0 22px rgba(0,255,255,0.2)",
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: clamp(64 - Math.max(0, bigCalloutText.length - 16) * 0.5, 42, 64),
                fontWeight: 700,
                lineHeight: 1.08,
                textShadow: "0 8px 24px rgba(0,0,0,0.6)",
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
            whiteSpace: "pre-line",
            color: "white",
            fontSize,
            fontWeight: 700,
            lineHeight: 1.15,
            textShadow: "0 4px 20px rgba(0,0,0,0.85), 0 0 14px rgba(0,255,255,0.12)",
            width: "100%",
            maxWidth: 1600,
            wordWrap: "break-word",
            background: "rgba(0,0,0,0.38)",
            padding: "22px 30px",
            borderRadius: 16,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {caption}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const YouTubeStoryV1: React.FC<YouTubeStoryV1Props> = ({
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
