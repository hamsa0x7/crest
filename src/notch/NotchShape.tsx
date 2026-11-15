import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue, type Transition } from "motion/react";
import type { NotchGeometry } from "./geometry";
import { across, uprightCss, type Edge } from "./edge";
import { GlassLayer, type GlassMode } from "./glass/GlassLayer";

import { getFrostedShapeColor, getRimStops, computeNotchPerimeterPath, type RimPreset, type RimEffect } from "./rim";
import { computeFerrofluidPerimeterPath } from "./ferrofluid";
import { FerrofluidLayer } from "./FerrofluidLayer";

interface Props {
  geometry: NotchGeometry;
  transition: Transition;
  /** Shadow only when the notch "floats" over content (open). */
  elevated: boolean;
  /** The edge it hangs from; the shape is drawn in that edge's frame and its content is turned back upright. */
  edge?: Edge;
  /** The line: nothing is centred across it, so its thickness takes whole device pixels instead of an even number, and half px steps show. */
  thin?: boolean;
  /** Rising orb birth animation ("Naissance") on initial launch sequence. */
  birthAnimation?: boolean;
  /** Whether album cover tint is active on the open notch. */
  tinted?: boolean;
  rimPreset?: RimPreset;
  rimThickness?: number;
  rimGlow?: number;
  rimEffect?: RimEffect;
  rimSpeed?: number;
  rimCustomStart?: string;
  rimCustomEnd?: string;
  frostedGlass?: boolean;
  glassOpacity?: number;
  surfaceSheen?: boolean;
  refractiveHighlight?: boolean;
  shaking?: boolean;
  lockFeedback?: "locked" | "unlocked" | null;
  /** The open panel as glass (src/notch/glass): armed, the canvas waits; shown, it draws and --shape clears to let it through. */
  glass?: GlassMode;
  /** Which copy the glass draws: the open panel's (snapshot.ts) or the closed shapes' live one (live.ts). */
  look?: "panel" | "closed";
  /** The shape's top as it springs (Notch.tsx), which moves the glass's canvas over the copy. */
  top?: MotionValue<number>;
  /** The open panel hangs from the edge (not a floating capsule's): the glass keeps the closed notch's colour under its header. */
  hangs?: boolean;
  /** Ferrofluid liquid physics: organic lower edge stretch. */
  ferrofluidStretch?: boolean;
  stretchOffset?: MotionValue<number>;
  stretchX?: MotionValue<number>;
  sagOffset?: MotionValue<number>;
  spikes?: readonly number[];
  dropletBead?: boolean;
  weatherDrips?: boolean;
  isPrecipitating?: boolean;
  precipType?: "rain" | "snow";
  children?: ReactNode;
}

/** Ensures the rising orb birth sequence only fires once per application session. */
let hasBirthedSession = false;

/**
 * The shape (black closed, the theme background open): a body with rounded bottom corners + two concave "ears"
 * at the top rendered with cubic Bézier SVG paths that seamlessly blend into the screen bezel (the capsule
 * has no ears and rounds its top corners instead).
 *
 * All dimensions are motion values animated directly by springs, no React
 * re-render per frame. Animations are interruptible and keep their velocity
 * (important when hovering in and out quickly).
 */
export function NotchShape({
  geometry,
  transition,
  elevated,
  edge = "top",
  thin = false,
  glass = "off",
  look = "panel",
  top: propTop,
  hangs = true,
  birthAnimation = false,
  tinted = false,
  rimPreset = "none",
  rimThickness = 1.2,
  rimGlow = 35,
  rimEffect = "none",
  rimSpeed = 1.0,
  rimCustomStart = "#60a5fa",
  rimCustomEnd = "#c084fc",
  frostedGlass = false,
  glassOpacity = 75,
  surfaceSheen = true,
  refractiveHighlight = true,
  shaking = false,
  lockFeedback = null,
  ferrofluidStretch = true,
  stretchOffset,
  stretchX,
  sagOffset,
  spikes = [],
  dropletBead = true,
  weatherDrips = true,
  isPrecipitating = false,
  precipType = "rain",
  children,
}: Props) {
  const fallbackTop = useMotionValue(0);
  const top = propTop ?? fallbackTop;
  const shouldBirth = useRef(birthAnimation && !hasBirthedSession).current;
  if (!hasBirthedSession) {
    hasBirthedSession = true;
  }

  const rimStops = getRimStops(rimPreset, rimCustomStart, rimCustomEnd);
  
  const baseShape = elevated ? "var(--color-notch)" : "var(--notch-closed)";
  const shapeColor = getFrostedShapeColor(baseShape, frostedGlass, glassOpacity);

  const fallbackStretchOffset = useMotionValue(0);
  const fallbackStretchX = useMotionValue(geometry.w / 2);
  const fallbackSagOffset = useMotionValue(0);
  const activeStretchOffset = stretchOffset ?? fallbackStretchOffset;
  const activeStretchX = stretchX ?? fallbackStretchX;
  const activeSagOffset = sagOffset ?? fallbackSagOffset;

  const w = useMotionValue(shouldBirth ? 34 : geometry.w);
  const h = useMotionValue(shouldBirth ? 34 : geometry.h);
  const r = useMotionValue(shouldBirth ? 17 : geometry.r);
  const ear = useMotionValue(shouldBirth ? 0 : geometry.ear);
  const rt = useMotionValue(shouldBirth ? 17 : geometry.rt);
  const birthY = useMotionValue(shouldBirth ? 14 : 0);
  const contentOpacity = useMotionValue(shouldBirth ? 0 : 1);
  const shadow = useMotionValue(elevated ? 1 : 0);
  const earOffset = useTransform(ear, (e) => -e + 0.5); // 0.5px overlap against hairlines
  // Whole device pixels: the shape is centered, so an odd or fractional size puts its edges
  // (and the cover pinned to them) on subpixels that shift every frame, which reads as jitter.
  const wPx = useTransform(w, snap);
  const hPx = useTransform(h, thin ? whole : snap);
  const earDisplay = useTransform(ear, (v) => (v > 0.5 ? "block" : "none"));

  const rimPathD = useTransform(
    [w, h, r, ear, rt, activeStretchOffset, activeStretchX, activeSagOffset],
    ([wVal, hVal, rVal, earVal, rtVal, sOffVal, sXVal, sagVal]) => {
      const sOff = Number(sOffVal);
      const sX = Number(sXVal);
      const sag = Number(sagVal);
      if (!elevated && ferrofluidStretch && (sOff > 0.1 || sag > 0.1 || (spikes && spikes.length > 0))) {
        return computeFerrofluidPerimeterPath(
          Number(wVal),
          Number(hVal),
          Number(rVal),
          Number(earVal),
          Number(rtVal),
          {
            stretchOffset: sOff,
            stretchX: sX,
            sagOffset: sag,
            spikes: spikes ?? [],
          }
        );
      }
      return computeNotchPerimeterPath(
        Number(wVal),
        Number(hVal),
        Number(rVal),
        Number(earVal),
        Number(rtVal)
      );
    }
  );

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (shouldBirth) {
        const tBirth = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };
        const controls = [
          animate(birthY, 0, { duration: 0.4, ease: [0.16, 1, 0.3, 1] }),
          animate(w, geometry.w, tBirth),
          animate(h, geometry.h, tBirth),
          animate(r, geometry.r, tBirth),
          animate(rt, geometry.rt, tBirth),
          animate(ear, geometry.ear, { duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }),
        ];
        return () => controls.forEach((c) => c.stop());
      }
      return;
    }
    // Settle to within 0.01 px: the live activity follows the width on subpixels, and
    // Motion's default rest threshold ended every spring with a visible ~0.25 px jump.
    const t = { ...transition, restDelta: 0.01, restSpeed: 0.1 };
    // Rounding the top waits a moment, so the ears are already going in (notch to capsule, as in BrimDeck).
    const top = geometry.rt > rt.get() ? { ...t, delay: 0.06 } : t;
    const controls = [animate(w, geometry.w, t), animate(h, geometry.h, t), animate(r, geometry.r, t), animate(ear, geometry.ear, t), animate(rt, geometry.rt, top)];
    return () => controls.forEach((c) => c.stop());
  }, [geometry.w, geometry.h, geometry.r, geometry.ear, geometry.rt, transition, w, h, r, ear, rt]);

  useEffect(() => {
    if (elevated) {
      contentOpacity.set(1);
      return;
    }
    if (shouldBirth) {
      const c = animate(contentOpacity, 1, { duration: 0.35, delay: 0.25, ease: "easeOut" });
      return () => {
        c.stop();
        contentOpacity.set(1);
      };
    } else {
      contentOpacity.set(1);
    }
  }, [shouldBirth, elevated, contentOpacity]);

  useEffect(() => {
    const c = animate(shadow, elevated ? 1 : 0, { duration: 0.3, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [elevated, shadow]);

  return (
    <motion.div
      data-notch-shape
      className="relative"
      animate={shaking ? { x: [-6, 6, -4, 4, -2, 2, 0] } : undefined}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      style={{
        width: wPx,
        height: hPx,
        y: birthY,
        ["--shape" as string]: glass === "shown" && (elevated || look === "closed") ? "transparent" : shapeColor,
      }}
    >
      {/* Under the ears and the shadow like the shape's own colour, so its ears crossfade with --shape too. */}
      {glass !== "off" && <GlassLayer mode={glass} look={look} w={wPx} h={hPx} r={r} ear={ear} rt={rt} top={top} target={geometry} hangs={hangs} />}
      <motion.span
        aria-hidden
        className="absolute top-0 pointer-events-none"
        style={{
          left: earOffset,
          width: ear,
          height: ear,
          display: earDisplay,
          backdropFilter: frostedGlass ? "blur(24px) saturate(180%)" : undefined,
          WebkitBackdropFilter: frostedGlass ? "blur(24px) saturate(180%)" : undefined,
          WebkitMask:
            "radial-gradient(circle farthest-side at 0% 100%, transparent calc(100% - 0.75px), #000 100%)",
          mask:
            "radial-gradient(circle farthest-side at 0% 100%, transparent calc(100% - 0.75px), #000 100%)",
          background: "var(--shape)",
        }}
      />
      <motion.span
        aria-hidden
        className="absolute top-0 pointer-events-none"
        style={{
          right: earOffset,
          width: ear,
          height: ear,
          display: earDisplay,
          backdropFilter: frostedGlass ? "blur(24px) saturate(180%)" : undefined,
          WebkitBackdropFilter: frostedGlass ? "blur(24px) saturate(180%)" : undefined,
          WebkitMask:
            "radial-gradient(circle farthest-side at 100% 100%, transparent calc(100% - 0.75px), #000 100%)",
          mask:
            "radial-gradient(circle farthest-side at 100% 100%, transparent calc(100% - 0.75px), #000 100%)",
          background: "var(--shape)",
        }}
      />
      <motion.svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute top-0 pointer-events-none"
        style={{
          left: earOffset,
          width: ear,
          height: ear,
          fill: "var(--shape)",
          display: earDisplay,
        }}
      >
        <path d="M 0 0 L 100 0 L 100 100 C 100 45, 55 0, 0 0 Z" />
        <path
          d="M 0 0 L 100 0 L 100 100 C 100 45, 55 0, 0 0 Z"
          data-ear-ambience={elevated && tinted ? "on" : "off"}
          style={{ fill: "var(--accent)" }}
        />
      </motion.svg>
      <motion.svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute top-0 pointer-events-none"
        style={{
          right: earOffset,
          width: ear,
          height: ear,
          fill: "var(--shape)",
          display: earDisplay,
        }}
      >
        <path d="M 100 0 L 0 0 L 0 100 C 0 45, 45 0, 100 0 Z" />
        <path
          d="M 100 0 L 0 0 L 0 100 C 0 45, 45 0, 100 0 Z"
          data-ear-ambience={elevated && tinted ? "on" : "off"}
          style={{ fill: "var(--accent)" }}
        />
      </motion.svg>

      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: shadow,
          borderTopLeftRadius: rt,
          borderTopRightRadius: rt,
          borderBottomLeftRadius: r,
          borderBottomRightRadius: r,
          // Within the window's margin around the largest panel (10 px on the sides, 20 below, display.rs), or a wide panel shows
          // the shadow cut off in a straight line on a light wallpaper.
          boxShadow: "0 10px 20px -10px rgb(0 0 0 / 0.7), 0 3px 8px rgb(0 0 0 / 0.35)",
        }}
      />
      {rimStops && (
        <motion.svg
          aria-hidden
          className="absolute inset-0 pointer-events-none z-20 overflow-visible"
          animate={
            rimEffect === "shifting"
              ? { filter: ["hue-rotate(0deg)", "hue-rotate(360deg)"] }
              : undefined
          }
          transition={
            rimEffect === "shifting"
              ? { repeat: Infinity, duration: 4 / rimSpeed, ease: "linear" }
              : undefined
          }
        >
          <defs>
            <linearGradient id="notch-rim-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              {rimStops.map((s: { offset: string; color: string }, idx: number) => (
                <stop key={idx} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
            {rimGlow > 0 && (
              <filter id="notch-rim-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={Math.round(4 * (rimGlow / 100) + 2)} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>
          <motion.path
            d={rimPathD}
            fill="none"
            stroke="url(#notch-rim-grad)"
            strokeWidth={rimThickness}
            strokeLinecap="round"
            filter={rimGlow > 0 ? "url(#notch-rim-glow)" : undefined}
            strokeDasharray={rimEffect === "wave" ? "120 40" : undefined}
            animate={
              rimEffect === "breathing"
                ? { opacity: [0.35, 1, 0.35] }
                : rimEffect === "wave"
                ? { strokeDashoffset: [0, 400] }
                : rimEffect === "zoom"
                ? { strokeWidth: [rimThickness * 0.8, rimThickness * 1.5, rimThickness * 0.8] }
                : rimEffect === "neon"
                ? { opacity: [0.85, 1, 0.65, 1, 0.9, 1] }
                : undefined
            }
            transition={
              rimEffect === "breathing"
                ? { repeat: Infinity, duration: 3 / rimSpeed, ease: "easeInOut" }
                : rimEffect === "wave"
                ? { repeat: Infinity, duration: 4 / rimSpeed, ease: "linear" }
                : rimEffect === "zoom"
                ? { repeat: Infinity, duration: 2.2 / rimSpeed, ease: "easeInOut" }
                : rimEffect === "neon"
                ? { repeat: Infinity, duration: 1.6 / rimSpeed, ease: "easeInOut" }
                : undefined
            }
          />
        </motion.svg>
      )}
      <motion.div
        // clip instead of hidden: no scroll container, so focus/scrollIntoView can't shift the content.
        className="absolute inset-0 overflow-clip bg-(--shape)"
        style={{
          borderTopLeftRadius: rt,
          borderTopRightRadius: rt,
          borderBottomLeftRadius: r,
          borderBottomRightRadius: r,
          containerType: edge === "top" ? undefined : "size",
          backdropFilter: frostedGlass ? "blur(24px) saturate(180%)" : undefined,
          WebkitBackdropFilter: frostedGlass ? "blur(24px) saturate(180%)" : undefined,
          background: frostedGlass
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, transparent 60px), linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, transparent 40%), linear-gradient(165deg, transparent 40%, rgba(0, 0, 0, 0.2) 100%), var(--shape)"
            : undefined,
        }}
      >
        {frostedGlass && surfaceSheen && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 35%, transparent 60%)",
              mixBlendMode: "screen",
            }}
          />
        )}
        {frostedGlass && refractiveHighlight && (
          <>
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.25), inset 1px 0 0 rgba(255, 255, 255, 0.15), inset -1px 0 0 rgba(255, 255, 255, 0.15)",
              }}
            />
            <div
              aria-hidden
              className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                width: "48%",
                height: "2px",
                borderRadius: "9999px",
                background:
                  "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent)",
                filter: "blur(0.4px)",
              }}
            />
          </>
        )}
        {lockFeedback && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              boxShadow:
                lockFeedback === "locked"
                  ? "inset 0 0 0 2px var(--red), 0 0 12px var(--red)"
                  : "inset 0 0 0 2px var(--green), 0 0 12px var(--green)",
              borderRadius: "inherit",
              opacity: 0.85,
            }}
          />
        )}
        <motion.div style={{ opacity: elevated ? 1 : contentOpacity }} className="relative z-1 h-full w-full">
          {edge === "top" ? children : <Upright edge={edge}>{children}</Upright>}
        </motion.div>
      </motion.div>

      {/* Ferrofluid Liquid SVG Base Path: ensures continuous liquid belly, spikes, and sag fill */}
      {!elevated && (
        <motion.svg
          aria-hidden
          className="absolute inset-0 pointer-events-none overflow-visible -z-1"
          style={{ width: "100%", height: "100%" }}
        >
          <motion.path d={rimPathD} fill="var(--shape)" />
          {spikes && spikes.length > 0 && (
            <motion.path
              d={rimPathD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 3px var(--accent))",
              }}
            />
          )}
        </motion.svg>
      )}

      {/* Ferrofluid Liquid Droplet Beads & Environmental Precipitation Drips */}
      <FerrofluidLayer
        width={geometry.w}
        height={geometry.h}
        dropletBeadEnabled={dropletBead}
        weatherDripsEnabled={weatherDrips}
        isPrecipitating={isPrecipitating}
        precipType={precipType}
        tintColor="var(--accent)"
      />
    </motion.div>
  );
}

/**
 * The content turned back upright in the shape: a box as wide and tall as the shape on screen (its height and width in the frame on a side
 * edge), centred in it and turned by the inverse of the frame's mapping, so text reads normally on every edge.
 */
function Upright({ edge, children }: { edge: Edge; children?: ReactNode }) {
  const turned = across(edge);
  return (
    <div
      className="absolute top-1/2 left-1/2"
      style={{ width: turned ? "100cqh" : "100cqw", height: turned ? "100cqw" : "100cqh", transform: `translate(-50%, -50%) ${uprightCss(edge)}` }}
    >
      {children}
    </div>
  );
}

/** Nearest size that is an even number of device pixels, so both centered edges land on whole pixels. */
function snap(v: number): number {
  const dpr = window.devicePixelRatio || 1;
  return (Math.round((v * dpr) / 2) * 2) / dpr;
}

/** Nearest whole number of device pixels, at least one (BrimDeck's SnapToDevicePixels). */
function whole(v: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(v * dpr)) / dpr;
}
