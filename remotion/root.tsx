import React from "react";
import { Composition } from "remotion";
import { NewsStoryV1, type NewsStoryV1Props, calcDurationInFrames } from "./templates/NewsStoryV1";
import { CorporateNewsV1 } from "./templates/CorporateNewsV1";
import { YouTubeStoryV1, type YouTubeStoryV1Props, calcDurationInFrames as calcDurationYouTube } from "./templates/YouTubeStoryV1";

export const Root: React.FC = () => {
  return (
    <>
      <Composition<NewsStoryV1Props>
        id="NewsStoryV1"
        component={NewsStoryV1}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={30 * 60}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calcDurationInFrames({ props, fps: 30 }),
          };
        }}
        defaultProps={{
          title: "Demo",
          audioPath: "",
          audioSrc: "",
          scenes: [],
          showProgress: true,
          showCallouts: true,
          layoutMode: "tri",
        }}
      />
      <Composition<NewsStoryV1Props>
        id="CorporateNewsV1"
        component={CorporateNewsV1}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={30 * 60}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calcDurationInFrames({ props, fps: 30 }),
          };
        }}
        defaultProps={{
          title: "Demo",
          audioPath: "",
          audioSrc: "",
          scenes: [],
          showProgress: true,
          showCallouts: true,
          layoutMode: "tri",
        }}
      />
      <Composition<YouTubeStoryV1Props>
        id="YouTubeStoryV1"
        component={YouTubeStoryV1}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={30 * 60}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calcDurationYouTube({ props, fps: 30 }),
          };
        }}
        defaultProps={{
          title: "Demo",
          audioPath: "",
          audioSrc: "",
          scenes: [],
          showProgress: true,
          showCallouts: true,
          layoutMode: "tri",
        }}
      />
    </>
  );
};
