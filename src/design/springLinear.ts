export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

/** Closed-form damped harmonic oscillator position, 0 -> 1, zero initial velocity. t in seconds. */
export function springPosition(t: number, k: number, c: number, m: number): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = w0 * Math.sqrt(z * z - 1);
  const r1 = -z * w0 + s;
  const r2 = -z * w0 - s;
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/**
 * Bake a spring into a native CSS `linear()` easing curve so the browser animates it
 * entirely on the compositor thread with zero per-frame JavaScript loop overhead.
 * Adapted from ding (MIT, Yusuf Cengiz).
 */
export function springEasing(config: SpringConfig = {}): { easing: string; duration: number } {
  const { stiffness = 170, damping = 18, mass = 1 } = config;
  const f = (t: number) => springPosition(t, stiffness, damping, mass);
  const dt = 1 / 120;
  const maxT = 5;
  // Settle time = last moment the spring is still more than 0.1% away from rest
  let settle = 0;
  for (let t = 0; t <= maxT; t += dt) {
    if (Math.abs(1 - f(t)) > 0.001) settle = t;
  }
  settle = Math.max(settle + dt, 0.05);
  const steps = Math.max(2, Math.ceil(settle * 60));
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(String(+f((i / steps) * settle).toFixed(4)));
  }
  pts[steps] = "1";
  return { easing: `linear(${pts.join(",")})`, duration: Math.round(settle * 1000) };
}
