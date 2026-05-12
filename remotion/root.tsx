import React from "react";
import { Composition } from "remotion";
import { NewsStoryV1, type NewsStoryV1Props, calcDurationInFrames } from "./templates/NewsStoryV1";

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
    </>
  );
};
