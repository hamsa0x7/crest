import { useEffect, useRef } from "react";
import { t } from "../i18n";

export interface BlackHoleChargerProps {
  style: "cinematic" | "subtle" | "off";
  percent: number | null;
  charging: boolean;
  onDismiss: () => void;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
}

/**
 * Black Hole Gravitational Charger Animation
 * Procedural Canvas 2D accretion disk & gravitational lensing simulation
 * triggered upon power charger connect / disconnect.
 */
export function BlackHoleCharger({ style, percent, charging, onDismiss }: BlackHoleChargerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (style === "off") {
      const id = window.setTimeout(() => dismissRef.current(), 0);
      return () => window.clearTimeout(id);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const subtle = style === "subtle";
    const particleCount = subtle ? 10 : 20;
    const particles: Particle[] = [];

    // Initialize orbiting accretion particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 8 + Math.random() * (subtle ? 12 : 18),
        speed: 0.03 + Math.random() * 0.04,
        size: 0.7 + Math.random() * (subtle ? 0.6 : 1.1),
        alpha: 0.3 + Math.random() * 0.7,
      });
    }

    const startMs = performance.now();
    const durationMs = 3800;

    const render = (now: number) => {
      const elapsed = now - startMs;
      if (elapsed >= durationMs) {
        dismissRef.current();
        return;
      }

      const progress = elapsed / durationMs;
      const fade = progress < 0.12 ? progress / 0.12 : progress > 0.82 ? (1 - progress) / 0.18 : 1.0;

      const w = canvas.width;
      const h = canvas.height;
      const cx = 20;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));

      // 1. Accretion Disk Outer Radiance
      const glowGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, subtle ? 16 : 22);
      if (charging) {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.5)");
        glowGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.22)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(251, 146, 60, 0.45)");
        glowGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.2)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, subtle ? 16 : 22, 0, Math.PI * 2);
      ctx.fill();

      // 2. Gravitational Lensing Arcs
      const numBands = subtle ? 3 : 5;
      for (let b = 0; b < numBands; b++) {
        const radX = (subtle ? 7 : 10) + b * (subtle ? 1.8 : 2.2);
        const radY = radX * (subtle ? 0.45 : 0.38);
        const bandAlpha = (1 - b / numBands) * (subtle ? 0.35 : 0.55);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, radX, radY, -0.15, 0, Math.PI * 2);
        ctx.strokeStyle = charging
          ? `rgba(${b % 2 === 0 ? "56, 189, 248" : "129, 140, 248"}, ${bandAlpha})`
          : `rgba(${b % 2 === 0 ? "251, 146, 60" : "244, 63, 94"}, ${bandAlpha})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Orbiting Accretion Particles
      for (const p of particles) {
        p.angle += p.speed;
        p.radius -= 0.05;
        if (p.radius < 5) {
          p.radius = 11 + Math.random() * (subtle ? 10 : 16);
        }
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * (p.radius * 0.4);

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = charging
          ? `rgba(186, 230, 253, ${p.alpha * 0.85})`
          : `rgba(254, 215, 170, ${p.alpha * 0.85})`;
        ctx.fill();
      }

      // 4. Central Event Horizon
      const horizonRad = subtle ? 4.5 : 6;
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRad, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();

      // 5. Photon Ring
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRad + 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = charging ? "rgba(224, 242, 254, 0.95)" : "rgba(254, 243, 199, 0.95)";
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [style, charging]);

  if (style === "off") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-3">
      <div className="flex items-center gap-1.5">
        <canvas ref={canvasRef} width={44} height={32} className="h-8 w-11 shrink-0" />
        <div className="flex items-center gap-1.5 text-caption font-medium tracking-wide text-label">
          <span className="size-1.5 shrink-0 rounded-full animate-pulse" style={{ backgroundColor: charging ? "#38bdf8" : "#fb923c" }} />
          <span className="whitespace-nowrap">{charging ? (percent !== null ? `${t("Lädt")} · ${percent}%` : t("Lädt")) : t("Getrennt")}</span>
        </div>
      </div>
    </div>
  );
}
