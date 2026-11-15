import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dampenDrag, evaluateFlick } from "./gestureDismiss.ts";

describe("gestureDismiss physics", () => {
  it("dampenDrag dampens dragging into the screen from the top notch", () => {
    // Top notch (edge = -1): dragging down (dy = 50 > 0) is into screen -> dampened
    assert.equal(dampenDrag(50, -1), 10);
    // Dragging up (dy = -50 < 0) is towards the bezel -> not dampened
    assert.equal(dampenDrag(-50, -1), -50);
    // No movement -> 0
    assert.equal(dampenDrag(0, -1), 0);
  });

  it("evaluateFlick recognizes fast upward flick to top notch bezel", () => {
    const res = evaluateFlick({ dx: 0, dy: -25, dt: 30, edge: -1 });
    assert.equal(res.away, true);
    assert.ok(res.speed > 0.4);
    assert.ok(res.flingY < -160);
  });

  it("evaluateFlick recognizes fast horizontal flick", () => {
    const res = evaluateFlick({ dx: 30, dy: 0, dt: 40, edge: -1 });
    assert.equal(res.away, true);
    assert.ok(res.speed > 0.4);
    assert.ok(res.flingX > 160);
  });

  it("evaluateFlick recognizes slow drag past threshold distance", () => {
    const resY = evaluateFlick({ dx: 0, dy: -40, dt: 500, edge: -1 });
    assert.equal(resY.away, true);

    const resX = evaluateFlick({ dx: 70, dy: 0, dt: 500, edge: -1 });
    assert.equal(resX.away, true);
  });

  it("evaluateFlick rejects slow drag into screen", () => {
    const res = evaluateFlick({ dx: 0, dy: 30, dt: 300, edge: -1 });
    assert.equal(res.away, false);
  });

  it("evaluateFlick rejects micro-movements and clicks", () => {
    const res = evaluateFlick({ dx: 2, dy: -2, dt: 100, edge: -1 });
    assert.equal(res.away, false);
  });
});
