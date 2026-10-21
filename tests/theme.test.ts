import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  applyTheme, getServerThemeSnapshot, getThemeBootstrapScript, getThemeSnapshot, resolveTheme,
  subscribeToThemeChange,
} from "../src/lib/theme.ts";

test("initial theme defaults to light for the light system preference", () => {
  assert.equal(resolveTheme(null, false), "light");
});

test("initial theme follows the dark system preference when no preference is stored", () => {
  assert.equal(resolveTheme(null, true), "dark");
});

test("a persisted theme overrides either system preference", () => {
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("invalid stored values fall back to the system preference", () => {
  assert.equal(resolveTheme("sepia", false), "light");
  assert.equal(resolveTheme("sepia", true), "dark");
});

test("the pre-hydration bootstrap applies persisted and system theme preferences", () => {
  function bootstrap(stored: string | null, prefersDark: boolean): string {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(getThemeBootstrapScript(), {
      document,
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: prefersDark }),
    });
    return document.documentElement.dataset.theme;
  }

  assert.equal(bootstrap(null, false), "light");
  assert.equal(bootstrap(null, true), "dark");
  assert.equal(bootstrap("dark", false), "dark");
  assert.equal(bootstrap("light", true), "light");
});

test("switching after the server snapshot persists and notifies the theme subscriber", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const document = { documentElement: { dataset: { theme: "light" } } };
  const stored: string[] = [];
  const eventTarget = new EventTarget();
  Object.defineProperty(eventTarget, "localStorage", { value: { setItem: (_key: string, value: string) => stored.push(value) } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "window", { configurable: true, value: eventTarget });

  try {
    assert.equal(getServerThemeSnapshot(), "light");
    assert.equal(getThemeSnapshot(), "light");
    let updates = 0;
    const unsubscribe = subscribeToThemeChange(() => { updates += 1; });
    applyTheme("dark");
    assert.equal(getThemeSnapshot(), "dark");
    assert.deepEqual(stored, ["dark"]);
    assert.equal(updates, 1);
    unsubscribe();
    applyTheme("light");
    assert.equal(updates, 1);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
