import { describe, expect, it } from "vitest";
import type { TourStorage } from "../types";
import { createMemoryStorage } from "./memoryStorage";
import {
  loadProgress,
  markFinished,
  recordStart,
  shouldAutoStart,
} from "./progress";

const KEY = "tour:test";

describe("loadProgress", () => {
  it("returns zeros for empty storage", async () => {
    const progress = await loadProgress(createMemoryStorage(), KEY);
    expect(progress).toEqual({ shown: 0, completed: false });
  });

  it("returns zeros when getItem throws", async () => {
    const storage: TourStorage = {
      getItem: () => {
        throw new Error("boom");
      },
      setItem: () => undefined,
    };
    expect(await loadProgress(storage, KEY)).toEqual({
      shown: 0,
      completed: false,
    });
  });

  it("returns zeros when getItem rejects", async () => {
    const storage: TourStorage = {
      getItem: () => Promise.reject(new Error("boom")),
      setItem: () => undefined,
    };
    expect(await loadProgress(storage, KEY)).toEqual({
      shown: 0,
      completed: false,
    });
  });

  it("returns zeros for corrupted JSON", async () => {
    const storage = createMemoryStorage({ [KEY]: "{not json" });
    expect(await loadProgress(storage, KEY)).toEqual({
      shown: 0,
      completed: false,
    });
  });
});

describe("recordStart", () => {
  it("increments shown and persists", async () => {
    const storage = createMemoryStorage();
    const next = await recordStart(storage, KEY, {
      shown: 1,
      completed: false,
    });
    expect(next).toEqual({ shown: 2, completed: false });
    expect(await loadProgress(storage, KEY)).toEqual({
      shown: 2,
      completed: false,
    });
  });

  it("resolves when setItem throws", async () => {
    const storage: TourStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const next = await recordStart(storage, KEY, {
      shown: 0,
      completed: false,
    });
    expect(next).toEqual({ shown: 1, completed: false });
  });
});

describe("markFinished", () => {
  it("persists completed true", async () => {
    const storage = createMemoryStorage();
    const next = await markFinished(storage, KEY, {
      shown: 1,
      completed: false,
    });
    expect(next).toEqual({ shown: 1, completed: true });
    expect(await loadProgress(storage, KEY)).toEqual({
      shown: 1,
      completed: true,
    });
  });
});

describe("shouldAutoStart", () => {
  it("is false when completed", () => {
    expect(shouldAutoStart({ shown: 0, completed: true }, 3)).toBe(false);
  });

  it("is false when shown >= maxShows", () => {
    expect(shouldAutoStart({ shown: 3, completed: false }, 3)).toBe(false);
  });

  it("is true below maxShows", () => {
    expect(shouldAutoStart({ shown: 2, completed: false }, 3)).toBe(true);
  });
});
