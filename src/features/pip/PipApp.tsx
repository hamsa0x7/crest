import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { ArrowDownLeft, FastForward, Pause, Play, PictureInPicture, Rewind, X } from "../../ui/iconset";
import { media, useNowPlaying } from "../../platform/media";
import {
  YouTubeMirror,
  useMirrorVideo,
  customVideo,
  customVideoPlaying,
  customVideoProgress,
  toggleCustomVideo,
  seekCustomVideo,
  extractYouTubeId,
} from "../now-playing/YouTubeMirror";
import { Marquee } from "../../notch/row/Marquee";
import { t } from "../../i18n";

const SNAP_AFTER_MS = 220;

export function PipApp() {
  const np = useNowPlaying();
  const customId = customVideo.use();
  const video = useMirrorVideo(np?.videoId);
  const isCustom = Boolean(customId && (!np?.appId || customId === np?.videoId));
  const customPlaying = customVideoPlaying.use();
  const customProgress = customVideoProgress.use();

  const playing = isCustom ? customPlaying : !!np?.isPlaying;
  const positionMs = isCustom ? customProgress.time * 1000 : (np?.position ?? 0) * 1000;
  const durationMs = isCustom ? customProgress.duration * 1000 : (np?.duration ?? 0) * 1000;
  const [hovered, setHovered] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  // Snap to edges on drag end
  const snapTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    try {
      const win = getCurrentWindow();
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
    if (e.button !== 0 || (e.target as Element).closest("button, input, form, a, [data-no-drag], .cursor-pointer")) return;
    try {
      void getCurrentWindow().startDragging();
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
        <YouTubeMirror videoId={video} positionMs={positionMs} playing={playing} live={!durationMs} className="size-full" />
      ) : np?.artwork ? (
        <img
          src={np.artwork}
          alt=""
          draggable={false}
          className="size-full object-cover opacity-60 pointer-events-none select-none"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-fill-1 p-3 text-label-3">
          <PictureInPicture size={22} weight="bold" className="text-label-3" />
          <span className="text-caption font-medium">{t("Kein Video aktiv")}</span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = extractYouTubeId(manualUrl);
              if (id) {
                customVideo.set(id);
                setManualUrl("");
              }
            }}
            className="flex w-full max-w-[280px] items-center gap-1.5 rounded-[10px] bg-fill-2 px-2 py-1 border border-separator pointer-events-auto"
          >
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder={t("YouTube URL einfügen …")}
              className="min-w-0 flex-1 bg-transparent text-caption text-label placeholder:text-label-4 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualUrl.trim()}
              className="pressable rounded-[6px] bg-accent px-2 py-0.5 text-caption font-medium text-white disabled:opacity-40"
            >
              {t("Laden")}
            </button>
          </form>
        </div>
      )}

      {/* Hover Controls Overlay */}
      <div
        onMouseDown={startDrag}
        className={`pointer-events-none absolute inset-0 z-30 flex flex-col justify-between bg-black/60 p-2.5 transition-opacity duration-200 ${
          hovered ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Marquee
              text={
                np ? (np.artist ? `${np.artist} – ${np.title}` : np.title)
                : isCustom ? t("YouTube Video")
                : t("Cupcake Video")
              }
              textWidth={180}
              width={180}
              paused={!playing}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                closePip();
              }}
              title={t("Zurück zur Notch")}
              className="pressable flex size-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <ArrowDownLeft size={13} weight="bold" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closePip();
              }}
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
              e.stopPropagation();
              const totalSec = isCustom ? customProgress.duration : np?.duration;
              if (!totalSec) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              if (isCustom) {
                seekCustomVideo(pct * totalSec);
              } else {
                media.seek(pct * totalSec);
              }
            }}
            className="group/bar relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 overflow-hidden"
          >
            <div className="h-full bg-accent rounded-full transition-all pointer-events-none" style={{ width: `${progress * 100}%` }} />
          </div>

          {/* Transport buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCustom) {
                  seekCustomVideo(Math.max(0, customProgress.time - 10));
                } else {
                  media.previous();
                }
              }}
              className="pressable text-white/80 hover:text-white"
              title={t("Zurück")}
            >
              <Rewind size={18} weight="fill" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCustom) {
                  toggleCustomVideo();
                } else {
                  media.toggle();
                }
              }}
              className="pressable flex size-8 items-center justify-center rounded-full bg-white text-black hover:scale-105"
              title={playing ? t("Pause") : t("Wiedergabe")}
            >
              {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCustom) {
                  seekCustomVideo(customProgress.time + 10);
                } else {
                  media.next();
                }
              }}
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
