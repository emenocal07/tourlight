import { describe, expect, it } from "vitest";
import { createInitialState, tourReducer } from "./reducer";
import type { TourState } from "./types";

type Id = "a" | "b" | "c";

const active = (
  index: number,
  steps: readonly Id[] = ["a", "b", "c"],
): TourState<Id> => ({
  status: "active",
  steps,
  index,
});

describe("tourReducer", () => {
  it("start with no available steps stays idle", () => {
    const state = tourReducer(createInitialState<Id>(), {
      type: "start",
      available: [],
    });
    expect(state.status).toBe("idle");
  });

  it("start keeps only available steps, in the given order", () => {
    const state = tourReducer(createInitialState<Id>(), {
      type: "start",
      available: ["c", "a"],
    });
    expect(state).toEqual({ status: "active", steps: ["c", "a"], index: 0 });
  });

  it("next on the last step completes", () => {
    expect(tourReducer(active(2), { type: "next" }).status).toBe("completed");
  });

  it("prev on the first step stays at index 0", () => {
    const state = tourReducer(active(0), { type: "prev" });
    expect(state.index).toBe(0);
    expect(state.status).toBe("active");
  });

  it("skip sets status skipped", () => {
    expect(tourReducer(active(1), { type: "skip" }).status).toBe("skipped");
  });

  it("finish sets status completed", () => {
    expect(tourReducer(active(1), { type: "finish" }).status).toBe("completed");
  });

  it("stepUnavailable on the current step advances without skipping a step", () => {
    const input = active(0);
    const state = tourReducer(input, { type: "stepUnavailable", id: "a" });
    expect(state).toEqual({ status: "active", steps: ["b", "c"], index: 0 });
    expect(input.steps).toEqual(["a", "b", "c"]);
  });

  it("stepUnavailable on the last step completes", () => {
    const state = tourReducer(active(2), { type: "stepUnavailable", id: "c" });
    expect(state.status).toBe("completed");
  });

  it("next when idle is a no-op", () => {
    const initial = createInitialState<Id>();
    expect(tourReducer(initial, { type: "next" })).toEqual(initial);
  });
});
