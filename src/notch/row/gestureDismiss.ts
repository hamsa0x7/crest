/*
 * Touch/pointer gesture flick velocity physics for notices,
 * adapted 1:1 from ding (MIT, Yusuf Cengiz).
 */

export interface FlickInput {
  dx: number;
  dy: number;
  dt: number;
  /** -1 for top edge (notch), 1 for bottom edge */
  edge?: -1 | 1;
}

export interface FlickResult {
  speed: number;
  away: boolean;
  reach: number;
  flingX: number;
  flingY: number;
}

/**
 * Dampen movement when dragging into the screen (away from the nearest bezel).
 * Top notch (edge = -1): dragging down (dy > 0) resists with a 0.2 factor.
 */
export function dampenDrag(dy: number, edge: -1 | 1 = -1): number {
  if (dy * edge < 0) {
    return dy * 0.2;
  }
  return dy;
}

/**
 * Evaluates whether pointer release qualifies as a dismiss flick based on velocity and displacement.
 * Adapted directly from ding's gesture physics engine.
 */
export function evaluateFlick(input: FlickInput): FlickResult {
  const edge = input.edge ?? -1;
  const dt = Math.max(1, input.dt);
  const rawDy = input.dy;
  const dy = rawDy * edge; // > 0 means moving toward bezel/edge
  const dx = input.dx;
  const speed = Math.hypot(dx, rawDy) / dt;

  // Thresholds from ding: away if dragged far enough, or flicked fast enough with minor motion
  const away = dy > 30 || Math.abs(dx) > 60 || (speed > 0.4 && (dy > 10 || Math.abs(dx) > 15));

  const len = Math.hypot(dx, rawDy) || 1;
  const reach = Math.max(160, speed * 320);
  const flingX = (dx / len) * reach;
  const flingY = (rawDy / len) * reach;

  return {
    speed,
    away,
    reach,
    flingX,
    flingY,
  };
}
