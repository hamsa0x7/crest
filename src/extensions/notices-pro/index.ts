import { ChatCircleDots } from "../../ui/iconset";
import { registerExtension, type NativeExtension } from "../registry";

export const NoticesProExtension: NativeExtension = {
  id: "notices-pro",
  name: "Notices Pro",
  description: "Gesture flick-to-dismiss physics, inline quick chat replies, stale suppression, and rich context menus.",
  kind: "service",
  icon: ChatCircleDots,
  hue: "amber",
  enabledByDefault: true,
};

registerExtension(NoticesProExtension);
