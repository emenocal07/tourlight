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

export interface TourStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

export interface TourProgress {
  shown: number;
  completed: boolean;
}
