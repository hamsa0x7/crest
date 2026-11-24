import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  closedGeometry,
  columnGeometry,
  dockWidth,
  lineGeometry,
  openGeometry,
  openWidth,
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

test("the tool bar at full size: 42 px per tool, 2 px between, the separator, the gear and the padding", () => {
  assert.equal(dockWidth(1), 121);
  // The 13 tools a fresh install shows on Windows.
  assert.equal(dockWidth(13), 649);
});

test("dockWidth's sizes are the Dock's own classes in Notch.tsx", () => {
  const src = readFileSync(join(import.meta.dirname, "Notch.tsx"), "utf8");
  const dock = src.slice(src.indexOf("function Dock("), src.indexOf("function DockDrop("));
  const button = src.slice(src.indexOf("function DockButton("));
  const classes = (from: string, re: RegExp) => {
    const m = re.exec(from);
    assert.ok(m, `no match for ${re}`);
    return m[1].split(/\s+/);
  };
  const root = classes(dock, /ref=\{root\} className="([^"]*)"/);
  for (const c of ["px-3", "pt-1"]) assert.ok(root.includes(c), c);
  const capsule = classes(dock, /ref=\{capsule\}[\s\S]*?className=\{`([^`]*)`\}/);
  assert.ok(capsule.includes("p-0.5"), "p-0.5");
  // No gap between the strip, the separator and the gear.
  assert.ok(!capsule.some((c) => c.startsWith("gap-")), "a gap in the capsule");
  assert.ok(classes(dock, /ref=\{strip\} className="([^"]*)"/).includes("gap-0.5"), "gap-0.5");
  assert.match(dock, /<span aria-hidden className="mx-1 h-5 w-px /);
  assert.ok(classes(button, /className=\{`([^`]*)`\}/).includes("w-[42px]"), "w-[42px]");
});

test("a tool narrower than the tool bar opens as wide as the bar, so its icons stay in place from tool to tool (#82)", () => {
  assert.equal(openWidth(520, 13, 1920), 649);
  assert.equal(openWidth(600, 13, 1920), openWidth(520, 13, 1920));
  // A wider tool keeps its own width.
  assert.equal(openWidth(720, 13, 1920), 720);
  assert.equal(openWidth(649, 13, 1920), 649);
});

test("with more tools than the widest panel holds at full size, every tool opens at the widest panel and the buttons narrow there (#82)", () => {
  // 16 tools ask for 781 px, more than the widest panel (740).
  assert.equal(openWidth(520, 16, 1920), 740);
  assert.equal(openWidth(720, 16, 1920), 740);
});

test("where the monitor cannot hold the bar, the tool keeps its own width and the bar narrows as before", () => {
  // A 1280 px monitor at 200 % is 640 px wide.
  assert.equal(openWidth(520, 13, 640), 520);
  // A monitor narrower than the widest panel, with more tools than it holds.
  assert.equal(openWidth(520, 16, 700), 520);
  // Just as wide as the room still fits.
  assert.equal(openWidth(520, 13, 649), 649);
  assert.equal(openWidth(520, 13, Number.NaN), 520);
});
