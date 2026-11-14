import { useEffect, useMemo, useRef } from "react";
import { createStore } from "../../lib/store";

/** Videos whose owner disabled embedding (or that failed): back to the artwork. */
export const unembeddable = createStore<string[]>([]);

/** A manually chosen or pasted video ID to play in Notch or PiP. */
export const customVideo = createStore<string | null>(null);
export const customVideoPlaying = createStore<boolean>(true);
export const customVideoProgress = createStore<{ time: number; duration: number }>({ time: 0, duration: 0 });

type PlayerCommand = { func: string; args: unknown[] };
let postCommandFn: ((func: string, args?: unknown[]) => void) | null = null;
const pendingCommands: PlayerCommand[] = [];

export function sendPlayerCommand(func: string, args: unknown[] = []) {
  if (postCommandFn) {
    postCommandFn(func, args);
  } else {
    pendingCommands.push({ func, args });
  }
}

export function playCustomVideo() {
  customVideoPlaying.set(true);
  sendPlayerCommand("playVideo");
}

export function pauseCustomVideo() {
  customVideoPlaying.set(false);
  sendPlayerCommand("pauseVideo");
}

export function toggleCustomVideo() {
  if (customVideoPlaying.get()) {
    pauseCustomVideo();
  } else {
    playCustomVideo();
  }
}

export function seekCustomVideo(seconds: number) {
  sendPlayerCommand("seekTo", [seconds, true]);
}

export function extractYouTubeId(text: string): string | null {
  const trimmed = text.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/** More drift than this (s) from the browser's position triggers a seek. */
const MAX_DRIFT = 1.5;
/** YouTube player errors meaning "can't play here". */
const FATAL_ERRORS = new Set([2, 5, 100, 101, 150, 153]);

/**
 * YouTube player mirroring the video the browser plays (muted),
 * or playing a custom chosen video (unmuted with controls).
 */
export function YouTubeMirror({
  videoId,
  positionMs,
  playing,
  live,
  className,
}: {
  videoId: string;
  positionMs: number;
  playing: boolean;
  live: boolean;
  className?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const time = useRef(-1);
  const state = useRef(-1);
  const isCustom = videoId === customVideo.get();
  const latest = useRef({ positionMs, playing, live, isCustom });
  latest.current = { positionMs, playing, live, isCustom };

  // The start position only matters when a new video loads.
  const src = useMemo(() => {
    const start = Math.max(0, Math.floor(latest.current.positionMs / 1000));
    const params = new URLSearchParams({
      enablejsapi: "1",
      mute: isCustom ? "0" : "1",
      autoplay: "1",
      controls: "0",
      disablekb: "1",
      fs: "0",
      playsinline: "1",
      rel: "0",
      iv_load_policy: "3",
      origin: window.location.origin,
    });
    if (!latest.current.live && start > 0) params.set("start", String(start));
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
  }, [videoId, isCustom]);

  useEffect(() => {
    time.current = -1;
    state.current = -1;
    const post = (message: object) =>
      frame.current?.contentWindow?.postMessage(JSON.stringify(message), "https://www.youtube-nocookie.com");
    const command = (func: string, args: unknown[] = []) => post({ event: "command", func, args, id: 1, channel: "widget" });

    postCommandFn = command;
    while (pendingCommands.length > 0) {
      const next = pendingCommands.shift();
      if (next) command(next.func, next.args);
    }

    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== "string") return;
      let data: { event?: string; info?: unknown };
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.event === "onReady") {
        if (latest.current.isCustom) {
          command("unMute");
          command("setVolume", [100]);
          command("playVideo");
        } else {
          command("mute");
        }
      }
      if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
        const info = data.info as { currentTime?: number; duration?: number; playerState?: number };
        if (typeof info.currentTime === "number") {
          time.current = info.currentTime;
          customVideoProgress.set((p) => ({ ...p, time: info.currentTime! }));
        }
        if (typeof info.duration === "number") {
          customVideoProgress.set((p) => ({ ...p, duration: info.duration! }));
        }
        if (typeof info.playerState === "number") {
          state.current = info.playerState;
          if (latest.current.isCustom) {
            customVideoPlaying.set(info.playerState === 1);
          }
        }
      }
      if (data.event === "onError" && FATAL_ERRORS.has(Number(data.info))) {
        unembeddable.set((list) => (list.includes(videoId) ? list : [...list, videoId]));
      }
    };
    window.addEventListener("message", onMessage);

    const tick = window.setInterval(() => {
      post({ event: "listening", id: 1, channel: "widget" });
      const { positionMs, playing, live, isCustom } = latest.current;

      if (isCustom) {
        const shouldPlay = customVideoPlaying.get();
        if (shouldPlay && state.current === 2) command("playVideo");
        if (!shouldPlay && state.current === 1) command("pauseVideo");
      } else {
        if (!live && time.current >= 0 && Math.abs(time.current - positionMs / 1000) > MAX_DRIFT) {
          command("seekTo", [positionMs / 1000, true]);
        }
        if (playing && state.current !== 1) command("playVideo");
        if (!playing && state.current === 1) command("pauseVideo");
      }
    }, 1000);

    return () => {
      postCommandFn = null;
      window.removeEventListener("message", onMessage);
      window.clearInterval(tick);
    };
  }, [videoId]);

  return (
    <iframe
      ref={frame}
      key={videoId}
      className={`rounded-[12px] bg-black aspect-video w-full ${className ?? ""}`}
      src={src}
      title="YouTube"
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
      tabIndex={-1}
    />
  );
}

/** The browser's YouTube video or manually selected video, unless it can't be embedded. */
export function useMirrorVideo(youtubeId: string | null | undefined) {
  const manual = customVideo.use();
  const id = youtubeId || manual;
  const blocked = unembeddable.use();
  return id && !blocked.includes(id) ? id : null;
}
