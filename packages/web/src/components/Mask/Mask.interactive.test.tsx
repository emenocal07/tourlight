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

const TARGET = new DOMRect(100, 200, 300, 50);

const tour = createTour(
  {
    plain: { order: 1, title: "Plain", content: "Plain step" },
    live: { order: 2, title: "Live", content: "Live step", interactive: true },
  },
  { maxShows: 1, storageKey: "mask-interactive" },
);

const variantTour = createTour(
  { a: { order: 1, title: "A", content: "Step A" } },
  { maxShows: 1, storageKey: "variant-tour" },
);

async function flush(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

function renderTour(): void {
  const { TourProvider, TourStep } = tour;
  render(
    <TourProvider storage={createMemoryStorage()}>
      <TourStep id="plain">
        <div>plain target</div>
      </TourStep>
      <TourStep id="live">
        <div>live target</div>
      </TourStep>
    </TourProvider>,
  );
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Resolves the inline top/left/right/bottom/width/height of a fixed blocker against the viewport.
function boxOf(el: HTMLElement): Box {
  const px = (value: string): number | null =>
    value === "" ? null : Number.parseFloat(value);
  const { top, left, right, bottom, width, height } = el.style;
  const t = px(top);
  const l = px(left);
  const r = px(right);
  const b = px(bottom);
  const w = px(width);
  const h = px(height);
  const x0 = l ?? window.innerWidth - (r ?? 0) - (w ?? 0);
  const x1 = w !== null && l !== null ? l + w : window.innerWidth - (r ?? 0);
  const y0 = t ?? window.innerHeight - (b ?? 0) - (h ?? 0);
  const y1 = h !== null && t !== null ? t + h : window.innerHeight - (b ?? 0);
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

function area(box: Box): number {
  return Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top);
}

const blockers = (): HTMLElement[] =>
  screen.queryAllByTestId("tourlight-blocker");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("blockers", () => {
  it("non-interactive step renders one blocker", async () => {
    renderTour();
    await flush();
    expect(screen.getByText("Plain step")).toBeTruthy();
    const found = blockers();
    expect(found).toHaveLength(1);
    expect(boxOf(found[0] as HTMLElement)).toEqual({
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    });
  });

  it("clicking the blocker does not advance or close the tour", async () => {
    renderTour();
    await flush();
    fireEvent.click(blockers()[0] as HTMLElement);
    expect(screen.getByText("Plain step")).toBeTruthy();
    expect(screen.getByText("Step 1 of 2")).toBeTruthy();
  });

  it("interactive step lets clicks reach the target", async () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      TARGET,
    );
    renderTour();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Live step")).toBeTruthy();

    const boxes = blockers().map(boxOf);
    expect(boxes).toHaveLength(4);
    const target: Box = {
      left: TARGET.left,
      top: TARGET.top,
      right: TARGET.right,
      bottom: TARGET.bottom,
    };
    for (const box of boxes) expect(overlaps(box, target)).toBe(false);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i] as Box, boxes[j] as Box)).toBe(false);
      }
    }
    const covered =
      boxes.reduce((sum, box) => sum + area(box), 0) + area(target);
    expect(covered).toBe(window.innerWidth * window.innerHeight);
  });

  it("blockers keep the mask non-interactive", async () => {
    renderTour();
    await flush();
    expect(screen.getByTestId("tourlight-mask").style.pointerEvents).toBe("");
    expect(blockers()[0]?.className).toBe("tourlight-blocker");
  });
});

describe("variant and theme on the overlay root", () => {
  async function renderVariant(props: {
    variant?: "glass" | "minimal" | "bold";
    theme?: { primary?: string };
  }): Promise<HTMLElement> {
    const { TourProvider, TourStep } = variantTour;
    render(
      <TourProvider storage={createMemoryStorage()} {...props}>
        <TourStep id="a">
          <div>target</div>
        </TourStep>
      </TourProvider>,
    );
    await flush();
    const root = screen.getByTestId("tourlight-mask").closest("[data-variant]");
    return root as HTMLElement;
  }

  it("provider sets data-variant", async () => {
    const root = await renderVariant({ variant: "glass" });
    expect(root.getAttribute("data-variant")).toBe("glass");
  });

  it("defaults the variant to minimal", async () => {
    const root = await renderVariant({});
    expect(root.getAttribute("data-variant")).toBe("minimal");
    expect(root.getAttribute("style")).toBeNull();
  });

  it("theme prop writes inline variables only for the given keys", async () => {
    const root = await renderVariant({ theme: { primary: "#7c3aed" } });
    expect(root.style.getPropertyValue("--tour-primary")).toBe("#7c3aed");
    expect(root.style.getPropertyValue("--tour-surface")).toBe("");
    expect(root.style.getPropertyValue("--tour-radius")).toBe("");
  });

  it("tooltip extras are hidden from assistive technology", async () => {
    await renderVariant({ variant: "bold" });
    const badge = document.querySelector(".tourlight-tooltip__badge");
    const bar = document.querySelector(".tourlight-tooltip__bar");
    expect(badge?.getAttribute("aria-hidden")).toBe("true");
    expect(badge?.textContent).toBe("1");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
  });
});
