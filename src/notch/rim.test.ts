import { test } from "node:test";
import assert from "node:assert/strict";
import { getRimGradient, getRimGlowShadow, getFrostedShapeColor, getRimStrokeColor, RIM_PRESETS, RIM_GRADIENTS, RIM_EFFECTS } from "./rim.ts";

test("rim presets contain valid identifiers and non-empty previews", () => {
  assert.equal(RIM_PRESETS.length, 12);
  const ids = RIM_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, ["none", "silver", "aurora", "cyberpunk", "gold", "crimson", "emerald", "violet", "sunset", "ice", "rgb", "custom"]);
  for (const preset of RIM_PRESETS) {
    assert.ok(preset.label.length > 0);
    assert.ok(preset.preview.length > 0);
  }
});

test("rim effects contains valid identifiers", () => {
  assert.equal(RIM_EFFECTS.length, 6);
  assert.deepEqual(RIM_EFFECTS.map((e) => e.id), ["none", "breathing", "wave", "zoom", "shifting", "neon"]);
});

test("getRimGradient resolves preset and custom gradients", () => {
  assert.equal(getRimGradient("none"), null);
  assert.equal(getRimGradient("silver"), RIM_GRADIENTS.silver);
  assert.equal(getRimGradient("aurora"), RIM_GRADIENTS.aurora);
  assert.equal(getRimGradient("cyberpunk"), RIM_GRADIENTS.cyberpunk);
  assert.equal(getRimGradient("gold"), RIM_GRADIENTS.gold);
  assert.equal(getRimGradient("crimson"), RIM_GRADIENTS.crimson);
  assert.equal(getRimGradient("emerald"), RIM_GRADIENTS.emerald);
  assert.equal(getRimGradient("violet"), RIM_GRADIENTS.violet);
  assert.equal(getRimGradient("sunset"), RIM_GRADIENTS.sunset);
  assert.equal(getRimGradient("ice"), RIM_GRADIENTS.ice);
  assert.equal(getRimGradient("rgb"), RIM_GRADIENTS.rgb);
  assert.equal(
    getRimGradient("custom", "#ff0000", "#00ff00"),
    "linear-gradient(135deg, #ff0000 0%, #00ff00 100%)",
  );
  assert.equal(getRimGradient("unknown" as any), null);
});

test("getRimGlowShadow calculates atmospheric glow drop-shadows", () => {
  assert.equal(getRimGlowShadow("none", 50), null);
  assert.equal(getRimGlowShadow("silver", 0), null);
  assert.equal(getRimGlowShadow("silver", -10), null);

  const silverGlow = getRimGlowShadow("silver", 100);
  assert.ok(silverGlow);
  assert.ok(silverGlow.includes("rgba(226, 232, 240, 0.35)"));

  const auroraGlow = getRimGlowShadow("aurora", 80);
  assert.ok(auroraGlow);
  assert.ok(auroraGlow.includes("rgba(56, 189, 248,"));

  const crimsonGlow = getRimGlowShadow("crimson", 80);
  assert.ok(crimsonGlow);
  assert.ok(crimsonGlow.includes("rgba(239, 68, 68,"));

  const customGlow = getRimGlowShadow("custom", 100, "#3b82f6");
  assert.ok(customGlow);
  assert.ok(customGlow.startsWith("0 0 12px 2px #3b82f6"));
});

test("getFrostedShapeColor returns baseShape cleanly", () => {
  assert.equal(getFrostedShapeColor("var(--color-notch)", false, 80), "var(--color-notch)");
});

test("getRimStrokeColor resolves stroke colors for ear curves", () => {
  assert.equal(getRimStrokeColor("none"), null);
  assert.equal(getRimStrokeColor("silver"), "rgba(203, 213, 225, 0.55)");
  assert.equal(getRimStrokeColor("aurora"), "#38bdf8");
  assert.equal(getRimStrokeColor("crimson"), "#ef4444");
  assert.equal(getRimStrokeColor("custom", "#123456"), "#123456");
});

import { getRimStops, computeNotchPerimeterPath } from "./rim.ts";

test("getRimStops returns correct color stops for all presets", () => {
  assert.equal(getRimStops("none"), null);
  const cp = getRimStops("cyberpunk");
  assert.ok(cp);
  assert.equal(cp[0].color, "#00f5ff");
  assert.equal(cp[cp.length - 1].color, "#ff007a");

  const custom = getRimStops("custom", "#111111", "#222222");
  assert.ok(custom);
  assert.equal(custom[0].color, "#111111");
  assert.equal(custom[1].color, "#222222");
});

test("computeNotchPerimeterPath traces ears when ear > 0.5", () => {
  const notched = computeNotchPerimeterPath(600, 400, 30, 14, 0);
  assert.ok(notched.startsWith("M -14 0 C"));
  assert.ok(notched.includes("0 14 L 0 370"));
  assert.ok(notched.endsWith("614 0"));

  const capsule = computeNotchPerimeterPath(300, 30, 15, 0, 15);
  assert.ok(capsule.startsWith("M 15 0"));
  assert.ok(capsule.endsWith("Z"));
});
