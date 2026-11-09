import { test } from "node:test";
import assert from "node:assert/strict";
import { isMessagingApp } from "./chat.ts";

test("identifies messaging apps correctly", () => {
  assert.equal(isMessagingApp("WhatsApp", "5319275A.WhatsAppDesktop"), true);
  assert.equal(isMessagingApp("Telegram Desktop", "Telegram.TelegramDesktop"), true);
  assert.equal(isMessagingApp("Discord", "Discord"), true);
  assert.equal(isMessagingApp("Microsoft Teams", "msteams"), true);
  assert.equal(isMessagingApp("Slack", "SlackTechnologies.Slack"), true);
  assert.equal(isMessagingApp("Skype", "Microsoft.SkypeApp"), true);
  assert.equal(isMessagingApp("Signal", "org.whispersystems.signaldesktop"), true);
});

test("ignores non-messaging apps", () => {
  assert.equal(isMessagingApp("Google Chrome", "chrome"), false);
  assert.equal(isMessagingApp("Spotify", "Spotify.exe"), false);
  assert.equal(isMessagingApp("Visual Studio Code", "Code.exe"), false);
  assert.equal(isMessagingApp("Windows Calculator", "Microsoft.WindowsCalculator"), false);
  assert.equal(isMessagingApp("Weather", "Microsoft.BingWeather"), false);
});
