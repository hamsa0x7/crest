/**
 * Perimeter styling engine for the notch:
 * Gradient rim accents, border glow, light effects, and customizable edge lighting.
 */

export type RimPreset =
  | "none"
  | "silver"
  | "aurora"
  | "cyberpunk"
  | "gold"
  | "crimson"
  | "emerald"
  | "violet"
  | "sunset"
  | "ice"
  | "rgb"
  | "custom";

export type RimEffect = "none" | "breathing" | "wave" | "zoom" | "shifting" | "neon";

export interface RimStyleConfig {
  preset: RimPreset;
  thickness: number; // 0.5px to 2.5px
  glow: number; // 0% to 100%
  effect?: RimEffect;
  speed?: number; // 0.5 to 3.0
  customStart?: string;
  customEnd?: string;
}

export const RIM_PRESETS: { id: RimPreset; label: string; preview: string }[] = [
  { id: "none", label: "Aus", preview: "transparent" },
  { id: "silver", label: "Subtiles Silber", preview: "linear-gradient(135deg, #e2e8f0, #94a3b8)" },
  { id: "aurora", label: "Prismatische Aurora", preview: "linear-gradient(135deg, #38bdf8, #818cf8, #34d399)" },
  { id: "cyberpunk", label: "Cyberpunk Neon", preview: "linear-gradient(135deg, #06b6d4, #ec4899)" },
  { id: "gold", label: "Flüssiges Gold", preview: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)" },
  { id: "crimson", label: "Crimson Flame", preview: "linear-gradient(135deg, #ef4444, #f97316)" },
  { id: "emerald", label: "Emerald Glow", preview: "linear-gradient(135deg, #10b981, #06b6d4)" },
  { id: "violet", label: "Deep Violet", preview: "linear-gradient(135deg, #8b5cf6, #ec4899)" },
  { id: "sunset", label: "Sunset Glow", preview: "linear-gradient(135deg, #f43f5e, #fbbf24)" },
  { id: "ice", label: "Arctic Ice", preview: "linear-gradient(135deg, #38bdf8, #3b82f6)" },
  { id: "rgb", label: "Chroma RGB", preview: "linear-gradient(135deg, #ff0055, #00ff66, #00ccff)" },
  { id: "custom", label: "Benutzerdefiniert", preview: "linear-gradient(135deg, var(--rim-custom-start, #60a5fa), var(--rim-custom-end, #c084fc))" },
];

export const RIM_EFFECTS: { id: RimEffect; label: string }[] = [
  { id: "none", label: "Aus" },
  { id: "breathing", label: "Atmen" },
  { id: "wave", label: "Welle" },
  { id: "zoom", label: "Zoom" },
  { id: "shifting", label: "Farbwechsel" },
  { id: "neon", label: "Neon" },
];

export const RIM_GRADIENTS: Record<Exclude<RimPreset, "none" | "custom">, string> = {
  silver: "linear-gradient(145deg, rgba(255,255,255,0.45) 0%, rgba(148,163,184,0.3) 50%, rgba(203,213,225,0.4) 100%)",
  aurora: "linear-gradient(135deg, #38bdf8 0%, #818cf8 40%, #c084fc 70%, #34d399 100%)",
  cyberpunk: "linear-gradient(135deg, #00f5ff 0%, #7928ca 50%, #ff007a 100%)",
  gold: "linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)",
  crimson: "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #dc2626 100%)",
  emerald: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #059669 100%)",
  violet: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #6366f1 100%)",
  sunset: "linear-gradient(135deg, #f43f5e 0%, #fb923c 50%, #facc15 100%)",
  ice: "linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #0284c7 100%)",
  rgb: "linear-gradient(135deg, #ff0055 0%, #ff5500 20%, #ffcc00 40%, #00ff66 60%, #00ccff 80%, #aa00ff 100%)",
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
    case "aurora":
      return `0 0 ${blur + 4}px ${spread}px rgba(56, 189, 248, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(192, 132, 252, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "cyberpunk":
      return `0 0 ${blur + 4}px ${spread}px rgba(0, 245, 255, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(255, 0, 122, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "gold":
      return `0 0 ${blur}px ${spread}px rgba(245, 158, 11, ${alpha})`;
    case "crimson":
      return `0 0 ${blur + 4}px ${spread}px rgba(239, 68, 68, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(249, 115, 22, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "emerald":
      return `0 0 ${blur + 4}px ${spread}px rgba(16, 185, 129, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(6, 182, 212, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "violet":
      return `0 0 ${blur + 4}px ${spread}px rgba(139, 92, 246, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(236, 72, 153, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "sunset":
      return `0 0 ${blur + 4}px ${spread}px rgba(244, 63, 94, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(251, 191, 36, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "ice":
      return `0 0 ${blur + 4}px ${spread}px rgba(56, 189, 248, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(59, 130, 246, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "rgb":
      return `0 0 ${blur + 4}px ${spread}px rgba(0, 204, 255, ${alpha}), 0 0 ${blur + 8}px ${spread}px rgba(255, 0, 85, ${(Number(alpha) * 0.7).toFixed(2)})`;
    case "custom":
      return `0 0 ${blur}px ${spread}px ${customStart}${Math.round(Number(alpha) * 255).toString(16).padStart(2, "0")}`;
    default:
      return null;
  }
}

/** Resolves the shape color. */
export function getFrostedShapeColor(baseShape: string, _frostedGlass = false, _glassOpacity = 75): string {
  return baseShape;
}

/** Resolves the single-color stroke fallback for SVG ear curves and fine accents. */
export function getRimStrokeColor(preset: RimPreset, customStart = "#60a5fa"): string | null {
  switch (preset) {
    case "silver":
      return "rgba(203, 213, 225, 0.55)";
    case "aurora":
      return "#38bdf8";
    case "cyberpunk":
      return "#00f5ff";
    case "gold":
      return "#f59e0b";
    case "crimson":
      return "#ef4444";
    case "emerald":
      return "#10b981";
    case "violet":
      return "#8b5cf6";
    case "sunset":
      return "#f43f5e";
    case "ice":
      return "#38bdf8";
    case "rgb":
      return "#00ccff";
    case "custom":
      return customStart;
    default:
      return null;
  }
}

export interface RimColorStop {
  offset: string;
  color: string;
}

export function getRimStops(preset: RimPreset, customStart = "#60a5fa", customEnd = "#c084fc"): RimColorStop[] | null {
  switch (preset) {
    case "silver":
      return [
        { offset: "0%", color: "#e2e8f0" },
        { offset: "50%", color: "#94a3b8" },
        { offset: "100%", color: "#cbd5e1" },
      ];
    case "aurora":
      return [
        { offset: "0%", color: "#38bdf8" },
        { offset: "40%", color: "#818cf8" },
        { offset: "70%", color: "#c084fc" },
        { offset: "100%", color: "#34d399" },
      ];
    case "cyberpunk":
      return [
        { offset: "0%", color: "#00f5ff" },
        { offset: "50%", color: "#7928ca" },
        { offset: "100%", color: "#ff007a" },
      ];
    case "gold":
      return [
        { offset: "0%", color: "#fef08a" },
        { offset: "50%", color: "#f59e0b" },
        { offset: "100%", color: "#b45309" },
      ];
    case "crimson":
      return [
        { offset: "0%", color: "#ef4444" },
        { offset: "50%", color: "#f97316" },
        { offset: "100%", color: "#dc2626" },
      ];
    case "emerald":
      return [
        { offset: "0%", color: "#10b981" },
        { offset: "50%", color: "#06b6d4" },
        { offset: "100%", color: "#059669" },
      ];
    case "violet":
      return [
        { offset: "0%", color: "#8b5cf6" },
        { offset: "50%", color: "#ec4899" },
        { offset: "100%", color: "#6366f1" },
      ];
    case "sunset":
      return [
        { offset: "0%", color: "#f43f5e" },
        { offset: "50%", color: "#fb923c" },
        { offset: "100%", color: "#facc15" },
      ];
    case "ice":
      return [
        { offset: "0%", color: "#38bdf8" },
        { offset: "50%", color: "#60a5fa" },
        { offset: "100%", color: "#0284c7" },
      ];
    case "rgb":
      return [
        { offset: "0%", color: "#ff0055" },
        { offset: "20%", color: "#ff5500" },
        { offset: "40%", color: "#ffcc00" },
        { offset: "60%", color: "#00ff66" },
        { offset: "80%", color: "#00ccff" },
        { offset: "100%", color: "#aa00ff" },
      ];
    case "custom":
      return [
        { offset: "0%", color: customStart },
        { offset: "100%", color: customEnd },
      ];
    default:
      return null;
  }
}

/** Computes the continuous SVG perimeter path encompassing ears and the body. */
export function computeNotchPerimeterPath(w: number, h: number, r: number, ear: number, rt: number): string {
  if (ear > 0.5) {
    const cp1x = Number((-ear * 0.45).toFixed(2));
    const cp2y = Number((ear * 0.45).toFixed(2));
    const rcp1y = Number((ear * 0.45).toFixed(2));
    const rcp2x = Number((w + ear * 0.45).toFixed(2));

    return `M ${-ear} 0 C ${cp1x} 0, 0 ${cp2y}, 0 ${ear} L 0 ${h - r} A ${r} ${r} 0 0 0 ${r} ${h} L ${w - r} ${h} A ${r} ${r} 0 0 0 ${w} ${h - r} L ${w} ${ear} C ${w} ${rcp1y}, ${rcp2x} 0, ${w + ear} 0`;
  }

  return `M ${rt} 0 L ${w - rt} 0 A ${rt} ${rt} 0 0 1 ${w} ${rt} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${rt} A ${rt} ${rt} 0 0 1 ${rt} 0 Z`;
}
