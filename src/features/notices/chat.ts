/** Known messaging app keywords / package names. */
const MESSAGING_PATTERNS = [
  "whatsapp",
  "telegram",
  "discord",
  "teams",
  "msteams",
  "slack",
  "skype",
  "signal",
  "messenger",
  "element",
  "wechat",
  "viber",
  "mattermost",
];

/**
 * Returns true if the notice originates from a recognized messaging or chat application.
 */
export function isMessagingApp(appName?: string | null, appId?: string | null): boolean {
  const target = `${appName || ""} ${appId || ""}`.toLowerCase();
  return MESSAGING_PATTERNS.some((p) => target.includes(p));
}

/**
 * Dispatches an inline reply to the corresponding messaging application.
 * 1. Copies the reply text to clipboard via copyFn so it is immediately ready to paste or send.
 * 2. Attempts deep-link URI protocol where supported (e.g. WhatsApp, Telegram).
 */
export async function sendInlineReply(
  appName: string,
  appId: string,
  replyText: string,
  copyFn?: (text: string) => Promise<void>,
): Promise<boolean> {
  const text = replyText.trim();
  if (!text) return false;

  if (copyFn) {
    try {
      await copyFn(text);
    } catch (e) {
      console.warn("Failed to copy reply text to clipboard:", e);
    }
  }

  // Attempt URI protocol deep-links where supported
  const target = `${appName} ${appId}`.toLowerCase();
  let deepLink: string | null = null;

  if (target.includes("whatsapp")) {
    deepLink = `whatsapp://send?text=${encodeURIComponent(text)}`;
  } else if (target.includes("telegram")) {
    deepLink = `tg://msg?text=${encodeURIComponent(text)}`;
  }

  if (deepLink && typeof window !== "undefined") {
    try {
      window.open(deepLink, "_self");
    } catch {
      // Ignored if protocol handler is not registered
    }
  }

  return true;
}
