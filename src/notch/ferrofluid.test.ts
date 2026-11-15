import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateFerrofluidStretch,
  calculateIdleSag,
  computeFerrofluidPerimeterPath,
  triggerSuccessDroplet,
  subscribeDroplets,
  generatePrecipitationParticles,
  MAX_STRETCH_OFFSET,
} from "./ferrofluid.ts";

test("calculateFerrofluidStretch produces smooth downward magnetic pull when cursor is nearby", () => {
  const w = 400;
  const h = 34;

  // Far away cursor: no stretch
  const far = calculateFerrofluidStretch(200, 200, w, h);
  assert.equal(far.active, false);
  assert.equal(far.offset, 0);

  // Directly below center within proximity threshold: strong stretch
  const nearCenter = calculateFerrofluidStretch(200, h + 15, w, h);
  assert.equal(nearCenter.active, true);
  assert.ok(nearCenter.offset > 0);
  assert.ok(nearCenter.offset <= MAX_STRETCH_OFFSET);
  assert.equal(nearCenter.x, 200);

  // As cursor gets closer to bottom edge, stretch increases
  const closer = calculateFerrofluidStretch(200, h + 5, w, h);
  assert.ok(closer.offset > nearCenter.offset);

  // Negative cursor Y (above bottom edge): no stretch
  const inside = calculateFerrofluidStretch(200, 20, w, h);
  assert.equal(inside.active, false);
  assert.equal(inside.offset, 0);

  // Far horizontally outside width: no stretch
  const farX = calculateFerrofluidStretch(w + 100, h + 10, w, h);
  assert.equal(farX.active, false);
  assert.equal(farX.offset, 0);
});

test("calculateIdleSag sags downward after 5 minutes of inactivity", () => {
  const threshold = 300_000; // 5 min

  // Active user: 0 sag
  assert.equal(calculateIdleSag(0, threshold), 0);
  assert.equal(calculateIdleSag(150_000, threshold), 0);
  assert.equal(calculateIdleSag(threshold, threshold), 0);

  // 15 seconds into idle: partial sag
  const partial = calculateIdleSag(threshold + 15_000, threshold, 6);
  assert.ok(partial > 0);
  assert.ok(partial < 6);

  // 30+ seconds into idle: full 6px sag
  const full = calculateIdleSag(threshold + 40_000, threshold, 6);
  assert.equal(full, 6);
});

import { computeNotchPerimeterPath } from "./rim.ts";

test("computeFerrofluidPerimeterPath returns standard perimeter when undeformed", () => {
  const notched = computeFerrofluidPerimeterPath(600, 400, 30, 14, 0);
  const baselineNotched = computeNotchPerimeterPath(600, 400, 30, 14, 0);
  assert.equal(notched, baselineNotched);

  const capsule = computeFerrofluidPerimeterPath(300, 30, 15, 0, 15);
  const baselineCapsule = computeNotchPerimeterPath(300, 30, 15, 0, 15);
  assert.equal(capsule, baselineCapsule);
});

test("computeFerrofluidPerimeterPath curves bottom edge when stretch is active", () => {
  const stretched = computeFerrofluidPerimeterPath(600, 400, 30, 14, 0, {
    stretchOffset: 8,
    stretchX: 300,
  });

  // Contains cubic Bézier belly curve pulling to (300, 408)
  assert.ok(stretched.includes("300 408"));
  assert.ok(stretched.includes("C"));
});

test("computeFerrofluidPerimeterPath modulates bottom edge when audio spikes are active", () => {
  const bands = [0.1, 0.4, 0.8, 0.9, 0.6, 0.3, 0.2, 0.1];
  const spiked = computeFerrofluidPerimeterPath(400, 34, 17, 0, 17, {
    spikes: bands,
    spikeHeight: 8,
  });

  // Generates quadratic curve segments for audio visualizer
  assert.ok(spiked.includes("Q"));
  assert.ok(spiked.startsWith("M 17 0"));
  assert.ok(spiked.endsWith("Z"));
});

test("triggerSuccessDroplet dispatches instances to subscribers", () => {
  let received: any = null;
  const unsubscribe = subscribeDroplets((d) => {
    received = d;
  });

  triggerSuccessDroplet(150);
  assert.ok(received);
  assert.equal(received.x, 150);
  assert.equal(received.radius, 3.5);

  received = null;
  unsubscribe();
  triggerSuccessDroplet(200);
  assert.equal(received, null); // Unsubscribed
});

test("generatePrecipitationParticles produces randomized particles for rain and snow", () => {
  const rain = generatePrecipitationParticles(4, "rain");
  assert.equal(rain.length, 4);
  for (const p of rain) {
    assert.equal(p.type, "rain");
    assert.ok(p.xRatio >= 0 && p.xRatio <= 1);
    assert.ok(p.durationMs > 0);
  }

  const snow = generatePrecipitationParticles(3, "snow");
  assert.equal(snow.length, 3);
  for (const p of snow) {
    assert.equal(p.type, "snow");
    assert.ok(p.durationMs >= 2000);
  }
});
