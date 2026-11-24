import { YoutubeLogo } from "../../ui/iconset";
import { DownloaderView } from "../../features/downloader/DownloaderView";
import { registerExtension, type NativeExtension } from "../registry";

export const DownloaderExtension: NativeExtension = {
  id: "downloader",
  name: "Downloader",
  description: "High-speed video & audio downloader with yt-dlp, in-notch playback, and floating Picture-in-Picture.",
  kind: "tool",
  overrides: "youtube",
  icon: YoutubeLogo,
  hue: "red",
  size: { w: 560, h: 320 },
  View: DownloaderView,
  enabledByDefault: true,
};

registerExtension(DownloaderExtension);
