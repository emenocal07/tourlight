import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createLocalStorageAdapter,
  createMemoryStorage,
  createTour,
  type TourProgress,
  type TourStorage,
} from "./index";

describe("web entry", () => {
  it("re-exports the storage helpers from core", () => {
    expect(typeof createLocalStorageAdapter).toBe("function");
    expect(typeof createMemoryStorage).toBe("function");
  });

  it("accepts a custom TourStorage as the storage prop", () => {
    const progress: TourProgress = { shown: 0, completed: true };
    const custom: TourStorage = {
      getItem: () => JSON.stringify(progress),
      setItem: () => {},
    };
    const { TourProvider } = createTour({
      a: { order: 1, title: "A", content: "A" },
    });
    expect(() =>
      render(
        <TourProvider storage={custom}>
          <div />
        </TourProvider>,
      ),
    ).not.toThrow();
  });
});
