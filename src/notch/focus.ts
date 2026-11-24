import { createStore } from "../lib/store";
import { onFocusExit } from "../platform/native";
import { settings } from "../settings/store";

/*
 * Focus mode: the notch stays visible but fully click-through, so clicks reach the app below (e.g. browser tabs at the very top).
 * Look per setting: half transparent, or shrunk to a thin line at the edge (display.focusStyle). In and out: three quick clicks on
 * the notch, only while their switch is on (display.focusClicks, focusRules.ts). Natively Rust counts the clicks that leave it,
 * because the window no longer gets any (except under a card with buttons, Notch.tsx). Turning the switch off, opening the notch on
 * purpose (Notch.tsx) and a restart leave it too: it is not saved, so a notch put aside by accident is never stuck.
 */
export const focusMode = createStore(false);

export function setFocusMode(on: boolean) {
  focusMode.set(on);
}

let started = false;

export function startFocusMode() {
  if (started) return;
  started = true;
  // Notch.tsx sets the click-through; the clicks that leave focus mode come from Rust.
  onFocusExit(() => setFocusMode(false));
  // Switched off: no three clicks would bring the notch back any more.
  settings.subscribe(() => {
    if (focusMode.get() && !settings.get().display.focusClicks) setFocusMode(false);
  });
}
