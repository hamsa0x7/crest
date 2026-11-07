import { test } from "node:test";
import assert from "node:assert/strict";
import { getRimGradient, getRimGlowShadow, getFrostedShapeColor, RIM_PRESETS, RIM_GRADIENTS } from "./rim.ts";

test("rim presets contain valid identifiers and non-empty previews", () => {
  assert.equal(RIM_PRESETS.length, 7);
  const ids = RIM_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, ["none", "silver", "frosted", "aurora", "cyberpunk", "gold", "custom"]);
  for (const preset of RIM_PRESETS) {
    assert.ok(preset.label.length > 0);
    assert.ok(preset.preview.length > 0);
  }
});

test("getRimGradient resolves preset and custom gradients", () => {
  assert.equal(getRimGradient("none"), null);
  assert.equal(getRimGradient("silver"), RIM_GRADIENTS.silver);
  assert.equal(getRimGradient("frosted"), RIM_GRADIENTS.frosted);
  assert.equal(getRimGradient("aurora"), RIM_GRADIENTS.aurora);
  assert.equal(getRimGradient("cyberpunk"), RIM_GRADIENTS.cyberpunk);
  assert.equal(getRimGradient("gold"), RIM_GRADIENTS.gold);
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

  const customGlow = getRimGlowShadow("custom", 100, "#3b82f6");
  assert.ok(customGlow);
  assert.ok(customGlow.startsWith("0 0 12px 2px #3b82f6"));
});

test("getFrostedShapeColor resolves color-mix and opacity clamping", () => {
  assert.equal(getFrostedShapeColor("var(--color-notch)", false, 80), "var(--color-notch)");
  assert.equal(
    getFrostedShapeColor("var(--color-notch)", true, 80),
    "color-mix(in srgb, var(--color-notch) 80%, transparent)",
  );
  assert.equal(
    getFrostedShapeColor("var(--notch-closed)", true, 5),
    "color-mix(in srgb, var(--notch-closed) 10%, transparent)",
  );
  assert.equal(
    getFrostedShapeColor("var(--notch-closed)", true, 120),
    "color-mix(in srgb, var(--notch-closed) 100%, transparent)",
  );
});
