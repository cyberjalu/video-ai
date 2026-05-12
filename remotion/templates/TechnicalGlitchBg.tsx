import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const TechnicalGlitchBg: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, height, fps } = useVideoConfig();

  const glitchIntensity = useMemo(() => {
    const glitchPoints = [10, 25, 40, 55, 70, 85];
    return glitchPoints.reduce((acc, point) => {
      const glitchFrame = Math.round((point / 100) * durationInFrames);
      const distance = Math.abs(frame - glitchFrame);
      if (distance < 8) {
        return Math.max(acc, 1 - distance / 8);
      }
      return acc;
    }, 0);
  }, [frame, durationInFrames]);

  const t = frame / fps;
  const noiseOffset = interpolate(frame % 15, [0, 15], [0, 120]);
  const scanlineOffset = interpolate(frame % 28, [0, 28], [-60, height + 60]);

  const rgbShift = glitchIntensity * 3;
  const glitchTranslate = glitchIntensity * Math.sin(frame * 0.12) * 6;

  const gridOffsetX = (t * 22) % 120;
  const gridOffsetY = (t * 34) % 120;
  const gridAngle = Math.sin(t * 0.35) * 6;
  const hue = (t * 18) % 360;

  return (
    <AbsoluteFill>
      {/* Base neon cyber gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #07121f 0%, #0b1a33 22%, #102a4d 45%, #171b4d 70%, #2b0f4d 100%)",
          filter: `hue-rotate(${hue}deg) saturate(1.35) brightness(1.05)`,
          transform: `scale(1.02) translateY(${Math.sin(t * 0.35) * 10}px)`,
        }}
      />

      {/* Neon fog / glow blobs */}
      <div
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          left: "-10%",
          top: "-10%",
          background:
            "radial-gradient(circle at 25% 20%, rgba(0,255,255,0.22) 0%, transparent 55%), radial-gradient(circle at 75% 75%, rgba(255,0,255,0.18) 0%, transparent 60%), radial-gradient(circle at 55% 35%, rgba(0,170,255,0.14) 0%, transparent 52%)",
          filter: "blur(18px)",
          opacity: 0.95,
          transform: `translate(${Math.sin(t * 0.6) * 18}px, ${Math.cos(t * 0.55) * 16}px)`,
        }}
      />

      {/* Animated grid */}
      <div
        style={{
          position: "absolute",
          width: "140%",
          height: "140%",
          left: "-20%",
          top: "-20%",
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.10) 1px, transparent 1px)
          `,
          backgroundSize: "120px 120px",
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          transform: `rotate(${gridAngle}deg) translateX(${glitchTranslate}px)`,
          opacity: 0.32 + glitchIntensity * 0.12,
          mixBlendMode: "screen",
        }}
      />

      {/* Circuit-like diagonals */}
      <div
        style={{
          position: "absolute",
          width: "140%",
          height: "140%",
          left: "-20%",
          top: "-20%",
          backgroundImage: `
            repeating-linear-gradient(135deg, rgba(255,0,255,0.14) 0px, rgba(255,0,255,0.14) 2px, transparent 2px, transparent 34px),
            repeating-linear-gradient(45deg, rgba(0,255,255,0.10) 0px, rgba(0,255,255,0.10) 1px, transparent 1px, transparent 26px)
          `,
          opacity: 0.22,
          filter: "blur(0.2px)",
          transform: `translateY(${Math.sin(t * 0.9) * 10}px)`,
          mixBlendMode: "screen",
        }}
      />
      
      {/* Digital noise effect */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              rgba(255,255,255,${0.02 + glitchIntensity * 0.05}) 1px,
              transparent 2px,
              transparent 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              rgba(255,255,255,${0.01 + glitchIntensity * 0.03}) 1px,
              transparent 2px,
              transparent 3px
            )
          `,
          transform: `translateX(${noiseOffset}px)`,
          opacity: 0.22 + glitchIntensity * 0.35,
        }}
      />
      
      {/* Scanlines + beam */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "3px",
          background: `linear-gradient(90deg, transparent, rgba(0,255,255,${0.16 + glitchIntensity * 0.22}), transparent)`,
          transform: `translateY(${scanlineOffset}px)`,
          boxShadow: `0 0 16px rgba(0,255,255,${0.22 + glitchIntensity * 0.35})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "220px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,255,255,0.10) 40%, rgba(0,255,255,0.06) 60%, transparent 100%)",
          transform: `translateY(${scanlineOffset - 110}px)`,
          opacity: 0.55,
          mixBlendMode: "screen",
          filter: "blur(6px)",
        }}
      />
      
      {/* RGB Shift effect */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "inherit",
          mixBlendMode: "screen",
          filter: `blur(${glitchIntensity}px)`,
          transform: `translateX(${rgbShift}px) translateY(${glitchTranslate}px)`,
          opacity: glitchIntensity * 0.3,
        }}
      />
      
      {/* Glitch bars */}
      {glitchIntensity > 0.1 && (
        <>
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "6px",
              background: `rgba(255,0,255,${glitchIntensity * 0.42})`,
              transform: `translateY(${240 + glitchTranslate * 2}px)`,
              boxShadow: `0 0 26px rgba(255,0,255,${glitchIntensity * 0.75})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "3px",
              background: `rgba(0,255,255,${glitchIntensity * 0.62})`,
              transform: `translateY(${680 - glitchTranslate}px)`,
              boxShadow: `0 0 20px rgba(0,255,255,${glitchIntensity * 0.55})`,
            }}
          />
        </>
      )}
      
      {/* Vignette effect */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
