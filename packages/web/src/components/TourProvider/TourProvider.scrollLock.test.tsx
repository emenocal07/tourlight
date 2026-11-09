import { createMemoryStorage } from "@emenocal07/tourlight-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTour } from "../../createTour";

const tour = createTour(
  { a: { order: 1, title: "A", content: "Step A" } },
  { maxShows: 0, storageKey: "scroll-lock" },
);

function Controls() {
  const api = tour.useTour();
  return (
    <>
      <button type="button" onClick={api.start}>
        start
      </button>
      <button type="button" onClick={api.finish}>
        finish
      </button>
      <button type="button" onClick={api.skip}>
        skip
      </button>
    </>
  );
}

function App({ lockScroll }: { lockScroll?: boolean }) {
  const { TourProvider, TourStep } = tour;
  return (
    <TourProvider storage={createMemoryStorage()} lockScroll={lockScroll}>
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

async function startTour(): Promise<void> {
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "start" }));
  await flush();
}

const root = document.documentElement;

beforeEach(() => {
  root.style.overflow = "";
  root.style.paddingRight = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  root.style.overflow = "";
  root.style.paddingRight = "";
});

describe("scroll lock", () => {
  it("sets overflow hidden while the tour is active", async () => {
    render(<App />);
    expect(root.style.overflow).toBe("");
    await startTour();
    expect(root.style.overflow).toBe("hidden");
  });

  it("compensates the scrollbar width with padding-right", async () => {
    vi.stubGlobal("innerWidth", 1015);
    Object.defineProperty(root, "clientWidth", {
      configurable: true,
      get: () => 1000,
    });
    root.style.paddingRight = "4px";
    render(<App />);
    await startTour();
    expect(root.style.paddingRight).toBe("19px");
    cleanup();
    expect(root.style.paddingRight).toBe("4px");
    // Remove the instance override so the prototype getter applies again.
    delete (root as { clientWidth?: number }).clientWidth;
  });

  it("restores the original styles after finish", async () => {
    root.style.overflow = "scroll";
    root.style.paddingRight = "3px";
    render(<App />);
    await startTour();
    expect(root.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(root.style.overflow).toBe("scroll");
    expect(root.style.paddingRight).toBe("3px");
  });

  it("restores the original styles after skip", async () => {
    render(<App />);
    await startTour();
    fireEvent.click(screen.getByRole("button", { name: "skip" }));
    expect(root.style.overflow).toBe("");
    expect(root.style.paddingRight).toBe("");
  });

  it("restores the original styles when unmounted mid-tour", async () => {
    root.style.overflow = "scroll";
    const view = render(<App />);
    await startTour();
    expect(root.style.overflow).toBe("hidden");
    view.unmount();
    expect(root.style.overflow).toBe("scroll");
  });

  it("leaves the document untouched with lockScroll false", async () => {
    root.style.overflow = "auto";
    render(<App lockScroll={false} />);
    await startTour();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(root.style.overflow).toBe("auto");
  });

  it("is safe under StrictMode", async () => {
    root.style.overflow = "scroll";
    const view = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await startTour();
    expect(root.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(root.style.overflow).toBe("scroll");
    view.unmount();
    expect(root.style.overflow).toBe("scroll");
  });
});
