import test from "node:test";
import assert from "node:assert/strict";
import { springPosition, springEasing } from "./springLinear.ts";

test("springPosition starts at 0 and settles to 1", () => {
  assert.equal(springPosition(0, 170, 18, 1), 0);
  assert.equal(springPosition(-1, 170, 18, 1), 0);
  
  // After reasonable settling time (e.g. 2s), position should be ~1
  const posAt2s = springPosition(2, 170, 18, 1);
  assert.ok(Math.abs(1 - posAt2s) < 0.005, `Expected near 1, got ${posAt2s}`);
});

test("springPosition handles critical and overdamped springs", () => {
  // Critically damped: z = 1 -> c = 2 * sqrt(k * m)
  const k = 100, m = 1, cCrit = 20;
  const posCrit = springPosition(0.5, k, cCrit, m);
  assert.ok(posCrit > 0 && posCrit <= 1);

  // Overdamped: z > 1 -> c = 30
  const posOver = springPosition(0.5, k, 30, m);
  assert.ok(posOver > 0 && posOver <= 1);
});

test("springEasing outputs valid CSS linear() syntax and duration", () => {
  const res = springEasing({ stiffness: 320, damping: 26, mass: 1 });
  assert.ok(res.easing.startsWith("linear("));
  assert.ok(res.easing.endsWith(")"));
  assert.ok(res.duration > 50 && res.duration < 3000);
  
  // Points should start around 0 and end at 1
  const pts = res.easing.slice(7, -1).split(",");
  assert.ok(pts.length >= 2);
  assert.equal(pts[pts.length - 1], "1");
});
