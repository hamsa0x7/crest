import test from "node:test";
import assert from "node:assert/strict";
import {
  closedGeometry,
  columnGeometry,
  lineGeometry,
  openGeometry,
  peekGeometry,
  peekHudGeometry,
  satelliteGeometry,
} from "./geometry.ts";

test("closedGeometry computes correct notch and capsule proportions", () => {
  const notch = closedGeometry("notch", 180, 30, 13);
  assert.equal(notch.w, 180);
  assert.equal(notch.h, 30);
  assert.equal(notch.r, 10);
  assert.equal(notch.ear, 13);
  assert.equal(notch.rt, 0);

  const capsule = closedGeometry("capsule", 200, 34);
  assert.equal(capsule.w, 200);
  assert.equal(capsule.h, 34);
  assert.equal(capsule.r, 17);
  assert.equal(capsule.ear, 0);
  assert.equal(capsule.rt, 17);
});

test("peekGeometry expands slightly as hover feedback", () => {
  const peekNotch = peekGeometry("notch", 180, 30, 14);
  assert.equal(peekNotch.w, 196);
  assert.equal(peekNotch.h, 34);
  assert.equal(peekNotch.r, 12);
  assert.equal(peekNotch.ear, 14);
  assert.equal(peekNotch.rt, 0);

  const peekCapsule = peekGeometry("capsule", 200, 30);
  assert.equal(peekCapsule.w, 216);
  assert.equal(peekCapsule.h, 34);
  assert.equal(peekCapsule.r, 17);
  assert.equal(peekCapsule.ear, 0);
  assert.equal(peekCapsule.rt, 17);
});

test("peekHudGeometry returns compact interactive HUD proportions", () => {
  const musicHud = peekHudGeometry("notch", 320, 44, 15);
  assert.equal(musicHud.w, 320);
  assert.equal(musicHud.h, 44);
  assert.equal(musicHud.r, 16);
  assert.equal(musicHud.ear, 15);
  assert.equal(musicHud.rt, 0);

  const timerHud = peekHudGeometry("capsule", 270, 44);
  assert.equal(timerHud.w, 270);
  assert.equal(timerHud.h, 44);
  assert.equal(timerHud.r, 22);
  assert.equal(timerHud.ear, 0);
  assert.equal(timerHud.rt, 22);
});

test("satelliteGeometry outputs detached 30px circular bubble dimensions", () => {
  const bubble = satelliteGeometry(30);
  assert.equal(bubble.w, 30);
  assert.equal(bubble.h, 30);
  assert.equal(bubble.r, 15);
  assert.equal(bubble.rt, 15);
  assert.equal(bubble.ear, 0);
});

test("lineGeometry returns thin edge strip", () => {
  const idleLine = lineGeometry(120, 4, false, false);
  assert.equal(idleLine.w, 120);
  assert.equal(idleLine.h, 4);
  assert.equal(idleLine.ear, 3);
  assert.equal(idleLine.rt, 0);

  const peekLine = lineGeometry(120, 4, false, true);
  assert.equal(peekLine.w, 136);
  assert.equal(peekLine.h, 6);
  assert.equal(peekLine.ear, 3.5);
});

test("openGeometry provides open panel proportions", () => {
  const openNotch = openGeometry(480, 320, false, 14);
  assert.equal(openNotch.w, 480);
  assert.equal(openNotch.h, 320);
  assert.equal(openNotch.r, 30);
  assert.equal(openNotch.ear, 14);
  assert.equal(openNotch.rt, 0);

  const openFloating = openGeometry(480, 320, true);
  assert.equal(openFloating.rt, 30);
  assert.equal(openFloating.ear, 0);
});

test("columnGeometry scales for side edges", () => {
  const col = columnGeometry(200, 30, false, 10);
  assert.equal(col.w, 200);
  assert.equal(col.h, 30);
  assert.equal(col.r, 10);
  assert.equal(col.ear, 10);

  const peekCol = columnGeometry(200, 30, true, 10);
  assert.equal(peekCol.w, 216);
  assert.equal(peekCol.h, 34);
  assert.equal(peekCol.ear, 11);
});
