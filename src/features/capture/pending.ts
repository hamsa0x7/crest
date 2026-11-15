import { createStore } from "../../lib/store";
import { capture } from "../../platform/services";
import { addPending, findExpired, removePending, type PendingShot } from "./pendingPure";
import { triggerSuccessDroplet } from "../../notch/ferrofluid";

export * from "./pendingPure";

export const pendingShots = createStore<PendingShot[]>([], { persist: "pending_screenshots" });

/** Adds a screenshot to the 24-hour staging shelf if not explicitly kept. */
export function addPendingShot(shot: {
  path: string;
  name?: string;
  thumb: string | null;
  width: number;
  height: number;
}): PendingShot {
  const { list, item } = addPending(pendingShots.get(), shot);
  pendingShots.set(list);
  return item;
}

/** 1-click Keep: keeps file permanently, runs onKeep hook (e.g. shelf), and removes from staging. */
export function keepPendingShot(path: string, onKeep?: (path: string) => void) {
  pendingShots.set((cur) => removePending(cur, path));
  triggerSuccessDroplet();
  onKeep?.(path);
}

/** 1-click Delete: immediately removes file from disk and removes from staging shelf. */
export async function deletePendingShot(path: string): Promise<void> {
  pendingShots.set((cur) => removePending(cur, path));
  try {
    await capture.remove(path);
  } catch {
    // ignore if already deleted
  }
}

/** Removes all pending files from disk that have exceeded their 24-hour lifetime. */
export async function cleanupExpiredPending(now = Date.now()): Promise<number> {
  const all = pendingShots.get();
  const expired = findExpired(all, now);
  if (expired.length === 0) return 0;

  for (const item of expired) {
    try {
      await capture.remove(item.path);
    } catch {
      // file may already be removed
    }
  }

  pendingShots.set((cur) => cur.filter((s) => !expired.some((e) => e.path === s.path)));
  return expired.length;
}
