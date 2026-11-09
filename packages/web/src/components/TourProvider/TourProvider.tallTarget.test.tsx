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
  { maxShows: 0, storageKey: "tall-target" },
);

function Start() {
  const { start } = tour.useTour();
  return (
    <button type="button" onClick={start}>
      start
    </button>
  );
}

async function flush(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TourProvider with a target taller than the viewport", () => {
  it("clamps the mask to the viewport and docks the tooltip", async () => {
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("innerHeight", 600);
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.classList.contains("tourlight-tooltip")) {
        return new DOMRect(0, 0, 300, 150);
      }
      if (this.textContent === "target a") {
        return new DOMRect(0, -500, 1000, 3000);
      }
      return new DOMRect(0, 0, 10, 10);
    };

    const { TourProvider, TourStep } = tour;
    render(
      <TourProvider storage={createMemoryStorage()}>
        <TourStep id="a">
          <div>target a</div>
        </TourStep>
        <Start />
      </TourProvider>,
    );
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    await flush();

    const mask = screen.getByTestId("tourlight-mask");
    expect(mask.style.top).toBe("-4px");
    expect(mask.style.height).toBe("608px");
    expect(mask.style.width).toBe("1008px");

    const tooltip = screen.getByRole("dialog");
    expect(tooltip.dataset.placement).toBe("docked");
    expect(tooltip.style.top).toBe("434px");
    expect(tooltip.style.left).toBe("350px");
  });
});
