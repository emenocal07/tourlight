import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { createTour } from "./createTour";

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
