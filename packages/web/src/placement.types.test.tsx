import { describe, expect, it } from "vitest";
import { createTour, type TourPlacement } from "./index";

// These cases are checked by `npm run typecheck`; the runtime assertions are incidental.
describe("placement types", () => {
  it("accepts valid placements on a step and on the provider", () => {
    const { TourProvider } = createTour({
      a: { order: 1, title: "A", content: "A", placement: "top" },
    });
    const placement: TourPlacement = "left-end";
    const element = (
      <TourProvider placement={placement}>
        <span />
      </TourProvider>
    );
    expect(element).toBeDefined();
  });

  it("rejects invalid placements on a step", () => {
    createTour({
      // @ts-expect-error "middle" is not a TourPlacement
      a: { order: 1, title: "A", content: "A", placement: "middle" },
    });
  });

  it("rejects invalid placements on the provider", () => {
    const { TourProvider } = createTour({
      a: { order: 1, title: "A", content: "A" },
    });
    const element = (
      // @ts-expect-error "bottom-center" is not a TourPlacement
      <TourProvider placement="bottom-center">
        <span />
      </TourProvider>
    );
    expect(element).toBeDefined();
  });
});
