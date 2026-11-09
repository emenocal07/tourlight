import type { ReactElement } from "react";

export interface MaskProps {
  rect: DOMRect;
  padding?: number;
}

export function Mask({ rect, padding = 4 }: MaskProps): ReactElement {
  return (
    <div
      className="tourlight-mask"
      data-testid="tourlight-mask"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
    />
  );
}
