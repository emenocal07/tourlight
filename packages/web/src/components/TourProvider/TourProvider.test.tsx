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
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTour } from "../../createTour";

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
