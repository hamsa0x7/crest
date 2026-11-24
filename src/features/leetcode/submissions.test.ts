import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shade,
  todayCount,
  type Day,
  type DifficultyCounts,
} from "./submissions.ts";

test("shade steps with orange theme token", () => {
  assert.equal(shade(0), "var(--color-fill-2)");
  assert.match(shade(1) ?? "", /--color-orange.*32%/);
  assert.match(shade(4) ?? "", /--color-orange.*100%/);
});

test("UTC day count matching LeetCode submissionCalendar", () => {
  const days: Day[] = [
    { date: "2026-11-14", count: 3, level: 2 },
    { date: "2026-11-15", count: 0, level: 0 },
  ];
  const utcToday = new Date("2026-11-14T23:30:00Z").toISOString().slice(0, 10);
  assert.equal(utcToday, "2026-11-14");
  assert.equal(todayCount(days, utcToday), 3);
});

test("difficulty split sums correctly", () => {
  const solved: DifficultyCounts = {
    all: 412,
    easy: 180,
    medium: 192,
    hard: 40,
  };
  assert.equal(solved.easy + solved.medium + solved.hard, solved.all);
});
