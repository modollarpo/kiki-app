import React from "react";
import { Sequence, AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { K, TIMING } from "./lib/theme";
import { ProblemScene } from "./scenes/ProblemScene";
import { LogoReveal } from "./scenes/LogoReveal";
import { DashboardWalkthrough } from "./scenes/DashboardWalkthrough";
import { AgentsShowcase } from "./scenes/AgentsShowcase";
import { ResultsScene } from "./scenes/ResultsScene";
import { CTAScene } from "./scenes/CTAScene";
import { HoldScene } from "./scenes/HoldScene";

// Cross-fade transition wrapper
const CrossFade: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  );
};

export const KikiDemo: React.FC = () => {
  const T = TIMING;

  return (
    <AbsoluteFill style={{ background: K.g950 }}>
      {/* Scene 1: The Problem */}
      <Sequence from={T.PROBLEM.start} durationInFrames={T.PROBLEM.duration}>
        <CrossFade durationInFrames={T.PROBLEM.duration}>
          <ProblemScene />
        </CrossFade>
      </Sequence>

      {/* Scene 2: Logo Reveal */}
      <Sequence from={T.LOGO.start} durationInFrames={T.LOGO.duration}>
        <CrossFade durationInFrames={T.LOGO.duration}>
          <LogoReveal />
        </CrossFade>
      </Sequence>

      {/* Scene 3: Dashboard Walkthrough */}
      <Sequence from={T.DASHBOARD.start} durationInFrames={T.DASHBOARD.duration}>
        <CrossFade durationInFrames={T.DASHBOARD.duration}>
          <DashboardWalkthrough />
        </CrossFade>
      </Sequence>

      {/* Scene 4: AI Agents */}
      <Sequence from={T.AGENTS.start} durationInFrames={T.AGENTS.duration}>
        <CrossFade durationInFrames={T.AGENTS.duration}>
          <AgentsShowcase />
        </CrossFade>
      </Sequence>

      {/* Scene 5: Results */}
      <Sequence from={T.RESULTS.start} durationInFrames={T.RESULTS.duration}>
        <CrossFade durationInFrames={T.RESULTS.duration}>
          <ResultsScene />
        </CrossFade>
      </Sequence>

      {/* Scene 6: CTA */}
      <Sequence from={T.CTA.start} durationInFrames={T.CTA.duration}>
        <CrossFade durationInFrames={T.CTA.duration}>
          <CTAScene />
        </CrossFade>
      </Sequence>

      {/* Scene 7: Hold — logo with subtle glow (fills to 3:00) */}
      <Sequence from={T.HOLD.start} durationInFrames={T.HOLD.duration}>
        <CrossFade durationInFrames={T.HOLD.duration}>
          <HoldScene />
        </CrossFade>
      </Sequence>

      {/* Voiceover — each scene's audio starts at the scene's frame and is
          hard-cut at the scene boundary so no voiceover can ever bleed into
          the next scene. */}
      <Sequence from={T.PROBLEM.start} durationInFrames={T.PROBLEM.duration}>
        <Audio src={staticFile("demo/voiceover/problem.mp3")} volume={1} />
      </Sequence>
      <Sequence from={T.LOGO.start} durationInFrames={T.LOGO.duration}><Audio src={staticFile("demo/voiceover/logo.mp3")} volume={1} /></Sequence>
      <Sequence from={T.DASHBOARD.start} durationInFrames={T.DASHBOARD.duration}><Audio src={staticFile("demo/voiceover/dashboard.mp3")} volume={1} /></Sequence>
      <Sequence from={T.AGENTS.start} durationInFrames={T.AGENTS.duration}><Audio src={staticFile("demo/voiceover/agents.mp3")} volume={1} /></Sequence>
      <Sequence from={T.RESULTS.start} durationInFrames={T.RESULTS.duration}><Audio src={staticFile("demo/voiceover/results.mp3")} volume={1} /></Sequence>
      <Sequence from={T.CTA.start} durationInFrames={T.CTA.duration}><Audio src={staticFile("demo/voiceover/cta.mp3")} volume={1} /></Sequence>
      <Sequence from={T.HOLD.start} durationInFrames={T.HOLD.duration}><Audio src={staticFile("demo/voiceover/hold.mp3")} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};
