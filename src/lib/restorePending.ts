import { isNotchWindow } from "./windowKind";
import { applyPendingRestore, type RestoreResult } from "./backup";

/*
 * A restore chosen in the settings (General, Backup) is applied here, at start, before any store reads the storage:
 * src/lib/store.ts imports this right after the demo's storage swap, ahead of every store.
 */

/** What this start did with a pending restore, for the settings to say. */
/** The notch alone applies a pending restore, at its start; another window opened later must not apply it under the running notch. */
export const restoreResult: RestoreResult = !isNotchWindow ? null : (() => {
  try {
    return applyPendingRestore(localStorage);
  } catch {
    // No storage at all: nothing was pending, nothing changed.
    return null;
  }
})();
