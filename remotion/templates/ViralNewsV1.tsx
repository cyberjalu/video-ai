import React from "react";
import { NewsStoryV1, type NewsStoryV1Props, calcDurationInFrames } from "./NewsStoryV1";

/**
 * ViralNewsV1 — same pipeline as NewsStoryV1 with stronger hook chrome defaults.
 * Distinct composition id so viral-fast can target it without affecting corporate templates.
 */
export function ViralNewsV1(props: NewsStoryV1Props) {
  return (
    <NewsStoryV1
      {...props}
      showProgress={props.showProgress ?? true}
      showCallouts={props.showCallouts ?? true}
    />
  );
}

export { calcDurationInFrames };
export type { NewsStoryV1Props as ViralNewsV1Props };
