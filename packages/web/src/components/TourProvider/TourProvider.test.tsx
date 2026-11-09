import {
  createMemoryStorage,
  type TourProgress,
  type TourStorage,
} from "@emenocal07/tourlight-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTour } from "../../createTour";
import { triggerResize } from "../../test/resizeObserver";

const KEY = "test-tour";

const config = {
  a: { order: 1, title: "A", content: "Step A" },
  b: { order: 2, title: "B", content: "Step B" },
  c: { order: 3, title: "C", content: "Step C" },
};

type Tour = ReturnType<typeof createTour<typeof config>>;

function makeTour(maxShows = 1): Tour {
  return createTour(config, { maxShows, storageKey: KEY });
}

function Controls({ tour }: { tour: Tour }) {
  const api = tour.useTour();
  return (
    <div>
      <span data-testid="status">{api.isActive ? "active" : "inactive"}</span>
      <button type="button" onClick={api.start}>
        start
      </button>
      <button type="button" onClick={api.next}>
        next
      </button>
      <button type="button" onClick={api.skip}>
        skip
      </button>
      <button type="button" onClick={api.finish}>
        finish
      </button>
    </div>
  );
}

function App({
  tour,
  storage,
  mounted = ["a", "b", "c"],
}: {
  tour: Tour;
  storage: TourStorage;
  mounted?: readonly ("a" | "b" | "c")[];
}) {
  const { TourProvider, TourStep } = tour;
  return (
    <TourProvider storage={storage}>
      {mounted.map((id) => (
        <TourStep key={id} id={id}>
          <div>{`target ${id}`}</div>
        </TourStep>
      ))}
      <Controls tour={tour} />
    </TourProvider>
  );
}

function StartOnMount({ tour }: { tour: Tour }) {
  const { start } = tour.useTour();
  useEffect(() => {
    start();
  }, [start]);
  return null;
}

function renderWithStartOnMount(tour: Tour, storage: TourStorage): void {
  const { TourProvider, TourStep } = tour;
  render(
    <TourProvider storage={storage}>
      <TourStep id="a">
        <div>target a</div>
      </TourStep>
      <StartOnMount tour={tour} />
      <Controls tour={tour} />
    </TourProvider>,
  );
}

function readProgress(storage: TourStorage, key = KEY): TourProgress | null {
  const raw = storage.getItem(key);
  if (typeof raw !== "string") return null;
  return JSON.parse(raw) as TourProgress;
}

function status(): string | null {
  return screen.getByTestId("status").textContent;
}

async function flush(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

function click(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

const tourA = createTour({ a: { order: 1, title: "A", content: "A" } });
const tourB = createTour({ b: { order: 1, title: "B", content: "B" } });
const tourDisplay = createTour({
  a: { order: 1, title: "First", content: "First content" },
  b: { order: 2, title: "Second", content: "Second content" },
});

function UseA() {
  tourA.useTour();
  return null;
}

function BothStatus() {
  const a = tourA.useTour();
  const b = tourB.useTour();
  return (
    <span data-testid="status">
      {`${a.isActive ? "A on" : "A off"} ${b.isActive ? "B on" : "B off"}`}
    </span>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TourProvider", () => {
  it("auto starts once when below maxShows", async () => {
    const storage = createMemoryStorage();
    render(<App tour={makeTour(2)} storage={storage} />);
    await flush();
    expect(status()).toBe("active");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: false });
  });

  it("does not auto start when completed", async () => {
    const storage = createMemoryStorage({
      [KEY]: JSON.stringify({ shown: 0, completed: true }),
    });
    render(<App tour={makeTour(5)} storage={storage} />);
    await flush();
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 0, completed: true });
  });

  it("does not auto start when shown reached maxShows", async () => {
    const storage = createMemoryStorage({
      [KEY]: JSON.stringify({ shown: 2, completed: false }),
    });
    render(<App tour={makeTour(2)} storage={storage} />);
    await flush();
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 2, completed: false });
  });

  it("start increments shown exactly once under StrictMode (Review Focus 1)", async () => {
    const storage = createMemoryStorage();
    render(
      <StrictMode>
        <App tour={makeTour(3)} storage={storage} />
      </StrictMode>,
    );
    await flush();
    await flush();
    expect(status()).toBe("active");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: false });
  });

  it("finish persists completed and the tour never reappears", async () => {
    const storage = createMemoryStorage();
    const tour = makeTour(5);
    const first = render(<App tour={tour} storage={storage} />);
    await flush();
    expect(status()).toBe("active");
    click("finish");
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: true });
    first.unmount();

    render(<App tour={tour} storage={storage} />);
    await flush();
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: true });
  });

  it("skip persists completed", async () => {
    const storage = createMemoryStorage();
    render(<App tour={makeTour(5)} storage={storage} />);
    await flush();
    click("skip");
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: true });
  });

  it("completing the last step with next persists completed", async () => {
    const storage = createMemoryStorage();
    render(<App tour={makeTour(5)} storage={storage} />);
    await flush();
    click("next");
    click("next");
    expect(status()).toBe("active");
    click("next");
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: true });
  });

  it("a start before the load resolves keeps a stored completion", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage({
      [KEY]: JSON.stringify({ shown: 1, completed: true }),
    });
    renderWithStartOnMount(makeTour(5), storage);
    await flush();
    expect(status()).toBe("active");
    expect(readProgress(storage)).toEqual({ shown: 2, completed: true });
  });

  it("a start before the load resolves adds to the stored shown count", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage({
      [KEY]: JSON.stringify({ shown: 2, completed: false }),
    });
    renderWithStartOnMount(makeTour(5), storage);
    await flush();
    expect(status()).toBe("active");
    expect(readProgress(storage)).toEqual({ shown: 3, completed: false });
  });

  it("async storage resolving after unmount does not start (Review Focus 4)", async () => {
    const error = vi.spyOn(console, "error");
    // A load handled after unmount would try to start and warn about unmounted steps.
    const warn = vi.spyOn(console, "warn");
    let resolveGet: (value: string | null) => void = () => {};
    const setItem = vi.fn();
    const storage: TourStorage = {
      getItem: () =>
        new Promise<string | null>((resolve) => {
          resolveGet = resolve;
        }),
      setItem,
    };
    const { unmount } = render(<App tour={makeTour()} storage={storage} />);
    unmount();
    resolveGet(null);
    await flush();
    expect(setItem).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("rejecting storage still lets a manual start work", async () => {
    const storage: TourStorage = {
      getItem: () => Promise.reject(new Error("read failed")),
      setItem: () => Promise.reject(new Error("write failed")),
    };
    render(<App tour={makeTour()} storage={storage} />);
    await flush();
    expect(status()).toBe("active");
    click("skip");
    expect(status()).toBe("inactive");
    click("start");
    expect(status()).toBe("active");
    await flush();
  });

  it("steps without a mounted element are skipped", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    render(<App tour={makeTour()} storage={storage} mounted={["a", "c"]} />);
    await flush();
    expect(status()).toBe("active");
    click("next");
    expect(status()).toBe("active");
    click("next");
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toEqual({ shown: 1, completed: true });
  });

  it("a step unmounted mid-tour is skipped", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    const tour = makeTour();
    const { rerender } = render(<App tour={tour} storage={storage} />);
    await flush();
    expect(status()).toBe("active");
    rerender(<App tour={tour} storage={storage} mounted={["a", "c"]} />);
    click("next");
    expect(status()).toBe("active");
    click("next");
    expect(status()).toBe("inactive");
  });

  it("tour does not start when no step is mounted", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    render(<App tour={makeTour()} storage={storage} mounted={[]} />);
    await flush();
    expect(status()).toBe("inactive");
    click("start");
    expect(status()).toBe("inactive");
    expect(readProgress(storage)).toBeNull();
  });

  it("useTour outside provider throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tour = makeTour();
    expect(() => render(<Controls tour={tour} />)).toThrow(
      /useTour must be used inside its TourProvider/,
    );
  });

  it("two createTour instances in one tree do not collide", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <tourB.TourProvider storage={createMemoryStorage()}>
          <tourA.TourStep id="a">
            <div />
          </tourA.TourStep>
        </tourB.TourProvider>,
      ),
    ).toThrow(/TourStep must be rendered inside its TourProvider/);
    cleanup();

    expect(() =>
      render(
        <tourB.TourProvider storage={createMemoryStorage()}>
          <UseA />
        </tourB.TourProvider>,
      ),
    ).toThrow(/useTour must be used inside its TourProvider/);
    cleanup();

    const memory = createMemoryStorage();
    const writtenKeys = new Set<string>();
    const shared: TourStorage = {
      getItem: (key) => memory.getItem(key),
      setItem: (key, value) => {
        writtenKeys.add(key);
        return memory.setItem(key, value);
      },
    };
    render(
      <tourA.TourProvider storage={shared}>
        <tourB.TourProvider storage={shared}>
          <tourA.TourStep id="a">
            <div />
          </tourA.TourStep>
          <tourB.TourStep id="b">
            <div />
          </tourB.TourStep>
          <BothStatus />
        </tourB.TourProvider>
      </tourA.TourProvider>,
    );
    await flush();
    expect(status()).toBe("A on B on");
    // Default storage keys are derived from each config, so progress is not shared.
    expect(writtenKeys.size).toBe(2);
  });
});

describe("TourProvider overlay", () => {
  const mask = (): HTMLElement | null => screen.queryByTestId("tourlight-mask");

  it("renders nothing when the tour is idle", async () => {
    const storage = createMemoryStorage({
      [KEY]: JSON.stringify({ shown: 0, completed: true }),
    });
    render(<App tour={makeTour(5)} storage={storage} />);
    await flush();
    expect(status()).toBe("inactive");
    expect(mask()).toBeNull();
    expect(screen.queryByText("Step 1 of 3")).toBeNull();
  });

  it('renders title, content and "Step 1 of 3" when active', async () => {
    render(<App tour={makeTour()} storage={createMemoryStorage()} />);
    await flush();
    expect(status()).toBe("active");
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("Step A")).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    expect(mask()).not.toBeNull();
    expect(mask()?.parentElement?.parentElement).toBe(document.body);
  });

  it("renders nothing once the tour is completed", async () => {
    render(<App tour={makeTour()} storage={createMemoryStorage()} />);
    await flush();
    click("finish");
    expect(mask()).toBeNull();
    expect(screen.queryByText("Step 1 of 3")).toBeNull();
  });

  it("the Next button of the tooltip advances the tour", async () => {
    render(<App tour={makeTour()} storage={createMemoryStorage()} />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(screen.getByText("Step B")).toBeTruthy();
  });

  it("portal is not rendered during server render", () => {
    const { TourProvider, TourStep } = makeTour();
    const html = renderToString(
      <TourProvider storage={createMemoryStorage()}>
        <TourStep id="a">
          <div>target a</div>
        </TourStep>
      </TourProvider>,
    );
    expect(html).toContain("target a");
    expect(html).not.toContain("tourlight");
    expect(html).not.toContain("Step 1 of");
  });

  it("zero-sized target is treated as unavailable and skipped (Review Focus 2)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return this.textContent === "target a"
          ? new DOMRect(0, 0, 0, 0)
          : new DOMRect(10, 20, 100, 40);
      },
    );
    render(<App tour={makeTour()} storage={createMemoryStorage()} />);
    await flush();
    expect(status()).toBe("active");
    expect(screen.getByText("Step B")).toBeTruthy();
    expect(screen.getByText("Step 1 of 2")).toBeTruthy();
  });

  it("a display none target is treated as unavailable and skipped", async () => {
    render(
      <tourDisplay.TourProvider storage={createMemoryStorage()}>
        <tourDisplay.TourStep id="a">
          <div style={{ display: "none" }}>hidden</div>
        </tourDisplay.TourStep>
        <tourDisplay.TourStep id="b">
          <div>visible</div>
        </tourDisplay.TourStep>
      </tourDisplay.TourProvider>,
    );
    await flush();
    expect(screen.getByText("Step 1 of 1")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("an active step that unmounts is skipped when its size change is observed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const tour = makeTour();
    const storage = createMemoryStorage();
    const { rerender } = render(<App tour={tour} storage={storage} />);
    await flush();
    expect(screen.getByText("Step A")).toBeTruthy();
    rerender(<App tour={tour} storage={storage} mounted={["b", "c"]} />);
    act(() => triggerResize());
    expect(screen.getByText("Step B")).toBeTruthy();
    expect(screen.getByText("Step 1 of 2")).toBeTruthy();
  });

  it("start while already active is a no-op", async () => {
    const storage = createMemoryStorage();
    render(<App tour={makeTour(5)} storage={storage} />);
    await flush();
    click("next");
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    click("start");
    await flush();
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(readProgress(storage)).toEqual({ shown: 1, completed: false });
  });

  it("start from a mount effect under StrictMode counts a single show", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    const tour = makeTour(5);
    const { TourProvider, TourStep } = tour;
    render(
      <StrictMode>
        <TourProvider storage={storage}>
          <TourStep id="a">
            <div>target a</div>
          </TourStep>
          <StartOnMount tour={tour} />
        </TourProvider>
      </StrictMode>,
    );
    await flush();
    await flush();
    expect(readProgress(storage)).toEqual({ shown: 1, completed: false });
  });
});
