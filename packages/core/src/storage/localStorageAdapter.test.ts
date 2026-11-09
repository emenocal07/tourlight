import { afterEach, describe, expect, it } from "vitest";
import { createLocalStorageAdapter } from "./localStorageAdapter";

const target = globalThis as { localStorage?: unknown };

afterEach(() => {
  delete target.localStorage;
});

describe("localStorage adapter", () => {
  it("is a no-op when localStorage throws", () => {
    target.localStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    const adapter = createLocalStorageAdapter();
    expect(adapter.getItem("k")).toBeNull();
    expect(() => adapter.setItem("k", "v")).not.toThrow();
  });

  it("is a no-op when localStorage is undefined", () => {
    delete target.localStorage;
    const adapter = createLocalStorageAdapter();
    expect(adapter.getItem("k")).toBeNull();
    expect(() => adapter.setItem("k", "v")).not.toThrow();
  });

  it("reads and writes through localStorage when available", () => {
    const data = new Map<string, string>();
    target.localStorage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const adapter = createLocalStorageAdapter();
    adapter.setItem("k", "v");
    expect(adapter.getItem("k")).toBe("v");
  });
});
