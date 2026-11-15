/**
 * Ferrofluid Liquid Island Physics & Environmental Dynamics Engine
 * (Ref: island / exuupery/island)
 *
 * Implements organic liquid physics for the notch:
 * 1. Organic Ferrofluid Lower Edge Stretch (cursor magnetic proximity pull)
 * 2. Ferrofluid Frequency Equalizer Spikes (audio spectrum audio visualizer)
 * 3. Success Droplet Bead Animation (liquid pinch-off and gravity drop)
 * 4. Idle Pill Sagging (relaxed fluid droop during user absence)
 * 5. Ambient Rain & Snow Drip Animation (live precipitation drips on rim)
 */

export interface FerrofluidPathOptions {
  stretchOffset?: number; // Downward stretch displacement (px, 0 to 14)
  stretchX?: number; // Horizontal center of magnetic pull (px)
  sagOffset?: number; // Downward idle sagging displacement (px, 0 to 8)
  spikes?: readonly number[]; // Frequency band heights [0, 1]
  spikeHeight?: number; // Max spike height (px, default 7)
}

export interface StretchCalculation {
  offset: number; // Downward pull in px
  x: number; // Horizontal center in px
  active: boolean;
}

/** Proximity threshold in px below the notch bottom edge. */
export const STRETCH_PROXIMITY_Y = 85;
/** Maximum stretch elongation in px. */
export const MAX_STRETCH_OFFSET = 12;

/**
 * Calculates organic cursor magnetic pull on the notch's lower edge.
 *
 * @param pointerX Cursor X relative to notch left edge
 * @param pointerY Cursor Y relative to notch top edge
 * @param notchW Current notch width in px
 * @param notchH Current notch height in px
 */
export function calculateFerrofluidStretch(
  pointerX: number,
  pointerY: number,
  notchW: number,
  notchH: number,
): StretchCalculation {
  if (notchW <= 0 || notchH <= 0) {
    return { offset: 0, x: notchW / 2, active: false };
  }

  const centerX = notchW / 2;
  const dy = pointerY - notchH;

  // Magnetic pull applies when cursor is directly below the bottom edge within threshold
  if (dy > 0 && dy < STRETCH_PROXIMITY_Y) {
    // Horizontal bounds: within the width plus margin
    const horizontalMargin = 35;
    const minX = -horizontalMargin;
    const maxX = notchW + horizontalMargin;

    if (pointerX >= minX && pointerX <= maxX) {
      // Proximity intensity curves: quadratic falloff with distance
      const distanceFactor = Math.max(0, 1 - dy / STRETCH_PROXIMITY_Y);
      const intensity = distanceFactor * distanceFactor;

      // Horizontal bell curve centered on pointerX
      const boundedX = Math.max(notchW * 0.15, Math.min(notchW * 0.85, pointerX));
      const offset = Number((MAX_STRETCH_OFFSET * intensity).toFixed(2));

      return {
        offset,
        x: Number(boundedX.toFixed(2)),
        active: offset > 0.5,
      };
    }
  }

  return { offset: 0, x: centerX, active: false };
}

/**
 * Calculates idle sag displacement based on user absence time.
 *
 * @param idleDurationMs Milliseconds elapsed since last input activity
 * @param thresholdMs Idle threshold (default 5 minutes = 300,000ms)
 * @param maxSagPx Maximum downward sagging in px (default 6px)
 */
export function calculateIdleSag(
  idleDurationMs: number,
  thresholdMs = 300_000,
  maxSagPx = 6,
): number {
  if (idleDurationMs <= thresholdMs) return 0;
  // Smooth ease-in over 30 seconds after threshold
  const excess = idleDurationMs - thresholdMs;
  const progress = Math.min(1, excess / 30_000);
  // Organic easeOutQuad
  const factor = progress * (2 - progress);
  return Number((maxSagPx * factor).toFixed(2));
}

/**
 * Computes the continuous SVG perimeter path incorporating ferrofluid deformations:
 * organic magnetic belly stretch, audio frequency spikes, and idle sagging.
 */
export function computeFerrofluidPerimeterPath(
  w: number,
  h: number,
  r: number,
  ear: number,
  rt: number,
  options: FerrofluidPathOptions = {},
): string {
  const {
    stretchOffset = 0,
    stretchX = w / 2,
    sagOffset = 0,
    spikes = [],
    spikeHeight = 7,
  } = options;

  const effectiveSag = sagOffset;
  const effectiveStretch = stretchOffset;
  const hasSpikes = spikes.length > 0 && spikes.some((s) => s > 0.04);
  const isDeformed = effectiveStretch > 0.2 || effectiveSag > 0.2 || hasSpikes;

  // Base path start for top ears or top rounded corners
  let path = "";
  if (ear > 0.5) {
    const cp1x = Number((-ear * 0.45).toFixed(2));
    const cp2y = Number((ear * 0.45).toFixed(2));
    path = `M ${-ear} 0 C ${cp1x} 0, 0 ${cp2y}, 0 ${ear} L 0 ${h - r}`;
  } else {
    path = `M ${rt} 0 L ${w - rt} 0 A ${rt} ${rt} 0 0 1 ${w} ${rt} L ${w} ${h - r}`;
  }

  // Bottom boundary deformation
  if (!isDeformed) {
    // Standard pristine geometric corners & bottom line
    if (ear > 0.5) {
      const rcp1y = Number((ear * 0.45).toFixed(2));
      const rcp2x = Number((w + ear * 0.45).toFixed(2));
      return `${path} A ${r} ${r} 0 0 0 ${r} ${h} L ${w - r} ${h} A ${r} ${r} 0 0 0 ${w} ${h - r} L ${w} ${ear} C ${w} ${rcp1y}, ${rcp2x} 0, ${w + ear} 0`;
    }
    return `${path} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${rt} A ${rt} ${rt} 0 0 1 ${rt} 0 Z`;
  }

  // Deformed bottom perimeter
  const startX = ear > 0.5 ? r : r;
  const endX = ear > 0.5 ? w - r : w - r;
  const baseH = h;

  // Bottom-right and bottom-left curves with stretch and sag
  const peakY = baseH + effectiveStretch + effectiveSag;
  const targetX = Math.max(startX + 10, Math.min(endX - 10, stretchX));

  let bottomCurve = "";

  if (hasSpikes) {
    // Divide the bottom span into frequency spike segments
    const count = spikes.length;
    const span = endX - startX;
    const step = span / count;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
      const segX = startX + i * step + step / 2;
      const spikeVal = spikes[i] ?? 0;
      const sagDamp = Math.sin((i / (count - 1)) * Math.PI);
      const segY = baseH + (effectiveSag * sagDamp) + (spikeVal * spikeHeight);
      points.push({ x: Number(segX.toFixed(2)), y: Number(segY.toFixed(2)) });
    }

    // Connect spikes with smooth quadratic curves
    bottomCurve = `L ${startX} ${baseH}`;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const prevX = i === 0 ? startX : (points[i - 1].x + pt.x) / 2;
      const prevY = i === 0 ? baseH : (points[i - 1].y + pt.y) / 2;
      bottomCurve += ` Q ${prevX} ${prevY}, ${pt.x} ${pt.y}`;
    }
    bottomCurve += ` L ${endX} ${baseH}`;
  } else {
    // Smooth organic fluid belly curve pulling toward (targetX, peakY)
    const cp1x = Number((startX + (targetX - startX) * 0.45).toFixed(2));
    const cp1y = Number((baseH + effectiveStretch * 0.25 + effectiveSag * 0.5).toFixed(2));
    const cp2x = Number((targetX - (targetX - startX) * 0.25).toFixed(2));
    const cp2y = Number(peakY.toFixed(2));

    const cp3x = Number((targetX + (endX - targetX) * 0.25).toFixed(2));
    const cp3y = Number(peakY.toFixed(2));
    const cp4x = Number((endX - (endX - targetX) * 0.45).toFixed(2));
    const cp4y = Number((baseH + effectiveStretch * 0.25 + effectiveSag * 0.5).toFixed(2));

    bottomCurve = `L ${startX} ${baseH} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${peakY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${endX} ${baseH}`;
  }

  if (ear > 0.5) {
    const rcp1y = Number((ear * 0.45).toFixed(2));
    const rcp2x = Number((w + ear * 0.45).toFixed(2));
    return `M ${-ear} 0 C ${Number((-ear * 0.45).toFixed(2))} 0, 0 ${Number((ear * 0.45).toFixed(2))}, 0 ${ear} L 0 ${h - r} A ${r} ${r} 0 0 0 ${startX} ${baseH} ${bottomCurve} A ${r} ${r} 0 0 0 ${w} ${h - r} L ${w} ${ear} C ${w} ${rcp1y}, ${rcp2x} 0, ${w + ear} 0`;
  }

  return `M ${rt} 0 L ${w - rt} 0 A ${rt} ${rt} 0 0 1 ${w} ${rt} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${endX} ${baseH} ${bottomCurve} A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${rt} A ${rt} ${rt} 0 0 1 ${rt} 0 Z`;
}

/** Single success droplet bead instance. */
export interface DropletBeadInstance {
  id: string;
  x: number; // x position in px relative to notch left edge
  radius: number; // radius in px
  createdAt: number;
}

/** Global droplet listener subscription. */
type DropletListener = (droplet: DropletBeadInstance) => void;
const dropletListeners = new Set<DropletListener>();

/**
 * Triggers a success droplet bead pinch-off animation.
 *
 * @param x Optional X coordinate in px (defaults to center)
 */
export function triggerSuccessDroplet(x?: number): void {
  const droplet: DropletBeadInstance = {
    id: `droplet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x: x ?? -1, // -1 denotes centered
    radius: 3.5,
    createdAt: performance.now(),
  };

  dropletListeners.forEach((listener) => {
    try {
      listener(droplet);
    } catch {
      // Safe noop
    }
  });
}

/** Subscribes to success droplet trigger events. */
export function subscribeDroplets(listener: DropletListener): () => void {
  dropletListeners.add(listener);
  return () => dropletListeners.delete(listener);
}

/** Rain and snow environmental particles for ambient drips. */
export interface WeatherParticle {
  id: string;
  xRatio: number; // 0.0 to 1.0 along the bottom span
  type: "rain" | "snow";
  delayMs: number;
  durationMs: number;
}

/** Generates randomized precipitation particles. */
export function generatePrecipitationParticles(
  count = 4,
  type: "rain" | "snow" = "rain",
): WeatherParticle[] {
  const particles: WeatherParticle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: `p-${i}-${Math.random().toString(36).slice(2, 6)}`,
      xRatio: 0.15 + (0.7 * (i + Math.random())) / count,
      type,
      delayMs: Math.round(i * 1200 + Math.random() * 800),
      durationMs: type === "rain" ? 1800 : 2600,
    });
  }
  return particles;
}
