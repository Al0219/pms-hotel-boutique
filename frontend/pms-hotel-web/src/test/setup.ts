import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { mockServer } from "@/data/mocks/server";

const storeMap = new WeakMap<object, Record<string, string>>();

function getStore(target: object): Record<string, string> {
  let s = storeMap.get(target);
  if (!s) {
    s = {};
    storeMap.set(target, s);
  }
  return s;
}

if (typeof Storage !== "undefined") {
  Object.defineProperty(Storage.prototype, "length", {
    get() {
      return Object.keys(getStore(this)).length;
    },
    configurable: true,
  });

  Storage.prototype.clear = function () {
    storeMap.set(this, {});
  };

  Storage.prototype.getItem = function (key: string) {
    const store = getStore(this);
    return key in store ? store[key] : null;
  };

  Storage.prototype.setItem = function (key: string, value: string) {
    const store = getStore(this);
    store[key] = String(value);
  };

  Storage.prototype.removeItem = function (key: string) {
    const store = getStore(this);
    delete store[key];
  };

  Storage.prototype.key = function (index: number) {
    const store = getStore(this);
    return Object.keys(store)[index] ?? null;
  };
}

const mockLocalStorage = Object.create(Storage.prototype);
const mockSessionStorage = Object.create(Storage.prototype);

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });
}

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
});
afterAll(() => mockServer.close());
