export type TourStatus = "idle" | "active" | "completed" | "skipped";

export interface TourState<Id extends string> {
  status: TourStatus;
  steps: readonly Id[];
  index: number;
}

export type TourAction<Id extends string> =
  | { type: "start"; available: readonly Id[] }
  | { type: "next" }
  | { type: "prev" }
  | { type: "skip" }
  | { type: "finish" }
  | { type: "stepUnavailable"; id: Id };
