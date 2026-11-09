import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  DownloadSimple,
  FileAudio,
  FileVideo,
  FolderOpen,
  PictureInPicture,
  Play,
  Trash,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { HeaderActions, HeaderButton } from "../../notch/header";
import { Button } from "../../ui/controls";
import { createStore } from "../../lib/store";
import { t } from "../../i18n";
import { customVideo, extractYouTubeId } from "../now-playing/YouTubeMirror";
import { addToShelf } from "../shelf/ShelfView";

export interface DownloadItem {
  id: string;
  url: string;
  format: "video" | "audio";
  progress: number;
  status: "downloading" | "done" | "error";
  path?: string;
  error?: string;
  timestamp: number;
}

export const downloadHistory = createStore<DownloadItem[]>([], { persist: "downloader_history" });

const PLATFORMS = [
  "YouTube",
  "X (Twitter)",
  "Instagram",
  "TikTok",
  "Reddit",
  "Vimeo",
  "Twitch",
];

export function DownloaderView() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"video" | "audio">("video");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = downloadHistory.use();

  const isYt = !!extractYouTubeId(url);

  // Listen to live yt-dlp download progress and updates
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<{ id: string; url: string; progress: number; status: string; path?: string; error?: string }>(
      "downloads://ytdlp",
      (event) => {
        const { id, url: itemUrl, progress, status, path, error: itemError } = event.payload;
        downloadHistory.set((prev) => {
          const idx = prev.findIndex((x) => x.id === id || (x.url === itemUrl && x.status === "downloading"));
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              progress,
              status: status as "downloading" | "done" | "error",
              path: path ?? next[idx].path,
              error: itemError ?? next[idx].error,
            };
            return next;
          }
          return prev;
        });
      }
    ).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const startDownload = async (chosenFormat: "video" | "audio") => {
    const trimmed = url.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);

    const tempId = `dl-${Date.now()}`;
    const newItem: DownloadItem = {
      id: tempId,
      url: trimmed,
      format: chosenFormat,
      progress: 0,
      status: "downloading",
      timestamp: Date.now(),
    };

    downloadHistory.set((prev) => [newItem, ...prev]);

    try {
      const taskId = await invoke<string>("ytdlp_download", {
        url: trimmed,
        audioOnly: chosenFormat === "audio",
      });
      downloadHistory.set((prev) =>
        prev.map((x) => (x.id === tempId ? { ...x, id: taskId } : x))
      );
      setUrl("");
    } catch (e) {
      const msg = String(e);
      setError(msg);
      downloadHistory.set((prev) =>
        prev.map((x) => (x.id === tempId ? { ...x, status: "error", error: msg } : x))
      );
    } finally {
      setBusy(false);
    }
  };

  const openInPip = () => {
    const id = extractYouTubeId(url);
    if (id) {
      customVideo.set(id);
      void invoke("open_pip", {});
    }
  };

  const openFile = (path?: string) => {
    if (path) void invoke("open_path", { path });
  };

  const removeItem = (id: string) => {
    downloadHistory.set((prev) => prev.filter((x) => x.id !== id));
  };

  const clearHistory = () => {
    downloadHistory.set((prev) => prev.filter((x) => x.status === "downloading"));
  };

  return (
    <div className="flex h-full flex-col px-5 pt-1 pb-3 text-label">
      <HeaderActions>
        {items.some((x) => x.status !== "downloading") && (
          <HeaderButton label={t("Verlauf leeren")} onClick={clearHistory}>
            <Trash size={14} weight="bold" />
          </HeaderButton>
        )}
      </HeaderActions>

      {/* Input section */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2 rounded-[14px] bg-fill-2 p-1.5 border border-separator">
          <div className="flex size-7 items-center justify-center text-red shrink-0">
            <YoutubeLogo size={20} weight="fill" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void startDownload(format);
            }}
            placeholder={t("Video-URL eingeben (YouTube, X, Instagram …)")}
            className="min-w-0 flex-1 bg-transparent px-1 text-footnote text-label placeholder:text-label-4 focus:outline-none"
          />
          {url && (
            <button
              onClick={() => setUrl("")}
              className="pressable flex size-6 items-center justify-center rounded-full text-label-3 hover:text-label-2"
              title={t("Leeren")}
            >
              <X size={12} weight="bold" />
            </button>
          )}
          {isYt && (
            <Button
              icon={PictureInPicture}
              onClick={openInPip}
            >
              {t("PiP")}
            </Button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFormat("video")}
              className={`pressable flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-caption font-medium transition-colors ${
                format === "video"
                  ? "bg-fill-3 text-label shadow-sm"
                  : "bg-fill-1 text-label-3 hover:text-label-2"
              }`}
            >
              <FileVideo size={13} weight="bold" />
              <span>{t("Video (MP4)")}</span>
            </button>
            <button
              onClick={() => setFormat("audio")}
              className={`pressable flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-caption font-medium transition-colors ${
                format === "audio"
                  ? "bg-fill-3 text-label shadow-sm"
                  : "bg-fill-1 text-label-3 hover:text-label-2"
              }`}
            >
              <FileAudio size={13} weight="bold" />
              <span>{t("Audio (MP3)")}</span>
            </button>
          </div>

          <Button
            primary
            icon={DownloadSimple}
            disabled={!url.trim() || busy}
            onClick={() => void startDownload(format)}
          >
            {busy ? t("Lädt …") : t("Herunterladen")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-caption text-red shrink-0">{error}</div>
      )}

      {/* Downloads history / list */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center text-label-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-fill-2 text-label-3">
              <DownloadSimple size={20} weight="bold" />
            </div>
            <div className="text-footnote font-medium text-label-2">
              {t("Keine aktiven Downloads")}
            </div>
            <div className="max-w-[340px] text-caption text-label-3">
              {t("Unterstützt:")}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-[360px]">
              {PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-fill-2 px-2 py-0.5 text-caption font-medium text-label-3"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none]">
            {items.map((item) => {
              const name = item.path ? item.path.split(/[\\/]/).pop() : item.url;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-[12px] bg-fill-2 p-2 text-start transition-colors"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-fill-1 text-label-2">
                    {item.format === "audio" ? (
                      <FileAudio size={16} weight="bold" />
                    ) : (
                      <FileVideo size={16} weight="bold" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="truncate text-footnote font-medium text-label">
                      {name}
                    </div>

                    {item.status === "downloading" ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill-3">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${Math.max(5, item.progress)}%` }}
                          />
                        </div>
                        <span className="tabular text-caption text-label-3 shrink-0">
                          {Math.round(item.progress)} %
                        </span>
                      </div>
                    ) : item.status === "done" ? (
                      <div className="flex items-center gap-2 text-caption text-green">
                        <span>{t("Fertiggestellt")}</span>
                      </div>
                    ) : (
                      <div className="truncate text-caption text-red">
                        {item.error || t("Fehler beim Herunterladen")}
                      </div>
                    )}
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "done" && item.path && (
                      <>
                        <button
                          onClick={() => openFile(item.path)}
                          title={t("Datei öffnen")}
                          className="pressable flex size-7 items-center justify-center rounded-[8px] text-label-3 hover:bg-fill-3 hover:text-label"
                        >
                          <Play size={14} weight="fill" />
                        </button>
                        <button
                          onClick={() => {
                            if (item.path) addToShelf([item.path]);
                          }}
                          title={t("Zur Ablage hinzufügen")}
                          className="pressable flex size-7 items-center justify-center rounded-[8px] text-label-3 hover:bg-fill-3 hover:text-label"
                        >
                          <FolderOpen size={14} weight="bold" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      title={t("Entfernen")}
                      className="pressable flex size-7 items-center justify-center rounded-[8px] text-label-3 hover:bg-fill-3 hover:text-red"
                    >
                      <X size={13} weight="bold" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
