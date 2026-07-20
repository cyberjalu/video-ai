import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TechnicalGlitchBg } from "./TechnicalGlitchBg";
import { CutFlashOverlay, SceneChrome, type InterruptStrength } from "../components/SceneChrome";

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
  caption_emphasis?: string[];
  interrupt_strength?: InterruptStrength;
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

const VisualCard: React.FC<{
  src?: string;
  brollSrc?: string;
  layout?: string;
  frame: number;
  height: number;
}> = ({ src, brollSrc, layout, frame, height }) => {
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
        <Video src={brollSrc} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
    </div>
  );
};

const SceneView: React.FC<{
  scene: NewsScene;
  sceneIndex: number;
  totalScenes: number;
  sceneStartFrame: number;
  totalDurationFrames: number;
  showProgress: boolean;
  showCallouts: boolean;
}> = ({
  scene,
  sceneIndex,
  totalScenes,
  sceneStartFrame,
  totalDurationFrames,
  showProgress,
  showCallouts,
}) => {
  const frame = useCurrentFrame();
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
          paddingTop: 80,
          paddingBottom: 120,
          paddingLeft: 120,
          paddingRight: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
        }}
      >
        <SceneChrome
          variant="youtube"
          role={scene.role}
          sceneIndex={sceneIndex}
          totalScenes={totalScenes}
          sceneStartFrame={sceneStartFrame}
          totalDurationFrames={totalDurationFrames}
          frame={frame}
          captionLines={scene.caption_lines}
          captionEmphasis={scene.caption_emphasis}
          callouts={callouts}
          layout={layout}
          showProgress={showProgress}
          showCallouts={showCallouts && layout === "big_callout"}
          interruptStrength={scene.interrupt_strength}
        >
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
                transform: `scale(${interpolate(frame, [0, 10], [0.82, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
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
            <VisualCard
              src={scene.screenshot_src}
              brollSrc={scene.broll_src}
              layout={layout}
              frame={frame}
              height={cardHeight}
            />
          )}
        </SceneChrome>
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
  const totalDurationFrames = useMemo(
    () => seq.reduce((sum, s) => sum + s.frames, 0),
    [seq],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A12" }}>
      {audioSrc || audioPath ? <Audio src={audioSrc ?? audioPath} /> : null}

      {seq.map(({ from, frames, scene }, index) => (
        <Sequence key={scene.id} from={from} durationInFrames={frames}>
          <SceneView
            scene={scene}
            sceneIndex={index}
            totalScenes={seq.length}
            sceneStartFrame={from}
            totalDurationFrames={totalDurationFrames}
            showProgress={showProgress}
            showCallouts={showCallouts}
          />
        </Sequence>
      ))}
      <CutFlashOverlay cutFrames={cutFrames} variant="youtube" />
      <div style={{ display: "none" }}>{title}</div>
    </AbsoluteFill>
  );
};
