import { readFileSync } from "node:fs";
import { createMemoryStorage } from "@emenocal07/tourlight-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTour } from "../../createTour";

const tour = createTour(
  { a: { order: 1, title: "A", content: "Step A" } },
  { maxShows: 0, storageKey: "mask-scrolling" },
);

function Controls() {
  const api = tour.useTour();
  return (
    <button type="button" onClick={api.start}>
      start
    </button>
  );
}

function App() {
  const { TourProvider, TourStep } = tour;
  return (
    <TourProvider storage={createMemoryStorage()}>
      <TourStep id="a">
        <div>target a</div>
      </TourStep>
      <Controls />
    </TourProvider>
  );
}

async function flush(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("mask while scrolling", () => {
  it("marks the mask as scrolling during scroll events and clears it after the quiet period", async () => {
    render(<App />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    await flush();

    const mask = screen.getByTestId("tourlight-mask");
    expect(mask.hasAttribute("data-scrolling")).toBe(false);

    vi.useFakeTimers();
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByTestId("tourlight-mask").dataset.scrolling).toBe("true");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(
      screen.getByTestId("tourlight-mask").hasAttribute("data-scrolling"),
    ).toBe(false);
  });

  it("stylesheet disables the mask transition while data-scrolling is true", () => {
    const css = readFileSync(
      `${import.meta.dirname}/../../styles/tourlight.css`,
      "utf8",
    );
    const rule = css.match(
      /\.tourlight-mask\[data-scrolling="true"\]\s*\{([^{}]*)\}/,
    );
    expect(rule).not.toBeNull();
    expect(rule?.[1]).toMatch(/transition:\s*none/);
  });
});
