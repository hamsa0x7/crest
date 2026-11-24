import type { WindowKind } from "../lib/windowKind";

/** Where a `navigate` goes: the open panel of this window, the settings window, or the notch from another window. */
export type NavRoute = "panel" | "settings-window" | "notch";

/** In the app the settings live in their own window and every tool in the notch; the browser demo keeps it all in the panel. */
export function navRoute(tabId: string, kind: WindowKind, native: boolean): NavRoute {
  if (!native) return "panel";
  if (tabId === "settings") return "settings-window";
  if (kind !== "notch") return "notch";
  return "panel";
}
