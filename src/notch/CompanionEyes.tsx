import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface CompanionEyesProps {
  glowColor?: string;
  blinking?: boolean;
}

/**
 * Minimalist glowing companion eyes rendered when the notch is tucked to prevent
 * click interception on browser tabs.
 */
export function CompanionEyes({ glowColor = "var(--theme-accent, #60a5fa)", blinking = true }: CompanionEyesProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!blinking) return;
    let t: number;
    const schedule = () => {
      // Irregular blinking cadence (between 2.5s and 5.5s)
      const nextDelay = 2500 + Math.random() * 3000;
      t = window.setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          schedule();
        }, 180);
      }, nextDelay);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [blinking]);

  return (
    <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 pointer-events-none select-none">
      <motion.div
        className="w-1.5 h-2.5 rounded-full"
        style={{
          backgroundColor: glowColor,
          boxShadow: `0 0 6px ${glowColor}`,
        }}
        animate={{ scaleY: blink ? 0.1 : 1 }}
        transition={{ duration: 0.12 }}
      />
      <motion.div
        className="w-1.5 h-2.5 rounded-full"
        style={{
          backgroundColor: glowColor,
          boxShadow: `0 0 6px ${glowColor}`,
        }}
        animate={{ scaleY: blink ? 0.1 : 1 }}
        transition={{ duration: 0.12 }}
      />
    </div>
  );
}
