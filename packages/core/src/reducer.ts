import type { TourAction, TourState } from "./types";

export function createInitialState<Id extends string>(): TourState<Id> {
  return { status: "idle", steps: [], index: 0 };
}

export function tourReducer<Id extends string>(
  state: TourState<Id>,
  action: TourAction<Id>,
): TourState<Id> {
  if (action.type === "start") {
    if (action.available.length === 0) return state;
    return { status: "active", steps: [...action.available], index: 0 };
  }

  if (state.status !== "active") return state;

  switch (action.type) {
    case "next":
      if (state.index >= state.steps.length - 1)
        return { ...state, status: "completed" };
      return { ...state, index: state.index + 1 };
    case "prev":
      return { ...state, index: Math.max(0, state.index - 1) };
    case "skip":
      return { ...state, status: "skipped" };
    case "finish":
      return { ...state, status: "completed" };
    case "stepUnavailable": {
      const removed = state.steps.indexOf(action.id);
      if (removed === -1) return state;
      const steps = state.steps.filter((id) => id !== action.id);
      const index = removed < state.index ? state.index - 1 : state.index;
      if (index >= steps.length)
        return { ...state, steps, index, status: "completed" };
      return { ...state, steps, index };
    }
  }
}
