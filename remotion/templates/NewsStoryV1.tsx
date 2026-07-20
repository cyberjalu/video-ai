import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { TechnicalGlitchBg } from "./TechnicalGlitchBg";
import {
  SceneVisual,
  type ChartData,
  type SceneLayout,
  type StatData,
} from "../components/SceneVisuals";
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
  layout?: SceneLayout;
  callouts?: string[];
  caption_emphasis?: string[];
  interrupt_strength?: InterruptStrength;
  screenshot_path?: string;
  screenshot_src?: string;
  broll_path?: string;
  broll_src?: string;
  image_fit?: "cover" | "contain";
  stat?: StatData;
  chart?: ChartData;
};

export type NewsStoryV1Props = {
  title: string;
  audioPath: string;
  audioSrc?: string;
  scenes: NewsScene[];
  showProgress?: boolean;
  showCallouts?: boolean;
  layoutMode?: "tri" | "dual" | "mono";
};

export const calcDurationInFrames = ({ props, fps }: { props: NewsStoryV1Props; fps: number }) => {
  const totalSec = (props.scenes ?? []).reduce(
    (s, sc) => s + Math.max(3, Math.min(12, sc.duration_sec ?? 5)),
    0,
  );
  return Math.max(Math.round((totalSec || 60) * fps), fps * 10);
};

const SceneView: React.FC<{
  scene: NewsScene;
  sceneIndex: number;
  totalScenes: number;
  sceneStartFrame: number;
  totalDurationFrames: number;
  showProgress: boolean;
  showCallouts: boolean;
  layoutMode: "tri" | "dual" | "mono";
}> = ({
  scene,
  sceneIndex,
  totalScenes,
  sceneStartFrame,
  totalDurationFrames,
  showProgress,
  showCallouts,
  layoutMode,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const layout = scene.layout ?? "screenshot";
  const callouts = scene.callouts ?? [];
  const cardHeight =
    layout === "split" ? 360 : layoutMode === "mono" ? 560 : layoutMode === "dual" ? 480 : 500;
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
          paddingTop: 100,
          paddingBottom: 250,
          paddingLeft: 64,
          paddingRight: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
        }}
      >
        <SceneChrome
          variant="neon"
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
          showCallouts={showCallouts}
          interruptStrength={scene.interrupt_strength}
        >
          <SceneVisual
            layout={layout}
            screenshotSrc={scene.screenshot_src}
            brollSrc={scene.broll_src}
            stat={scene.stat}
            chart={scene.chart}
            calloutText={bigCalloutText}
            captionLines={scene.caption_lines}
            imageFit={scene.image_fit}
            frame={frame}
            height={cardHeight}
            durationInFrames={durationInFrames}
            theme="neon"
          />
        </SceneChrome>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const NewsStoryV1: React.FC<NewsStoryV1Props> = ({
  title,
  audioPath,
  audioSrc,
  scenes,
  showProgress = true,
  showCallouts = true,
  layoutMode = "tri",
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
            layoutMode={layoutMode}
          />
        </Sequence>
      ))}
      <CutFlashOverlay cutFrames={cutFrames} variant="neon" />
      <div style={{ display: "none" }}>{title}</div>
    </AbsoluteFill>
  );
};
