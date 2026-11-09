import type { Placement } from "@floating-ui/dom";

export type TourPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

// Compile-time guard: fails to typecheck if TourPlacement ever drifts from floating-ui's Placement.
export type AssertPlacementCompatible = TourPlacement extends Placement
  ? true
  : never;
export const placementCompatible: AssertPlacementCompatible = true;
