import { test } from "node:test";
import assert from "node:assert/strict";
import { ringWindows } from "./ringWindows.ts";

const w = (kind: string, usedPercent: number) => ({ kind, usedPercent, resetsAt: null, windowSecs: null });

test("the session goes inside, the weekly limit outside, even when the weekly one is fuller", () => {
  assert.deepEqual(ringWindows([w("session", 5), w("weekly", 22)]), { outer: w("weekly", 22), inner: w("session", 5) });
  assert.deepEqual(ringWindows([w("session", 0), w("weekly", 91)]), { outer: w("weekly", 91), inner: w("session", 0) });
});

test("a fuller session stays inside: the ring never swaps windows", () => {
  assert.deepEqual(ringWindows([w("weekly", 22), w("session", 95)]), { outer: w("weekly", 22), inner: w("session", 95) });
});

test("outside is the fullest of the longer windows", () => {
  const r = ringWindows([w("session", 10), w("weekly", 30), w("weekly-opus", 60), w("weekly-sonnet", 5)]);
  assert.deepEqual(r, { outer: w("weekly-opus", 60), inner: w("session", 10) });
});

test("a provider without a session window keeps one ring with its fullest window", () => {
  assert.deepEqual(ringWindows([w("daily", 40), w("monthly", 70)]), { outer: w("monthly", 70), inner: null });
  assert.deepEqual(ringWindows([w("model:Opus", 12)]), { outer: w("model:Opus", 12), inner: null });
});

test("a provider with only session windows shows its fullest one as the single ring", () => {
  assert.deepEqual(ringWindows([w("session", 30)]), { outer: w("session", 30), inner: null });
  assert.deepEqual(ringWindows([w("session", 30), w("session-3p", 50)]), { outer: w("session-3p", 50), inner: null });
});

test("the fullest session window goes inside when there are two", () => {
  const r = ringWindows([w("session", 20), w("session-3p", 45), w("weekly", 10), w("weekly-3p", 15)]);
  assert.deepEqual(r, { outer: w("weekly-3p", 15), inner: w("session-3p", 45) });
});

test("no windows, no ring", () => {
  assert.equal(ringWindows([]), null);
});
