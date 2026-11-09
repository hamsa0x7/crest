import type { IncomingNotice } from "../../platform/services";

/** Maximum age in milliseconds (15 minutes) before an unread incoming notification is considered stale. */
export const MAX_STALE_AGE_MS = 15 * 60 * 1000;

/** Relative time reminder patterns matching e.g. "Meeting in 5 min", "Call in 10 minutes", "Termin in 15 Min", etc. */
const RELATIVE_REMINDER_REGEX =
  /(?:meeting|besprechung|call|anruf|event|termin|reminder|erinnerung|sync|standup|starts?|beginnt|in)\s+(\d{1,3})\s*(?:m|min|mins|minute|minuten)\b/i;

/** Phrases explicitly denoting a concluded, ended, or finished meeting/event. */
const CONCLUDED_REGEX = /\b(?:has ended|ended|concluded|vorbei|abgeschlossen|beendet)\b/i;

/**
 * Checks whether an incoming notice is stale and should be suppressed from popping on screen.
 * Stale reasons:
 * 1. Absolute age is greater than 15 minutes (e.g. computer woke up from sleep or queue backlog).
 * 2. Event is past its relevancy window (e.g. "Meeting in 5 min" received 6+ minutes after timestamp).
 * 3. Event text indicates the event concluded/ended.
 */
export function isStaleNotice(
  notice: Pick<IncomingNotice, "at" | "title" | "body">,
  now: number = Date.now(),
): boolean {
  if (!notice.at || notice.at <= 0) return false;

  const ageMs = now - notice.at;
  // If arrived in the future or slight clock skew, not stale
  if (ageMs < 0) return false;

  // Stale if older than 15 minutes
  if (ageMs > MAX_STALE_AGE_MS) return true;

  const text = `${notice.title || ""} ${notice.body || ""}`;

  // If text indicates event concluded/ended
  if (CONCLUDED_REGEX.test(text)) return true;

  // Check for relative reminder e.g. "in 5 min"
  const match = text.match(RELATIVE_REMINDER_REGEX);
  if (match) {
    const minutes = parseInt(match[1], 10);
    if (!Number.isNaN(minutes) && minutes > 0) {
      const scheduledWindowMs = minutes * 60 * 1000;
      // If the notice was created and elapsed time is >= scheduled duration, it has passed
      if (ageMs >= scheduledWindowMs) {
        return true;
      }
    }
  }

  return false;
}
