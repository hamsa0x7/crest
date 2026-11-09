import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { ArrowDownLeft, FastForward, Pause, Play, Rewind, X } from "@phosphor-icons/react";
import { media, useNowPlaying } from "../../platform/media";
import { YouTubeMirror, useMirrorVideo } from "../now-playing/YouTubeMirror";
import { Marquee } from "../../notch/row/Marquee";
import { t } from "../../i18n";

const SNAP_AFTER_MS = 220;

export function PipApp() {
  const np = useNowPlaying();
  const video = useMirrorVideo(np?.videoId);
  const playing = !!np?.isPlaying;
  const positionMs = (np?.position ?? 0) * 1000;
  const durationMs = (np?.duration ?? 0) * 1000;
  const [hovered, setHovered] = useState(false);

  // Snap to edges on drag end
  const snapTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    try {
      const win = getCurrentWebviewWindow();
      win.onMoved(() => {
        window.clearTimeout(snapTimer.current);
        snapTimer.current = window.setTimeout(() => void invoke("pip_snap"), SNAP_AFTER_MS);
      }).then((fn) => { unlisten = fn; });
    } catch {
      // not in Tauri
    }
    return () => unlisten?.();
  }, []);

  const closePip = () => void invoke("close_pip");

  const startDrag = (e: MouseEvent) => {
    if (e.button !== 0 || (e.target as Element).closest("button, input")) return;
    try {
      getCurrentWebviewWindow().startDragging();
    } catch {
      // not in Tauri
    }
  };

  const onWheel = (e: WheelEvent) => {
    void invoke("pip_resize", { delta: -Math.sign(e.deltaY) * 32 });
  };

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <div
      onMouseDown={startDrag}
      onWheel={onWheel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative size-full select-none overflow-hidden rounded-[14px] bg-black border border-separator shadow-2xl"
    >
      {video ? (
        <YouTubeMirror videoId={video} positionMs={positionMs} playing={playing} live={!np?.duration} className="size-full" />
      ) : np?.artwork ? (
        <img src={np.artwork} alt="" className="size-full object-cover opacity-60" />
      ) : (
        <div className="flex size-full items-center justify-center bg-fill-1 text-label-3">
          <span className="text-caption">{t("Kein Video aktiv")}</span>
        </div>
      )}

      {/* Hover Controls Overlay */}
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/60 p-2.5 transition-opacity duration-200 ${
          hovered ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Marquee text={np?.title || t("Crest Video")} textWidth={180} width={180} paused={!playing} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={closePip}
              title={t("Zurück zur Notch")}
              className="pressable flex size-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <ArrowDownLeft size={13} weight="bold" />
            </button>
            <button
              onClick={closePip}
              title={t("Schließen")}
              className="pressable flex size-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col gap-1.5">
          {/* Progress bar */}
          <div
            onClick={(e) => {
              if (!np?.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              media.seek(pct * np.duration);
            }}
            className="group/bar relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 overflow-hidden"
          >
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>

          {/* Transport buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => media.previous()}
              className="pressable text-white/80 hover:text-white"
              title={t("Zurück")}
            >
              <Rewind size={18} weight="fill" />
            </button>
            <button
              onClick={() => media.toggle()}
              className="pressable flex size-8 items-center justify-center rounded-full bg-white text-black hover:scale-105"
              title={playing ? t("Pause") : t("Wiedergabe")}
            >
              {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
            </button>
            <button
              onClick={() => media.next()}
              className="pressable text-white/80 hover:text-white"
              title={t("Weiter")}
            >
              <FastForward size={18} weight="fill" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
