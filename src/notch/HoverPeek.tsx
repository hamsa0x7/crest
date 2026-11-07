import { motion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowsOutSimple,
  HourglassMedium,
  MusicNoteSimple,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "@phosphor-icons/react";
import { media, useNowPlaying } from "../platform/media";
import { remainingOf, timer, timerActions } from "../features/timer/store";
import { formatTime } from "../lib/format";
import { t } from "../i18n";
import { fade } from "../design/motion";

export interface HoverPeekProps {
  kind: "media" | "timer";
  onOpen: (tab: string) => void;
}

/**
 * Compact interactive HUD revealed on hover over active music or timer (Ref: kanade, NotchX).
 * Provides 1-click playback or timer controls without forcing full panel expansion.
 */
export function HoverPeek({ kind, onOpen }: HoverPeekProps) {
  if (kind === "media") {
    return <MediaHoverPeek onOpen={onOpen} />;
  }
  return <TimerHoverPeek onOpen={onOpen} />;
}

function MediaHoverPeek({ onOpen }: { onOpen: (tab: string) => void }) {
  const np = useNowPlaying();
  if (!np) return null;

  const isPlaying = !!np.isPlaying;

  return (
    <motion.div
      key="media-peek"
      className="flex h-11 w-[320px] items-center justify-between gap-2.5 px-3 select-none"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={fade}
      onClick={() => onOpen("media")}
    >
      {/* Artwork */}
      <div className="relative size-7 shrink-0 overflow-hidden rounded-md bg-fill-2 shadow-sm">
        {np.artwork ? (
          <img src={np.artwork} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-label-2">
            <MusicNoteSimple size={14} weight="bold" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
        <span className="truncate text-footnote font-semibold text-label">
          {np.title || t("Kein Titel")}
        </span>
        <span className="truncate text-caption text-label-2">
          {np.artist || t("Unbekannter Künstler")}
        </span>
      </div>

      {/* Mini Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label={t("Vorheriger Titel")}
          title={t("Vorheriger Titel")}
          onClick={(e) => {
            e.stopPropagation();
            media.previous();
          }}
          className="flex size-6 items-center justify-center rounded-full text-label-2 transition-colors hover:bg-fill-2 hover:text-label active:scale-95"
        >
          <SkipBack size={13} weight="fill" />
        </button>

        <button
          type="button"
          aria-label={isPlaying ? t("Pause") : t("Abspielen")}
          title={isPlaying ? t("Pause") : t("Abspielen")}
          onClick={(e) => {
            e.stopPropagation();
            media.toggle();
          }}
          className="flex size-7 items-center justify-center rounded-full bg-fill-2 text-label shadow-sm transition-all hover:bg-fill-3 hover:scale-105 active:scale-95"
        >
          {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" className="translate-x-0.5" />}
        </button>

        <button
          type="button"
          aria-label={t("Nächster Titel")}
          title={t("Nächster Titel")}
          onClick={(e) => {
            e.stopPropagation();
            media.next();
          }}
          className="flex size-6 items-center justify-center rounded-full text-label-2 transition-colors hover:bg-fill-2 hover:text-label active:scale-95"
        >
          <SkipForward size={13} weight="fill" />
        </button>

        <button
          type="button"
          aria-label={t("Öffnen")}
          title={t("Öffnen")}
          onClick={(e) => {
            e.stopPropagation();
            onOpen("media");
          }}
          className="ml-1 flex size-6 items-center justify-center rounded-full text-label-3 transition-colors hover:bg-fill-2 hover:text-label"
        >
          <ArrowsOutSimple size={12} weight="bold" />
        </button>
      </div>
    </motion.div>
  );
}

function TimerHoverPeek({ onOpen }: { onOpen: (tab: string) => void }) {
  const tState = timer.use();
  const running = tState.endsAt !== null;
  const rem = remainingOf(tState);
  const timeText = formatTime(Math.ceil(rem));
  const modeLabel = tState.mode === "focus" ? t("Fokus") : t("Pause");

  return (
    <motion.div
      key="timer-peek"
      className="flex h-11 w-[270px] items-center justify-between gap-2.5 px-3 select-none"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={fade}
      onClick={() => onOpen("timer")}
    >
      {/* Icon Badge */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange/15 text-orange">
        <HourglassMedium size={14} weight="fill" className={running ? "animate-pulse" : ""} />
      </div>

      {/* Timer Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
        <span className="font-mono text-footnote font-bold tabular-nums text-label">
          {timeText}
        </span>
        <span className="truncate text-caption text-label-2">
          {running ? modeLabel : `${modeLabel} · ${t("Pausiert")}`}
        </span>
      </div>

      {/* Mini Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label={running ? t("Pause") : t("Start")}
          title={running ? t("Pause") : t("Start")}
          onClick={(e) => {
            e.stopPropagation();
            if (running) {
              timerActions.pause();
            } else {
              timerActions.start();
            }
          }}
          className="flex size-7 items-center justify-center rounded-full bg-fill-2 text-label shadow-sm transition-all hover:bg-fill-3 hover:scale-105 active:scale-95"
        >
          {running ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" className="translate-x-0.5" />}
        </button>

        <button
          type="button"
          aria-label={t("Zurücksetzen")}
          title={t("Zurücksetzen")}
          onClick={(e) => {
            e.stopPropagation();
            timerActions.reset();
          }}
          className="flex size-6 items-center justify-center rounded-full text-label-2 transition-colors hover:bg-fill-2 hover:text-label active:scale-95"
        >
          <ArrowCounterClockwise size={13} weight="bold" />
        </button>

        <button
          type="button"
          aria-label={t("Öffnen")}
          title={t("Öffnen")}
          onClick={(e) => {
            e.stopPropagation();
            onOpen("timer");
          }}
          className="ml-1 flex size-6 items-center justify-center rounded-full text-label-3 transition-colors hover:bg-fill-2 hover:text-label"
        >
          <ArrowsOutSimple size={12} weight="bold" />
        </button>
      </div>
    </motion.div>
  );
}
