import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { FastForward, MagnifyingGlassMinus, MagnifyingGlassPlus, MicrophoneStage, Pause, Play, Rewind, X } from "@phosphor-icons/react";
import { media, useNowPlaying } from "../../platform/media";
import { settings } from "../../settings/store";
import { linesOf, useLyricIndex, useLyrics, useOfflineTranslation, useRomanized } from "../now-playing/lyrics";
import { t } from "../../i18n";

const HOLD_SCROLL_MS = 3000;

export function LyricsCardApp() {
  const np = useNowPlaying();
  const music = settings.use().music;
  const state = useLyrics(np, true);
  const lines = useRomanized(useOfflineTranslation(np, linesOf(state), music.lyricTranslation && music.offlineTranslation === true), music.lyricRoman);
  const index = useLyricIndex(lines, np);
  const list = useRef<HTMLDivElement>(null);
  const userScrolledAt = useRef(0);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    const el = list.current;
    if (!el || performance.now() - userScrolledAt.current < HOLD_SCROLL_MS) return;
    const row = el.querySelectorAll("button")[Math.max(0, index)] as HTMLElement | undefined;
    if (row) {
      el.scrollTo({ top: row.offsetTop - (el.clientHeight - row.offsetHeight) / 2, behavior: "smooth" });
    }
  }, [index, lines]);

  const closeWindow = () => void invoke("lyrics_window_close");

  const startDrag = (e: MouseEvent) => {
    if (e.button !== 0 || (e.target as Element).closest("button")) return;
    try {
      getCurrentWebviewWindow().startDragging();
    } catch {
      // not in Tauri
    }
  };

  const playing = !!np?.isPlaying;

  const message =
    !np ? t("Keine Wiedergabe aktiv")
    : state?.kind === "loading" ? t("Songtext wird gesucht …")
    : state?.kind === "instrumental" ? t("Instrumental")
    : state?.kind === "offline" ? t("Die Songtext-Quellen sind gerade nicht erreichbar")
    : state?.kind === "skipped" ? t("Songtexte nur für Songs bis 20 Minuten mit bekannter Länge")
    : state?.kind === "nosource" ? t("Keine Songtext-Quelle ist an")
    : !lines ? t("Kein synchronisierter Songtext für diesen Song")
    : null;

  return (
    <div
      onMouseDown={startDrag}
      className="relative flex h-screen w-screen flex-col select-none overflow-hidden rounded-[18px] bg-elevated/95 backdrop-blur-2xl border border-separator shadow-2xl p-4 text-label"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-separator shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {np?.artwork ? (
            <img src={np.artwork} alt="" className="size-9 rounded-[8px] object-cover shrink-0" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-fill-2 text-label-2 shrink-0">
              <MicrophoneStage size={18} weight="fill" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-body font-semibold">{np?.title || t("Crest Lyrics")}</div>
            <div className="truncate text-footnote text-label-2">{np?.artist || ""}</div>
          </div>
        </div>

        {/* Font scale and close controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setFontSize((s) => Math.max(12, s - 2))}
            title={t("Schrift verkleinern")}
            className="pressable flex size-7 items-center justify-center rounded-full bg-fill-2 text-label-2 hover:text-label"
          >
            <MagnifyingGlassMinus size={14} weight="bold" />
          </button>
          <button
            onClick={() => setFontSize((s) => Math.min(26, s + 2))}
            title={t("Schrift vergrößern")}
            className="pressable flex size-7 items-center justify-center rounded-full bg-fill-2 text-label-2 hover:text-label"
          >
            <MagnifyingGlassPlus size={14} weight="bold" />
          </button>
          <button
            onClick={closeWindow}
            title={t("Schließen")}
            className="pressable flex size-7 items-center justify-center rounded-full bg-fill-2 text-label-2 hover:text-label ml-1"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Lyrics Body */}
      <div className="relative min-h-0 flex-1 overflow-hidden my-2">
        {message ? (
          <div className="flex size-full items-center justify-center gap-2 text-footnote text-label-3 p-4 text-center">
            <MicrophoneStage size={16} weight="bold" />
            {message}
          </div>
        ) : (
          <div
            ref={list}
            className="size-full overflow-y-auto [scrollbar-width:none] px-2"
            style={{ maskImage: "linear-gradient(180deg, transparent, #000 10%, #000 90%, transparent)" }}
            onWheel={() => (userScrolledAt.current = performance.now())}
          >
            <div aria-hidden className="h-[35%]" />
            {lines!.map((line, i) => {
              const isCurrent = i === index;
              return (
                <button
                  key={i}
                  disabled={!np?.canSeek}
                  onClick={() => media.seek(line.time)}
                  style={{ fontSize: `${fontSize}px` }}
                  className={`block w-full px-2 py-2 text-center font-semibold leading-relaxed transition-all duration-200 enabled:cursor-pointer ${
                    isCurrent
                      ? "text-accent font-bold scale-[1.03]"
                      : Math.abs(i - index) === 1
                      ? "text-label-2 opacity-80"
                      : "text-label-4 opacity-50 enabled:hover:opacity-80"
                  }`}
                >
                  <div>{line.text || "•••"}</div>
                  {music.lyricRoman && line.roman && (
                    <div className="text-[0.75em] font-normal opacity-80 mt-0.5">{line.roman}</div>
                  )}
                  {music.lyricTranslation && line.translation && (
                    <div className="text-[0.75em] font-normal opacity-70 mt-0.5">{line.translation}</div>
                  )}
                </button>
              );
            })}
            <div aria-hidden className="h-[35%]" />
          </div>
        )}
      </div>

      {/* Mini Transport Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-separator shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => media.previous()}
            className="pressable text-label-2 hover:text-label"
            title={t("Zurück")}
          >
            <Rewind size={18} weight="fill" />
          </button>
          <button
            onClick={() => media.toggle()}
            className="pressable flex size-8 items-center justify-center rounded-full bg-accent text-white hover:opacity-90"
            title={playing ? t("Pause") : t("Wiedergabe")}
          >
            {playing ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" className="ml-0.5" />}
          </button>
          <button
            onClick={() => media.next()}
            className="pressable text-label-2 hover:text-label"
            title={t("Weiter")}
          >
            <FastForward size={18} weight="fill" />
          </button>
        </div>

        <div className="text-caption text-label-3 font-mono">
          {formatTime(np?.position ?? 0)} / {formatTime(np?.duration ?? 0)}
        </div>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
