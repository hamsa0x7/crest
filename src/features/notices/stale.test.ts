import { test } from "node:test";
import assert from "node:assert/strict";
import { isStaleNotice, MAX_STALE_AGE_MS } from "./stale.ts";

test("fresh notice under 15 minutes is not stale", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "New Message",
    body: "Hey, how are you?",
    at: now - 5 * 60 * 1000, // 5 min old
  };
  assert.equal(isStaleNotice(notice, now), false);
});

test("notice older than 15 minutes is stale", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "Old Notification",
    body: "Computer was asleep",
    at: now - (MAX_STALE_AGE_MS + 1000), // 15m 1s old
  };
  assert.equal(isStaleNotice(notice, now), true);
});

test("meeting in 5 min reminder is stale once 5+ minutes have elapsed", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "Team Sync in 5 min",
    body: "Join video call",
    at: now - 6 * 60 * 1000, // 6 min elapsed
  };
  assert.equal(isStaleNotice(notice, now), true);
});

test("meeting in 15 min reminder is NOT stale when only 3 minutes have elapsed", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "Product Review",
    body: "Meeting starts in 15 minutes",
    at: now - 3 * 60 * 1000, // only 3 min elapsed
  };
  assert.equal(isStaleNotice(notice, now), false);
});

test("German reminder in 10 Min is stale once 11 minutes have elapsed", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "Besprechung in 10 Min",
    body: "Raum 302",
    at: now - 11 * 60 * 1000, // 11 min elapsed
  };
  assert.equal(isStaleNotice(notice, now), true);
});

test("concluded event notice is immediately stale", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "Sprint Planning",
    body: "The meeting has ended",
    at: now - 60 * 1000,
  };
  assert.equal(isStaleNotice(notice, now), true);
});

test("notice without timestamp defaults to not stale", () => {
  const now = 1_000_000_000;
  const notice = {
    title: "System Update",
    body: "Update completed",
    at: 0,
  };
  assert.equal(isStaleNotice(notice, now), false);
});
