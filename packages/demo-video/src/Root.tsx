import React from "react";
import { Composition } from "remotion";
import { KikiDemo } from "./KikiDemo";
import { VIDEO } from "./lib/theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="KIKIDemo"
      component={KikiDemo}
      durationInFrames={VIDEO.TOTAL_FRAMES}
      fps={VIDEO.FPS}
      width={VIDEO.WIDTH}
      height={VIDEO.HEIGHT}
    />
  );
};
