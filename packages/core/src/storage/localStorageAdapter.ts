import type { TourStorage } from "../types";

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getLocalStorage(): LocalStorageLike | undefined {
  try {
    return (globalThis as { localStorage?: LocalStorageLike }).localStorage;
  } catch {
    return undefined;
  }
}

export function createLocalStorageAdapter(): TourStorage {
  return {
    getItem: (key: string): string | null => {
      try {
        return getLocalStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        getLocalStorage()?.setItem(key, value);
      } catch {
        // Storage unavailable or full: progress simply is not persisted.
      }
    },
  };
}
