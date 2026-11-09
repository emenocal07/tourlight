import { render } from "@testing-library/react";
import { createRef, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TourStep } from "./components/TourStep/TourStep";
import { createTourContext } from "./context/tourContext";
import { createTour } from "./createTour";
import { createStepRegistry } from "./registry/stepRegistry";

describe("createTour", () => {
  it("createTour throws on empty config", () => {
    expect(() => createTour({})).toThrow();
  });

  it("TourStep injects the ref into its single child without adding a DOM node", () => {
    const { TourProvider, TourStep } = createTour({
      a: { order: 1, title: "A", content: "Step A" },
    });
    const childRef = createRef<HTMLButtonElement>();
    const { container } = render(
      <TourProvider>
        <TourStep id="a">
          <button type="button" ref={childRef}>
            go
          </button>
        </TourStep>
      </TourProvider>,
    );
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(childRef.current);
    expect(container.firstElementChild?.tagName).toBe("BUTTON");
  });

  it("rejects unknown step ids at compile time", () => {
    const { TourStep } = createTour({
      a: { order: 1, title: "A", content: "Step A" },
    });
    // @ts-expect-error unknown step id must not compile
    const element = <TourStep id="nope">{<span />}</TourStep>;
    expect(element).toBeDefined();
  });
});

describe("TourStep ref merging", () => {
  function setup() {
    const registry = createStepRegistry();
    const TourContext = createTourContext();
    const wrap = (child: ReactElement) => (
      <TourContext.Provider
        value={{
          registry,
          api: {
            start() {},
            next() {},
            prev() {},
            skip() {},
            finish() {},
            isActive: false,
          },
        }}
      >
        <TourStep context={TourContext} id="a">
          {child}
        </TourStep>
      </TourContext.Provider>
    );
    return { registry, wrap };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls a child callback ref and still registers the element", () => {
    const { registry, wrap } = setup();
    const callback = vi.fn();
    const { container } = render(wrap(<button type="button" ref={callback} />));
    expect(callback).toHaveBeenCalledWith(container.firstElementChild);
    expect(registry.get("a")).toBe(container.firstElementChild);
  });

  it("registers a child without a ref and emits no console output", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { registry, wrap } = setup();
    const { container } = render(wrap(<button type="button" />));
    expect(registry.get("a")).toBe(container.firstElementChild);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("preserves the child's other props", () => {
    const { wrap } = setup();
    const { container } = render(
      wrap(
        <button type="button" className="x" data-foo="bar">
          go
        </button>,
      ),
    );
    const el = container.firstElementChild;
    expect(el?.className).toBe("x");
    expect(el?.getAttribute("data-foo")).toBe("bar");
    expect(el?.textContent).toBe("go");
  });

  it("unregisters on unmount", () => {
    const { registry, wrap } = setup();
    const { unmount } = render(wrap(<button type="button" />));
    expect(registry.get("a")).toBeDefined();
    unmount();
    expect(registry.get("a")).toBeUndefined();
  });
});
