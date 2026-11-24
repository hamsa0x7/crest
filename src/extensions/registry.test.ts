import test from "node:test";
import assert from "node:assert/strict";
import {
  registerExtension,
  getAllExtensions,
  isExtensionEnabled,
  setExtensionEnabled,
  getOverriddenToolIds,
  resolveTabs,
  resolveToolIds,
  type NativeExtension,
} from "./registry.ts";

const DummyIcon = {};
const DummyView = () => null;

test("registerExtension and retrieve extensions", () => {
  const ext: NativeExtension = {
    id: "test-tool",
    name: "Test Tool",
    description: "Testing registry",
    kind: "tool",
    overrides: "upstream-calc",
    icon: DummyIcon,
    hue: "indigo",
    View: DummyView,
    enabledByDefault: true,
  };

  registerExtension(ext);
  const all = getAllExtensions();
  assert.ok(all.some((e) => e.id === "test-tool"));
  assert.equal(isExtensionEnabled("test-tool"), true);

  // Toggle off
  setExtensionEnabled("test-tool", false);
  assert.equal(isExtensionEnabled("test-tool"), false);
  assert.ok(!getOverriddenToolIds().has("upstream-calc"));

  // Toggle back on
  setExtensionEnabled("test-tool", true);
  assert.equal(isExtensionEnabled("test-tool"), true);
  assert.ok(getOverriddenToolIds().has("upstream-calc"));
});

test("resolveTabs properly filters overridden tools and adds active extensions", () => {
  const dummyUpstreamTabs = [
    { id: "upstream-calc", label: "Calc", icon: DummyIcon, hue: "indigo", size: { w: 500, h: 300 }, View: DummyView },
    { id: "upstream-weather", label: "Weather", icon: DummyIcon, hue: "sky", size: { w: 600, h: 300 }, View: DummyView },
  ];

  setExtensionEnabled("test-tool", true);
  const resolved = resolveTabs(dummyUpstreamTabs);

  // "upstream-calc" should be replaced by "test-tool"
  assert.ok(!resolved.some((t) => t.id === "upstream-calc"));
  assert.ok(resolved.some((t) => t.id === "test-tool"));
  assert.ok(resolved.some((t) => t.id === "upstream-weather"));

  // When disabled, upstream-calc returns and test-tool is omitted
  setExtensionEnabled("test-tool", false);
  const fallback = resolveTabs(dummyUpstreamTabs);
  assert.ok(fallback.some((t) => t.id === "upstream-calc"));
  assert.ok(!fallback.some((t) => t.id === "test-tool"));
});

test("resolveToolIds filters out overridden ids", () => {
  const upstreamIds = ["upstream-calc", "upstream-weather"];

  setExtensionEnabled("test-tool", true);
  const resolved = resolveToolIds(upstreamIds);
  assert.deepEqual(resolved, ["upstream-weather", "test-tool"]);

  setExtensionEnabled("test-tool", false);
  const fallback = resolveToolIds(upstreamIds);
  assert.deepEqual(fallback, ["upstream-calc", "upstream-weather"]);
});
