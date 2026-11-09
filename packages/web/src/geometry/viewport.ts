import type { TourPlacement } from "../placement";

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// The part of the rect that is on screen. A target that is entirely off-screen is returned
// unchanged so callers never see a zero-sized or inverted rect.
export function clampToViewport(rect: DOMRect | Rect): Rect {
  const top = Math.max(rect.top, 0);
  const left = Math.max(rect.left, 0);
  const bottom = Math.min(rect.top + rect.height, window.innerHeight);
  const right = Math.min(rect.left + rect.width, window.innerWidth);
  if (bottom <= top || right <= left) return rect;
  return { top, left, width: right - left, height: bottom - top };
}

// True when the tooltip fits on neither side of the visible rect along the placement's axis:
// above/below for top and bottom placements, left/right for left and right ones.
export function shouldDock(
  visible: Rect,
  tooltip: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 12,
  placement: TourPlacement = "bottom",
): boolean {
  if (placement.startsWith("left") || placement.startsWith("right")) {
    const before = visible.left;
    const after = viewport.width - (visible.left + visible.width);
    const neededWidth = tooltip.width + gap;
    return before < neededWidth && after < neededWidth;
  }
  const above = visible.top;
  const below = viewport.height - (visible.top + visible.height);
  const needed = tooltip.height + gap;
  return above < needed && below < needed;
}
