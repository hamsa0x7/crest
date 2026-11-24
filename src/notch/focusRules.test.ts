import { test } from "node:test";
import assert from "node:assert/strict";
import { clickOpens, focusLine, startsOnNotch, togglesFocus } from "./focusRules.ts";

test("with the switch off no clicks enter focus mode", () => {
  for (const n of [1, 2, 3, 4, 7]) assert.equal(togglesFocus(n, false, true), false);
});

test("with the switch on the third quick click of a series on the notch toggles it, and only that one", () => {
  assert.equal(togglesFocus(2, true, true), false);
  assert.equal(togglesFocus(3, true, true), true);
  // A fourth click in the same series must not toggle it back.
  assert.equal(togglesFocus(4, true, true), false);
});

test("a series that did not begin on the notch never toggles it", () => {
  assert.equal(togglesFocus(3, true, false), false);
});

test("a series begins on the closed notch, or on the open panel's header where the closed notch sits", () => {
  assert.equal(startsOnNotch(false, false, false), true);
  assert.equal(startsOnNotch(true, true, false), true);
  // Inside a tool (a revealed password to select), on the dock or on a control: not on the notch.
  assert.equal(startsOnNotch(true, false, false), false);
  assert.equal(startsOnNotch(true, true, true), false);
  assert.equal(startsOnNotch(false, false, true), false);
});

test("focus mode keeps the line: with the line look, and over the idle line unless a card needs the notch", () => {
  assert.equal(focusLine("line", false, false), true);
  assert.equal(focusLine("dim", true, false), true);
  assert.equal(focusLine("dim", true, true), false);
  assert.equal(focusLine("dim", false, false), false);
});

test("in focus mode only a click on a card opens the notch, which ends focus mode", () => {
  assert.equal(clickOpens(false, false, false), true);
  assert.equal(clickOpens(false, true, false), false);
  assert.equal(clickOpens(false, true, true), true);
  // An open panel is not opened again.
  assert.equal(clickOpens(true, false, false), false);
});
