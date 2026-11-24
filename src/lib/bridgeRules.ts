import type { BridgeAction } from "./bridge";

/**
 * What the notch does when the settings window closes. A closed window runs no React cleanup and no loop of its own, so the
 * notch settles what it may have left: the shortcuts a recording paused, the vault its Vault page unlocked, and the
 * translation pairs and plugins it was downloading or installing.
 */
export function settingsClosedActions(): BridgeAction[] {
  return [
    { kind: "pauseHotkeys", on: false },
    { kind: "lockVault" },
    { kind: "refresh", what: "offline" },
    { kind: "refresh", what: "plugins" },
  ];
}
