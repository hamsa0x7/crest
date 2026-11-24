import { createStore } from "../lib/store";
import { display } from "../platform/services";

/** Milliseconds timestamp until which Cupcake is snoozed, or null if active. */
export const snoozeUntil = createStore<number | null>(null, { persist: "cupcake-snooze-until" });

let snoozeTimer: number | undefined;

export async function snoozeCupcake(minutes = 60) {
  const until = Date.now() + minutes * 60 * 1000;
  snoozeUntil.set(until);
  window.clearTimeout(snoozeTimer);
  snoozeTimer = window.setTimeout(() => {
    void unsnoozeCupcake();
  }, minutes * 60 * 1000);

  // Force restore taskbar before hiding
  await display.taskbarRestore();
  await display.setHidden(true);
}

export const snoozeCrest = snoozeCupcake;

export async function unsnoozeCupcake() {
  window.clearTimeout(snoozeTimer);
  snoozeUntil.set(null);
  await display.setHidden(false);
}

export const unsnoozeCrest = unsnoozeCupcake;

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
