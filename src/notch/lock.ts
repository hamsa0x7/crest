import { createStore } from "../lib/store";

/** Whether the notch is locked to prevent accidental hover/click triggers. */
export const notchLocked = createStore(false, { persist: "notch-locked" });

/** Feedback pulse kind when lock state changes or locked notch is clicked. */
export type LockFeedback = "locked" | "unlocked" | null;
export const lockFeedback = createStore<LockFeedback>(null);

let feedbackTimer: number | undefined;

export function pulseLockFeedback(kind: "locked" | "unlocked") {
  window.clearTimeout(feedbackTimer);
  lockFeedback.set(null);
  requestAnimationFrame(() => {
    lockFeedback.set(kind);
    feedbackTimer = window.setTimeout(() => lockFeedback.set(null), 700);
  });
}

export function toggleLock() {
  const next = !notchLocked.get();
  notchLocked.set(next);
  pulseLockFeedback(next ? "locked" : "unlocked");
  return next;
}
