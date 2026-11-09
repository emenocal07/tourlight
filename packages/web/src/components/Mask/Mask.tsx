import type { ReactElement } from "react";
import type { Rect } from "../../geometry/viewport";

export interface MaskProps {
  rect: DOMRect | Rect;
  padding?: number;
  scrolling?: boolean;
}

export function Mask({
  rect,
  padding = 4,
  scrolling = false,
}: MaskProps): ReactElement {
  return (
    <div
      className="tourlight-mask"
      data-testid="tourlight-mask"
      data-scrolling={scrolling ? "true" : undefined}
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
    />
  );
}
