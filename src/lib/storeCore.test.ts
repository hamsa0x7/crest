import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStore } from "./storeCore.ts";

/** A storage that counts its writes; `map` stands for what another window writes without going through this one. */
function memoryStorage(initial: Record<string, string>) {
  const map = new Map(Object.entries(initial));
  let writes = 0;
  return {
    map,
    get writes() {
      return writes;
    },
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes++;
      map.set(key, value);
    },
  };
}

/** The window as the store sees it: `fire` delivers a `storage` event, as the browser does for another window's write. */
function fakeTarget() {
  const listeners = new Set<(e: StorageEvent) => void>();
  const target = {
    addEventListener: (type: string, listener: (e: StorageEvent) => void) => void (type === "storage" && listeners.add(listener)),
    removeEventListener: (type: string, listener: (e: StorageEvent) => void) => void (type === "storage" && listeners.delete(listener)),
  } as unknown as Pick<Window, "addEventListener" | "removeEventListener">;
  const fire = (e: { key: string | null; newValue: string | null }) => listeners.forEach((l) => l(e as StorageEvent));
  return { target, fire };
}

test("reads the saved value at creation and writes every change", () => {
  const storage = memoryStorage({ "notch:x": '{"n":3}' });
  const s = makeStore({ n: 1 }, { key: "notch:x", storage });
  assert.deepEqual(s.get(), { n: 3 });
  s.set({ n: 4 });
  assert.equal(storage.getItem("notch:x"), '{"n":4}');
});

test("a broken saved value falls back and is set aside", () => {
  const storage = memoryStorage({ "notch:x": "{oops" });
  const s = makeStore({ n: 1 }, { key: "notch:x", storage });
  assert.deepEqual(s.get(), { n: 1 });
  assert.equal(storage.getItem("notch:x.bad"), "{oops");
});

test("adopts another window's write without writing it back", () => {
  const storage = memoryStorage({ "notch:x": '{"n":1}' });
  const { target, fire } = fakeTarget();
  const s = makeStore({ n: 0 }, { key: "notch:x", storage, target });
  let notified = 0;
  s.subscribe(() => notified++);
  // The other window's write, which this window only sees as an event.
  storage.map.set("notch:x", '{"n":2}');
  const before = storage.writes;
  fire({ key: "notch:x", newValue: '{"n":2}' });
  assert.deepEqual(s.get(), { n: 2 });
  assert.equal(notified, 1);
  assert.equal(storage.writes, before);
});

test("reads the current value, so a burst of events collapses to the latest", () => {
  const storage = memoryStorage({ "notch:x": '{"n":1}' });
  const { target, fire } = fakeTarget();
  const s = makeStore({ n: 0 }, { key: "notch:x", storage, target });
  storage.map.set("notch:x", '{"n":5}');
  fire({ key: "notch:x", newValue: '{"n":2}' });
  assert.deepEqual(s.get(), { n: 5 });
});

test("other keys, a cleared storage, a removed key and a broken value change nothing", () => {
  const storage = memoryStorage({ "notch:x": '{"n":1}' });
  const { target, fire } = fakeTarget();
  const s = makeStore({ n: 0 }, { key: "notch:x", storage, target });
  fire({ key: "notch:y", newValue: "{}" });
  fire({ key: null, newValue: null });
  storage.map.set("notch:x", "{broken");
  fire({ key: "notch:x", newValue: "{broken" });
  storage.map.delete("notch:x");
  fire({ key: "notch:x", newValue: null });
  assert.deepEqual(s.get(), { n: 1 });
});
