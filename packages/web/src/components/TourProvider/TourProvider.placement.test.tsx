import { createMemoryStorage } from "@emenocal07/tourlight-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTour, type TourPlacement } from "../../index";

const PLACEMENTS: TourPlacement[] = [
  "top",
  "top-start",
  "top-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
  "right",
  "right-start",
  "right-end",
];

async function flush(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));
}

function stubGeometry(targetTop = 300): void {
  vi.stubGlobal("innerWidth", 1024);
  vi.stubGlobal("innerHeight", 768);
  // floating-ui reads the viewport size from documentElement and the tooltip size from offset*.
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
    1024,
  );
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
    768,
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("tourlight-tooltip") ? 200 : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("tourlight-tooltip") ? 80 : 0;
    },
  );
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.classList.contains("tourlight-tooltip")) {
      return new DOMRect(0, 0, 200, 80);
    }
    if (this.textContent === "target") {
      return new DOMRect(400, targetTop, 200, 100);
    }
    return new DOMRect(0, 0, 10, 10);
  };
}

function Start() {
  const { start } = tourApi.useTour();
  return (
    <button type="button" onClick={start}>
      start
    </button>
  );
}

// Reassigned per test so each case builds its own tour.
let tourApi: ReturnType<
  typeof createTour<{ a: { order: 1; title: string; content: string } }>
>;

async function open(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: "start" }));
  await flush();
  return screen.getByRole("dialog");
}

beforeEach(() => {
  stubGeometry();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderTour(
  stepPlacement: TourPlacement | undefined,
  providerPlacement: TourPlacement | undefined,
): void {
  tourApi = createTour(
    {
      a: {
        order: 1,
        title: "A",
        content: "Step A",
        ...(stepPlacement ? { placement: stepPlacement } : {}),
      },
    },
    { maxShows: 0, storageKey: `placement-${Math.random()}` },
  ) as unknown as typeof tourApi;
  const { TourProvider, TourStep } = tourApi;
  render(
    <TourProvider storage={createMemoryStorage()} placement={providerPlacement}>
      <TourStep id="a">
        <div>target</div>
      </TourStep>
      <Start />
    </TourProvider>,
  );
}

describe("tooltip placement", () => {
  it.each(PLACEMENTS)(
    "uses the %s placement when there is room",
    async (placement) => {
      renderTour(undefined, placement);
      await flush();
      const tooltip = await open();
      expect(tooltip.dataset.placement).toBe(placement);
    },
  );

  it("flips to the opposite side when there is no room", async () => {
    stubGeometry(10);
    renderTour(undefined, "top");
    await flush();
    const tooltip = await open();
    expect(tooltip.dataset.placement?.startsWith("bottom")).toBe(true);
  });

  it("defaults to bottom when neither step nor provider set one", async () => {
    renderTour(undefined, undefined);
    await flush();
    expect((await open()).dataset.placement).toBe("bottom");
  });

  it("uses the provider placement when the step has none", async () => {
    renderTour(undefined, "left");
    await flush();
    expect((await open()).dataset.placement).toBe("left");
  });

  it("lets the step placement override the provider placement", async () => {
    renderTour("right-end", "left");
    await flush();
    expect((await open()).dataset.placement).toBe("right-end");
  });
});
