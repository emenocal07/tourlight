import type { CSSProperties, ReactElement } from "react";

export interface BlockersProps {
  rect: DOMRect;
  interactive: boolean;
}

function Blocker({ style }: { style: CSSProperties }): ReactElement {
  return (
    <div
      className="tourlight-blocker"
      data-testid="tourlight-blocker"
      style={style}
    />
  );
}

// Transparent click shields. Interactive steps leave a hole at the target so clicks reach it;
// otherwise a single shield covers the viewport. They have no handlers: a click never advances the tour.
export function Blockers({ rect, interactive }: BlockersProps): ReactElement {
  if (!interactive) {
    return <Blocker style={{ top: 0, left: 0, right: 0, bottom: 0 }} />;
  }
  const top = Math.max(0, rect.top);
  const left = Math.max(0, rect.left);
  const height = Math.max(0, rect.bottom - top);
  return (
    <>
      <Blocker style={{ top: 0, left: 0, right: 0, height: top }} />
      <Blocker style={{ top: rect.bottom, left: 0, right: 0, bottom: 0 }} />
      <Blocker style={{ top, left: 0, width: left, height }} />
      <Blocker style={{ top, left: rect.right, right: 0, height }} />
    </>
  );
}
