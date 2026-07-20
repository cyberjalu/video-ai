import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneVisual } from "../components/SceneVisuals";
import { CutFlashOverlay, SceneChrome } from "../components/SceneChrome";

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
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(30,58,138,0.4) 0%, rgba(7,13,26,1) 80%)",
        }}
      />
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
    layout === "split" ? 380 : layoutMode === "mono" ? 620 : layoutMode === "dual" ? 540 : 560;
  const bigCalloutText = callouts[0] ?? scene.caption_lines[0];

  return (
    <AbsoluteFill style={{ backgroundColor: "#070d1a", fontFamily: "Montserrat, sans-serif" }}>
      <CorporateBg />
      <AbsoluteFill
        style={{
          paddingTop: 100,
          paddingBottom: 220,
          paddingLeft: 64,
          paddingRight: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
          position: "relative",
        }}
      >
        <SceneChrome
          variant="corporate"
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
            theme="corporate"
          />
        </SceneChrome>
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
      <CutFlashOverlay cutFrames={cutFrames} variant="corporate" />
      <div style={{ display: "none" }}>{title}</div>
    </AbsoluteFill>
  );
};
