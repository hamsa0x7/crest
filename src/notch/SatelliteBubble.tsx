import { motion, type MotionValue } from "motion/react";
import { ArrowDown, HourglassMedium, MusicNoteSimple, Sparkle } from "@phosphor-icons/react";
import { springs } from "../design/motion";
import { remainingOf, timer } from "../features/timer/store";
import { downloads } from "../features/downloads/store";
import { useNowPlaying } from "../platform/media";
import { t } from "../i18n";

export interface ActiveActivity {
  id: "media" | "timer" | "downloads" | "agent";
  tool: string;
}

export interface SatelliteBubbleProps {
  activity: ActiveActivity;
  shapeWidth: number;
  top?: MotionValue<number>;
  onOpen: (tool: string) => void;
}

/**
 * Detached 30px circular satellite activity bubble (Ref: kanade, yata, quiera-island).
 * Appears when two concurrent activities run, displaying the secondary activity 8px to the right of the primary island.
 */
export function SatelliteBubble({ activity, shapeWidth, top, onOpen }: SatelliteBubbleProps) {
  const tState = timer.use();
  const dlList = downloads.use();
  const np = useNowPlaying();

  let content = null;
  let label = "";

  if (activity.id === "timer") {
    const rem = remainingOf(tState);
    const total = tState.duration || 1;
    const fraction = Math.max(0, Math.min(1, rem / total));
    // 22px diameter ring, r = 9 => circumference = 2 * PI * 9 ~= 56.548
    const circ = 56.548;
    const strokeDashoffset = circ * (1 - fraction);
    const mins = Math.ceil(rem / 60);

    label = `${t("Timer")}: ${mins} min`;
    content = (
      <div className="relative flex size-full items-center justify-center">
        <svg className="absolute size-[24px] -rotate-90" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-white/15"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-orange transition-all duration-300"
          />
        </svg>
        <HourglassMedium size={12} weight="fill" className="text-orange" />
      </div>
    );
  } else if (activity.id === "downloads") {
    label = `${dlList.length} ${t("Downloads")}`;
    content = (
      <div className="relative flex size-full items-center justify-center text-accent">
        <ArrowDown size={14} weight="bold" />
      </div>
    );
  } else if (activity.id === "agent") {
    label = t("Agent");
    content = (
      <div className="relative flex size-full items-center justify-center text-accent">
        <Sparkle size={13} weight="fill" className="animate-pulse" />
      </div>
    );
  } else if (activity.id === "media") {
    label = np?.title || t("Musik");
    content = np?.artwork ? (
      <img src={np.artwork} alt="" className="size-full rounded-full object-cover" />
    ) : (
      <MusicNoteSimple size={13} weight="bold" className="text-label-2" />
    );
  }

  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      className="pointer-events-auto absolute left-1/2 flex size-[30px] items-center justify-center rounded-full border border-white/10 bg-black/90 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110 active:scale-95 focus:outline-none"
      style={{
        top: top ?? 0,
      }}
      initial={{ x: shapeWidth / 2 + 8, scale: 0, opacity: 0 }}
      animate={{ x: shapeWidth / 2 + 8, scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={springs.snappy}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(activity.tool);
      }}
    >
      {content}
    </motion.button>
  );
}
