import { useMemo } from "react";
import { motion } from "motion/react";
import { marqueeCycle, stayCycle } from "./cycles";
import { useCycle } from "./Carousel";

/** Text wider than its room scrolls to its end and back, three laps (one with `once`, no end with `endless`), then rests at its start; with `stay` it scrolls once and stays at its end. Remount it to start over. */
export function Marquee({ text, textWidth, width, paused, once, stay, endless, className = "text-footnote font-medium text-label" }: { text: string; textWidth: number; width: number; paused: boolean; once?: boolean; stay?: boolean; endless?: boolean; className?: string }) {
  const overflow = textWidth - width;
  const cycle = useMemo(() => {
    if (overflow <= 0.5) return null;
    if (stay) return stayCycle(overflow);
    const c = marqueeCycle(overflow);
    return once ? { ...c, done: (played: number) => played >= c.period - 1e-9 } : c;
  }, [overflow, once, stay]);
  const { x } = useCycle(cycle, paused, endless ? undefined : cycle?.done);
  return (
    <div className="flex h-full items-center overflow-clip" style={{ width }}>
      <motion.span className={`shrink-0 whitespace-nowrap ${className}`} style={{ x }} title={overflow > 0.5 ? text : undefined}>
        {text}
      </motion.span>
    </div>
  );
}
