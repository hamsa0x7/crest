import test from "node:test";
import assert from "node:assert/strict";
import { playChime } from "./chime.ts";

test("playChime executes gracefully in Node environment without AudioContext", () => {
  assert.equal(typeof AudioContext, "undefined");
  // Should not throw or crash when AudioContext is absent
  assert.doesNotThrow(() => {
    playChime("success");
    playChime("error", 0.8);
    playChime("warning");
    playChime("info");
  });
});

test("playChime handles invalid or edge-case volume bounds", () => {
  assert.doesNotThrow(() => {
    playChime("success", -1);
    playChime("success", 2.5);
    playChime("success", 0);
  });
});
