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
  hue: number;
}

/**
 * Black Hole Gravitational Charger Animation
 * Procedural Canvas 2D accretion disk & gravitational lensing simulation
 * triggered upon power charger connect / disconnect.
 */
export function BlackHoleCharger({ style, percent, charging, onDismiss }: BlackHoleChargerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (style === "off") {
      onDismiss();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tTime = 0;
    const subtle = style === "subtle";
    const particleCount = subtle ? 12 : 28;
    const particles: Particle[] = [];

    // Initialize orbiting accretion particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * (subtle ? 25 : 45),
        speed: 0.02 + Math.random() * 0.04,
        size: 0.8 + Math.random() * (subtle ? 1.0 : 1.6),
        alpha: 0.3 + Math.random() * 0.7,
        hue: Math.random() > 0.4 ? 35 : 190,
      });
    }

    const startMs = performance.now();
    const durationMs = 4500;

    const render = (now: number) => {
      const elapsed = now - startMs;
      if (elapsed >= durationMs) {
        onDismiss();
        return;
      }

      tTime += 0.025;
      const progress = elapsed / durationMs;
      const fade = progress < 0.15 ? progress / 0.15 : progress > 0.8 ? (1 - progress) / 0.2 : 1.0;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 - 4;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));

      // 1. Accretion Disk Outer Radiance
      const glowGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, subtle ? 40 : 65);
      if (charging) {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
        glowGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.2)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(251, 146, 60, 0.4)");
        glowGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.18)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, subtle ? 40 : 65, 0, Math.PI * 2);
      ctx.fill();

      // 2. Gravitational Lensing Arcs
      const numBands = subtle ? 5 : 9;
      for (let b = 0; b < numBands; b++) {
        const radX = (subtle ? 18 : 26) + b * (subtle ? 2.5 : 3.8);
        const radY = radX * (subtle ? 0.38 : 0.32);
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
        p.radius -= 0.08;
        if (p.radius < 12) {
          p.radius = 24 + Math.random() * (subtle ? 20 : 40);
        }
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * (p.radius * 0.35);

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = charging
          ? `rgba(186, 230, 253, ${p.alpha * 0.8})`
          : `rgba(254, 215, 170, ${p.alpha * 0.8})`;
        ctx.fill();
      }

      // 4. Central Event Horizon
      const horizonRad = subtle ? 10 : 14;
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRad, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();

      // 5. Photon Ring
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRad + 0.75, 0, Math.PI * 2);
      ctx.strokeStyle = charging ? "rgba(224, 242, 254, 0.9)" : "rgba(254, 243, 199, 0.9)";
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [style, charging, onDismiss]);

  if (style === "off") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
      <canvas ref={canvasRef} width={280} height={70} className="w-[280px] h-[70px]" />
      <div className="absolute bottom-1.5 flex items-center gap-1.5 text-caption font-medium tracking-wide text-label">
        <span className="size-1.5 rounded-full animate-pulse" style={{ backgroundColor: charging ? "#38bdf8" : "#fb923c" }} />
        <span>{charging ? (percent !== null ? `${t("Lädt auf")} · ${percent}%` : t("Lädt auf")) : t("Getrennt")}</span>
      </div>
    </div>
  );
}
