import type { TourStorage } from "../types";

export function createMemoryStorage(
  initial: Record<string, string> = {},
): TourStorage {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value);
    },
  };
}
