import type { UsageWindow } from "../../../platform/services";

const fullest = (ws: UsageWindow[]) => ws.reduce((a, b) => (b.usedPercent > a.usedPercent ? b : a));

/**
 * Which windows a provider's ring shows: outside the fullest of the longer limits (weekly, monthly, per model), inside the
 * session, so neither hides the other and the ring never swaps windows as one overtakes the other. A provider with only
 * one kind gets a single ring with its fullest window.
 */
export function ringWindows(windows: UsageWindow[]): { outer: UsageWindow; inner: UsageWindow | null } | null {
  if (windows.length === 0) return null;
  const session = windows.filter((w) => w.kind.startsWith("session"));
  const longer = windows.filter((w) => !w.kind.startsWith("session"));
  if (session.length === 0 || longer.length === 0) return { outer: fullest(windows), inner: null };
  return { outer: fullest(longer), inner: fullest(session) };
}
