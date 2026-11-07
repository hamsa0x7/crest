import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type Transition } from "motion/react";
import type { NotchGeometry } from "./geometry";
import { across, uprightCss, type Edge } from "./edge";

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
export function NotchShape({ geometry, transition, elevated, edge = "top", thin = false, birthAnimation = false, children }: Props) {
  const shouldBirth = useRef(birthAnimation && !hasBirthedSession).current;
  if (!hasBirthedSession) {
    hasBirthedSession = true;
  }

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
          animate(contentOpacity, 1, { duration: 0.35, delay: 0.25, ease: "easeOut" }),
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
    const c = animate(shadow, elevated ? 1 : 0, { duration: 0.3, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [elevated, shadow]);

  return (
    <motion.div
      data-notch-shape
      className="relative"
      // The theme's background open; closed black, unless the theme opts in (--notch-closed). Crossfades (themes.css).
      style={{
        width: wPx,
        height: hPx,
        y: birthY,
        ["--shape" as string]: elevated ? "var(--color-notch)" : "var(--notch-closed)",
      }}
    >
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
      </motion.svg>
      <motion.div
        aria-hidden
        className="absolute inset-0"
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
      <motion.div
        // clip instead of hidden: no scroll container, so focus/scrollIntoView can't shift the content.
        className="absolute inset-0 overflow-clip bg-(--shape)"
        style={{ borderTopLeftRadius: rt, borderTopRightRadius: rt, borderBottomLeftRadius: r, borderBottomRightRadius: r, containerType: edge === "top" ? undefined : "size" }}
      >
        <motion.div style={{ opacity: contentOpacity }} className="h-full w-full">
          {edge === "top" ? children : <Upright edge={edge}>{children}</Upright>}
        </motion.div>
      </motion.div>
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
