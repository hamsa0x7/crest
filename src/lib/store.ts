// First of everything that reads localStorage: the demo swaps it for memory before any store loads.
import "../dev/demoStorage";
// Then a restore from a backup, if one waits, so every store loads the restored data.
import "./restorePending";
import { makeStore, setAside as setAsideIn, type Store } from "./storeCore";

export type { Store };

/** Keeps a saved value that cannot be used under `<key>.bad`, so a reset does not erase the only copy. */
export function setAside(key: string, raw: string | null) {
  try {
    setAsideIn(localStorage, key, raw);
  } catch {
    // No storage at all: nothing more to do.
  }
}

/**
 * Minimal global store. With `persist` the state is mirrored to localStorage (in Tauri the WebView profile persists), and a write
 * another Crest window makes to the same key reaches this one too (storeCore.ts).
 */
export function createStore<T>(initial: T, options: { persist?: string } = {}): Store<T> {
  const key = options.persist && `notch:${options.persist}`;
  if (!key) return makeStore(initial, null);
  let storage: Storage | null = null;
  try {
    storage = localStorage;
  } catch {
    // No storage at all: the state lives in memory only.
  }
  return makeStore(initial, storage && { key, storage, target: typeof window === "undefined" ? undefined : window });
}
