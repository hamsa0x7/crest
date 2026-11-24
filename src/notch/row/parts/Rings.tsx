import { brandColor, brandName } from "../../../ui/brands";
import type { UsageId, UsageProvider } from "../../../platform/services";
import { windowLabel } from "../../../features/usage/UsageView";
import { ringWindows } from "./ringWindows";

export const RING = 12, RING_GAP = 8;

/** Providers that have a quota to show: windows and no error. */
export const ringProviders = (providers: UsageProvider[]) => providers.filter((p) => p.windows.length > 0 && !p.error);

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** A provider's ring in the row: the longer limit outside, the session inside (ringWindows.ts), and both named for a screen reader. */
export function ringProps(p: UsageProvider): { value: number; inner: number | null; label: string } {
  const r = ringWindows(p.windows);
  if (!r) return { value: 0, inner: null, label: brandName[p.id] };
  const part = (w: { kind: string; usedPercent: number }) => `${windowLabel(w.kind)} ${Math.round(clamp(w.usedPercent))}%`;
  return {
    value: clamp(r.outer.usedPercent),
    inner: r.inner && clamp(r.inner.usedPercent),
    label: [`${brandName[p.id]} ${part(r.outer)}`, r.inner && part(r.inner)].filter(Boolean).join(", "),
  };
}

/** One arc of `v` (0..100) on radius `r`, filling counter-clockwise from the top. */
function Arc({ id, v, r, width, opacity = 1 }: { id: UsageId; v: number; r: number; width: number; opacity?: number }) {
  return (
    <>
      <circle cx="6" cy="6" r={r} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={width} />
      {v > 0 && (
        <circle
          cx="6" cy="6" r={r} fill="none" stroke={brandColor[id]} strokeOpacity={opacity} strokeWidth={width} strokeLinecap={v >= 99.9 ? "butt" : "round"}
          pathLength={100} strokeDasharray={v >= 99.9 ? "100 0" : `${v} 100`}
          // Rotated to start at the top, then mirrored: counter-clockwise.
          transform="matrix(-1 0 0 1 12 0) rotate(-90 6 6)"
        />
      )}
    </>
  );
}

/**
 * One quota (0..100) as a ring in the provider's colour, 12 px in the row; no letter (three of them start with C). `inner`: a
 * second, thinner ring inside it (the session). `label`: its name for a screen reader, when no text beside it says it.
 */
export function Ring({ id, value, inner = null, size = RING, label }: { id: UsageId; value: number; inner?: number | null; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className="shrink-0 text-label" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Arc id={id} v={value} r={5} width={2} />
      {inner !== null && <Arc id={id} v={inner} r={2.25} width={1.5} opacity={0.8} />}
    </svg>
  );
}
