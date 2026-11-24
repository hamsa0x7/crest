import { AnimatePresence, motion } from "motion/react";
import { content } from "../../design/motion";
import { Marquee } from "../../notch/row/Marquee";

/** Widest a lyric line gets in the closed notch; longer lines scroll once and stay at their end. */
export const LIVE_LYRIC_MAX = 420;

/** The current lyric line in the closed notch: each new line fades in over the old one; one too long scrolls once and stays at its end until the next line (#54). */
export function LiveLyric({ text, textWidth, width, paused }: { text: string; textWidth: number; width: number; paused: boolean }) {
  return (
    <div className="relative h-full" style={{ width }}>
      <AnimatePresence initial={false}>
        <motion.div
          key={text}
          className="absolute inset-0 flex justify-center"
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: content.enter }}
          exit={{ opacity: 0, filter: "blur(4px)", transition: content.exit }}
        >
          <Marquee text={text} textWidth={textWidth} width={Math.min(width, textWidth)} paused={paused} stay />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
