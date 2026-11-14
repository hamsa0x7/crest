import test from "node:test";
import assert from "node:assert/strict";
import { addPending, findExpired, removePending, remainingTime, STAGING_LIFETIME_MS, type PendingShot } from "./pendingPure.ts";

test("addPending adds a screenshot with 24-hour expiration", () => {
  const initial: PendingShot[] = [];
  const now = 1_000_000;
  const { list, item } = addPending(
    initial,
    {
      path: "C:\\Users\\Test\\Screenshots\\shot1.png",
      thumb: "data:image/png;base64,...",
      width: 1920,
      height: 1080,
    },
    now
  );

  assert.equal(item.name, "shot1.png");
  assert.equal(item.width, 1920);
  assert.equal(item.height, 1080);
  assert.equal(item.expiresAt - item.createdAt, STAGING_LIFETIME_MS);
  assert.equal(list.length, 1);
});

test("removePending removes by path", () => {
  const list: PendingShot[] = [
    {
      id: "a",
      path: "C:\\path\\a.png",
      name: "a.png",
      thumb: null,
      width: 100,
      height: 100,
      createdAt: 100,
      expiresAt: 200,
    },
    {
      id: "b",
      path: "C:\\path\\b.png",
      name: "b.png",
      thumb: null,
      width: 100,
      height: 100,
      createdAt: 100,
      expiresAt: 200,
    },
  ];

  const updated = removePending(list, "C:\\path\\a.png");
  assert.equal(updated.length, 1);
  assert.equal(updated[0].name, "b.png");
});

test("findExpired identifies shots exceeding lifetime", () => {
  const now = 1_000_000;
  const list: PendingShot[] = [
    {
      id: "1",
      path: "C:\\1.png",
      name: "1.png",
      thumb: null,
      width: 100,
      height: 100,
      createdAt: now - STAGING_LIFETIME_MS - 100,
      expiresAt: now - 100,
    },
    {
      id: "2",
      path: "C:\\2.png",
      name: "2.png",
      thumb: null,
      width: 100,
      height: 100,
      createdAt: now,
      expiresAt: now + STAGING_LIFETIME_MS,
    },
  ];

  const expired = findExpired(list, now);
  assert.equal(expired.length, 1);
  assert.equal(expired[0].name, "1.png");
});

test("remainingTime calculates hours and minutes", () => {
  const base = 10_000_000;
  const in3Hours20Min = base + (3 * 3600 + 20 * 60) * 1000;
  const rem = remainingTime(in3Hours20Min, base);
  assert.equal(rem.hours, 3);
  assert.equal(rem.minutes, 20);
});
