export interface PendingShot {
  id: string;
  path: string;
  name: string;
  thumb: string | null;
  width: number;
  height: number;
  createdAt: number;
  expiresAt: number;
  kept?: boolean;
}

export const STAGING_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

export function addPending(
  list: PendingShot[],
  shot: { path: string; name?: string; thumb: string | null; width: number; height: number },
  now = Date.now()
): { list: PendingShot[]; item: PendingShot } {
  const existing = list.find((s) => s.path === shot.path);
  if (existing) return { list, item: existing };

  const fileName = shot.name ?? shot.path.split(/[\\/]/).pop() ?? "Screenshot.png";
  const item: PendingShot = {
    id: shot.path,
    path: shot.path,
    name: fileName,
    thumb: shot.thumb,
    width: shot.width,
    height: shot.height,
    createdAt: now,
    expiresAt: now + STAGING_LIFETIME_MS,
  };

  return { list: [item, ...list], item };
}

export function removePending(list: PendingShot[], path: string): PendingShot[] {
  return list.filter((s) => s.path !== path);
}

export function findExpired(list: PendingShot[], now = Date.now()): PendingShot[] {
  return list.filter((s) => now >= s.expiresAt && !s.kept);
}

export function remainingTime(expiresAt: number, now = Date.now()): { hours: number; minutes: number } {
  const diffMs = Math.max(0, expiresAt - now);
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.max(1, Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000)));
  return { hours, minutes };
}
