import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  subscribeDroplets,
  generatePrecipitationParticles,
  type DropletBeadInstance,
  type WeatherParticle,
} from "./ferrofluid";

interface Props {
  width: number;
  height: number;
  dropletBeadEnabled?: boolean;
  weatherDripsEnabled?: boolean;
  isPrecipitating?: boolean;
  precipType?: "rain" | "snow";
  tintColor?: string;
}

interface ActiveDroplet extends DropletBeadInstance {
  finalX: number;
}

export function FerrofluidLayer({
  width,
  height,
  dropletBeadEnabled = true,
  weatherDripsEnabled = true,
  isPrecipitating = false,
  precipType = "rain",
  tintColor = "var(--accent)",
}: Props) {
  const [droplets, setDroplets] = useState<ActiveDroplet[]>([]);
  const [particles, setParticles] = useState<WeatherParticle[]>([]);
  const nextParticleTimer = useRef<number | null>(null);

  // Subscribe to success droplet events
  useEffect(() => {
    if (!dropletBeadEnabled) return;

    return subscribeDroplets((inst) => {
      const finalX = inst.x < 0 ? width / 2 : Math.max(20, Math.min(width - 20, inst.x));
      const active: ActiveDroplet = { ...inst, finalX };

      setDroplets((prev) => [...prev.slice(-3), active]);

      // Remove after drop sequence completes (800ms)
      window.setTimeout(() => {
        setDroplets((prev) => prev.filter((d) => d.id !== inst.id));
      }, 850);
    });
  }, [dropletBeadEnabled, width]);

  // Ambient precipitation drips cycle
  useEffect(() => {
    if (!weatherDripsEnabled || !isPrecipitating) {
      setParticles([]);
      if (nextParticleTimer.current) window.clearTimeout(nextParticleTimer.current);
      return;
    }

    const spawnCycle = () => {
      const batch = generatePrecipitationParticles(3, precipType);
      setParticles(batch);

      nextParticleTimer.current = window.setTimeout(spawnCycle, 4500);
    };

    spawnCycle();

    return () => {
      if (nextParticleTimer.current) window.clearTimeout(nextParticleTimer.current);
    };
  }, [weatherDripsEnabled, isPrecipitating, precipType]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
    >
      {/* 1. Success Droplet Beads pinching off and falling with gravity */}
      <AnimatePresence>
        {droplets.map((d) => (
          <motion.div
            key={d.id}
            className="absolute"
            style={{
              left: d.finalX,
              top: height,
            }}
            initial={{ y: 0, scale: 0.8, opacity: 1 }}
            animate={{
              y: [0, 8, 22, 42],
              scale: [0.8, 1.1, 1, 0.4],
              opacity: [1, 1, 0.9, 0],
            }}
            transition={{
              duration: 0.75,
              ease: [0.33, 0, 0.67, 1], // Gravitational acceleration
              times: [0, 0.2, 0.55, 1],
            }}
          >
            {/* Fluid teardrop bead shape */}
            <svg
              width="14"
              height="18"
              viewBox="0 0 14 18"
              className="-translate-x-1/2 overflow-visible"
            >
              <defs>
                <radialGradient id={`drop-grad-${d.id}`} cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#1e293b" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                </radialGradient>
                <filter id={`drop-glow-${d.id}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Teardrop geometry */}
              <path
                d="M 7 0 C 6 4, 2 8, 2 12 A 5 5 0 0 0 12 12 C 12 8, 8 4, 7 0 Z"
                fill={`url(#drop-grad-${d.id})`}
                stroke={tintColor}
                strokeWidth="0.8"
                filter={`url(#drop-glow-${d.id})`}
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 2. Ambient Precipitation Drips on the bottom rim */}
      {isPrecipitating && (
        <div className="absolute inset-x-0 bottom-0 overflow-visible">
          {particles.map((p) => {
            const posX = Math.round(width * p.xRatio);
            if (p.type === "rain") {
              return (
                <motion.div
                  key={p.id}
                  className="absolute"
                  style={{ left: posX, top: 0 }}
                  initial={{ y: 0, opacity: 0, scaleY: 0.5 }}
                  animate={{
                    y: [0, 2, 8, 26],
                    opacity: [0, 0.75, 0.65, 0],
                    scaleY: [0.5, 1, 1.4, 0.8],
                  }}
                  transition={{
                    duration: p.durationMs / 1000,
                    delay: p.delayMs / 1000,
                    ease: "easeIn",
                    times: [0, 0.25, 0.5, 1],
                  }}
                >
                  <div
                    className="w-1 rounded-full"
                    style={{
                      height: "6px",
                      background: "linear-gradient(180deg, rgba(186, 230, 253, 0.7) 0%, rgba(56, 189, 248, 0.9) 100%)",
                      boxShadow: "0 0 4px rgba(56, 189, 248, 0.4)",
                    }}
                  />
                </motion.div>
              );
            }

            // Snow particle: drifts downward with soft sway
            return (
              <motion.div
                key={p.id}
                className="absolute"
                style={{ left: posX, top: 0 }}
                initial={{ y: 0, x: 0, opacity: 0, scale: 0.6 }}
                animate={{
                  y: [0, 6, 16, 30],
                  x: [0, -3, 3, -1],
                  opacity: [0, 0.85, 0.75, 0],
                  scale: [0.6, 1, 0.9, 0.5],
                }}
                transition={{
                  duration: p.durationMs / 1000,
                  delay: p.delayMs / 1000,
                  ease: "easeInOut",
                  times: [0, 0.3, 0.7, 1],
                }}
              >
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "radial-gradient(circle, #ffffff 40%, rgba(224, 242, 254, 0.6) 100%)",
                    boxShadow: "0 0 5px rgba(255, 255, 255, 0.75)",
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
