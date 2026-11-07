/**
 * Perimeter styling engine for the notch:
 * Gradient rim accents, border glow, and customizable edge lighting.
 */

export type RimPreset = "none" | "silver" | "frosted" | "aurora" | "cyberpunk" | "gold" | "custom";

export interface RimStyleConfig {
  preset: RimPreset;
  thickness: number; // 0.5px to 2.5px
  glow: number; // 0% to 100%
  customStart?: string;
  customEnd?: string;
}

export const RIM_PRESETS: { id: RimPreset; label: string; preview: string }[] = [
  { id: "none", label: "Aus", preview: "transparent" },
  { id: "silver", label: "Subtiles Silber", preview: "linear-gradient(135deg, #e2e8f0, #94a3b8)" },
  { id: "frosted", label: "Mattiertes Glas", preview: "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.15))" },
  { id: "aurora", label: "Prismatische Aurora", preview: "linear-gradient(135deg, #38bdf8, #818cf8, #34d399)" },
  { id: "cyberpunk", label: "Cyberpunk Neon", preview: "linear-gradient(135deg, #06b6d4, #ec4899)" },
  { id: "gold", label: "Flüssiges Gold", preview: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)" },
  { id: "custom", label: "Benutzerdefiniert", preview: "linear-gradient(135deg, var(--rim-custom-start, #60a5fa), var(--rim-custom-end, #c084fc))" },
];

export const RIM_GRADIENTS: Record<Exclude<RimPreset, "none" | "custom">, string> = {
  silver: "linear-gradient(145deg, rgba(255,255,255,0.45) 0%, rgba(148,163,184,0.3) 50%, rgba(203,213,225,0.4) 100%)",
  frosted: "linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.35) 100%)",
  aurora: "linear-gradient(135deg, #38bdf8 0%, #818cf8 40%, #c084fc 70%, #34d399 100%)",
  cyberpunk: "linear-gradient(135deg, #00f5ff 0%, #7928ca 50%, #ff007a 100%)",
  gold: "linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)",
};

/** Resolves the CSS gradient string for the given rim configuration. */
export function getRimGradient(preset: RimPreset, customStart = "#60a5fa", customEnd = "#c084fc"): string | null {
  if (preset === "none") return null;
  if (preset === "custom") {
    return `linear-gradient(135deg, ${customStart} 0%, ${customEnd} 100%)`;
  }
  return RIM_GRADIENTS[preset] ?? null;
}

/** Resolves box-shadow atmospheric glow for the notch perimeter. */
export function getRimGlowShadow(preset: RimPreset, glowIntensity: number, customStart = "#60a5fa"): string | null {
  if (preset === "none" || glowIntensity <= 0) return null;
  const factor = Math.min(100, Math.max(0, glowIntensity)) / 100;
  const blur = Math.round(8 * factor + 4);
  const spread = Math.round(2 * factor);
  const alpha = (0.35 * factor).toFixed(2);

  switch (preset) {
    case "silver":
      return `0 0 ${blur}px ${spread}px rgba(226, 232, 240, ${alpha})`;
    case "frosted":
      return `0 0 ${blur}px ${spread}px rgba(255, 255, 255, ${alpha})`;
    case "aurora":
      return `0 0 ${blur + 4}px ${spread}px rgba(56, 189, 248, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(192, 132, 252, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "cyberpunk":
      return `0 0 ${blur + 4}px ${spread}px rgba(0, 245, 255, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(255, 0, 122, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "gold":
      return `0 0 ${blur}px ${spread}px rgba(245, 158, 11, ${alpha})`;
    case "custom":
      return `0 0 ${blur}px ${spread}px ${customStart}${Math.round(Number(alpha) * 255).toString(16).padStart(2, "0")}`;
    default:
      return null;
  }
}

/** Resolves the shape color incorporating frosted glass alpha mixing when enabled. */
export function getFrostedShapeColor(baseShape: string, frostedGlass: boolean, glassOpacity: number): string {
  if (!frostedGlass) return baseShape;
  const clamped = Math.max(10, Math.min(100, Math.round(glassOpacity)));
  return `color-mix(in srgb, ${baseShape} ${clamped}%, transparent)`;
}
