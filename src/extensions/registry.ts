export type ExtensionKind = "tool" | "overlay" | "service";

export interface ExtensionTab {
  id: string;
  label: string;
  icon: unknown;
  hue: string;
  size: { w: number; h: number };
  View: unknown;
}

export interface NativeExtension {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  /** Optional ID of an upstream tool this extension shadows/replaces (e.g. "youtube", "capture") */
  overrides?: string;
  icon: unknown;
  hue: string;
  size?: { w: number; h: number };
  View?: unknown;
  Settings?: unknown;
  Overlay?: unknown;
  enabledByDefault?: boolean;
}

const STORAGE_KEY = "notch:native_extensions";

let state: Record<string, boolean> = {};
try {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  }
} catch {
  // Fall back to default
}

const listeners = new Set<() => void>();

export const extensionStore = {
  get: () => state,
  set: (next: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    state = typeof next === "function" ? next(state) : next;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // Quota or unavailable
    }
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  use: (): Record<string, boolean> => {
    return state;
  },
};

const registry: NativeExtension[] = [];

export function registerExtension(ext: NativeExtension) {
  const existingIdx = registry.findIndex((e) => e.id === ext.id);
  if (existingIdx >= 0) {
    registry[existingIdx] = ext;
  } else {
    registry.push(ext);
  }
}

export function getAllExtensions(): readonly NativeExtension[] {
  return registry;
}

export function isExtensionEnabled(id: string): boolean {
  const s = extensionStore.get();
  if (s[id] !== undefined) return s[id];
  const ext = registry.find((e) => e.id === id);
  return ext?.enabledByDefault ?? true;
}

export function setExtensionEnabled(id: string, enabled: boolean) {
  extensionStore.set((prev) => ({ ...prev, [id]: enabled }));
}

/** Returns all currently active tool extensions as tab instances */
export function getActiveExtensionTabs<T = ExtensionTab>(): T[] {
  return registry
    .filter((ext) => ext.kind === "tool" && ext.View && isExtensionEnabled(ext.id))
    .map((ext) => ({
      id: ext.id,
      label: ext.name,
      icon: ext.icon,
      hue: ext.hue,
      size: ext.size ?? { w: 560, h: 320 },
      View: ext.View,
    })) as unknown as T[];
}

/** Returns the set of upstream tool IDs overridden by enabled extensions */
export function getOverriddenToolIds(): Set<string> {
  const ids = new Set<string>();
  for (const ext of registry) {
    if (ext.overrides && isExtensionEnabled(ext.id)) {
      ids.add(ext.overrides);
    }
  }
  return ids;
}

/** Resolves the complete list of notch tabs, filtering out overridden tools and mounting active extensions */
export function resolveTabs<T extends { id: string }>(upstreamTabs: T[]): T[] {
  const overridden = getOverriddenToolIds();
  const filteredUpstream = upstreamTabs.filter((t) => !overridden.has(t.id));
  const activeExtensions = getActiveExtensionTabs<T>();
  return [...filteredUpstream, ...activeExtensions];
}

/** Resolves tool IDs for settings and ordering */
export function resolveToolIds(upstreamToolIds: readonly string[]): string[] {
  const overridden = getOverriddenToolIds();
  const filtered = upstreamToolIds.filter((id) => !overridden.has(id));
  const activeExtIds = registry
    .filter((ext) => ext.kind === "tool" && isExtensionEnabled(ext.id))
    .map((ext) => ext.id);
  return [...filtered, ...activeExtIds];
}
