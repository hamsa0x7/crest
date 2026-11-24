import { useSyncExternalStore } from "react";

/*
 * The store itself, with its storage and its window passed in: store.ts gives it localStorage and the page's window, and tests a
 * storage and a window of their own (store.ts's imports cannot load outside the app).
 */

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  use(): T;
}

/** Keeps a saved value that cannot be used under `<key>.bad`, so a reset does not erase the only copy. */
export function setAside(storage: Pick<Storage, "setItem">, key: string, raw: string | null) {
  try {
    if (raw) storage.setItem(`${key}.bad`, raw);
  } catch {
    // Quota full or no storage: nothing more to do.
  }
}

/** Where a persisted store keeps its value, and the window whose `storage` events tell it of another window's write. */
export interface Persist {
  key: string;
  storage: Pick<Storage, "getItem" | "setItem">;
  target?: Pick<Window, "addEventListener" | "removeEventListener">;
}

/**
 * Minimal global store. With `persist` the state is mirrored to `storage` under `key`, and a write from another window of the app to
 * the same key is adopted, so every Crest window shows one value.
 */
export function makeStore<T>(initial: T, persist: Persist | null): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  if (persist) {
    const { key, storage, target } = persist;
    let raw: string | null = null;
    try {
      raw = storage.getItem(key);
      if (raw) state = JSON.parse(raw) as T;
    } catch {
      // Broken entry → continue with the default.
      setAside(storage, key, raw);
    }
    // The value is read when the event comes, so a burst of writes lands on the latest. It is never written back: the writing
    // window already saved it, and writing it again here would bounce it between the windows.
    target?.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      try {
        const now = storage.getItem(key);
        if (now === null) return;
        state = JSON.parse(now) as T;
        notify();
      } catch {
        // A broken value from the other window: keep the current state.
      }
    });
  }
  const store: Store<T> = {
    get: () => state,
    set(next) {
      state = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      if (persist) {
        try {
          persist.storage.setItem(persist.key, JSON.stringify(state));
        } catch {
          // Quota full: the state lives on in memory, so typing and the app keep working; it is just not saved.
        }
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    use: () => useSyncExternalStore(store.subscribe, store.get),
  };
  return store;
}
