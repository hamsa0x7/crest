import { createStore } from "../lib/store";
import { display } from "../platform/services";

/** Milliseconds timestamp until which Crest is snoozed, or null if active. */
export const snoozeUntil = createStore<number | null>(null, { persist: "crest-snooze-until" });

let snoozeTimer: number | undefined;

export async function snoozeCrest(minutes = 60) {
  const until = Date.now() + minutes * 60 * 1000;
  snoozeUntil.set(until);
  window.clearTimeout(snoozeTimer);
  snoozeTimer = window.setTimeout(() => {
    void unsnoozeCrest();
  }, minutes * 60 * 1000);

  // Force restore taskbar before hiding
  await display.taskbarRestore();
  await display.setHidden(true);
}

export async function unsnoozeCrest() {
  window.clearTimeout(snoozeTimer);
  snoozeUntil.set(null);
  await display.setHidden(false);
}

// On startup or reload, check if snooze expired
const initialUntil = snoozeUntil.get();
if (initialUntil) {
  const remaining = initialUntil - Date.now();
  if (remaining <= 0) {
    snoozeUntil.set(null);
  } else {
    snoozeTimer = window.setTimeout(() => {
      void unsnoozeCrest();
    }, remaining);
  }
}
