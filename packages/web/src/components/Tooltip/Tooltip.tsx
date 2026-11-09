import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";

export interface TooltipProps {
  target: HTMLElement;
  title: ReactNode;
  content: ReactNode;
  stepNumber: number;
  total: number;
  onNext(): void;
  onPrev(): void;
  onSkip(): void;
}

const OPPOSITE_SIDE: Record<string, string> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

function updatePosition(
  target: HTMLElement,
  floating: HTMLElement,
  arrowEl: HTMLElement,
): Promise<void> {
  return computePosition(target, floating, {
    strategy: "fixed",
    placement: "bottom",
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ],
  }).then(({ x, y, placement, middlewareData }) => {
    // The tooltip can unmount while the position is being computed.
    if (!floating.isConnected) return;
    floating.style.left = `${x}px`;
    floating.style.top = `${y}px`;
    floating.dataset.placement = placement;
    const side = OPPOSITE_SIDE[placement.split("-")[0] ?? "bottom"] ?? "top";
    const { x: arrowX, y: arrowY } = middlewareData.arrow ?? {};
    arrowEl.style.left = arrowX != null ? `${arrowX}px` : "";
    arrowEl.style.top = arrowY != null ? `${arrowY}px` : "";
    arrowEl.style.right = "";
    arrowEl.style.bottom = "";
    arrowEl.style[side as "top" | "right" | "bottom" | "left"] = "-4px";
  });
}

export function Tooltip({
  target,
  title,
  content,
  stepNumber,
  total,
  onNext,
  onPrev,
  onSkip,
}: TooltipProps): ReactElement {
  const floatingRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const floating = floatingRef.current;
    const arrowEl = arrowRef.current;
    if (!floating || !arrowEl) return;
    return autoUpdate(target, floating, () => {
      void updatePosition(target, floating, arrowEl);
    });
  }, [target]);

  return (
    <div ref={floatingRef} className="tourlight-tooltip">
      <div className="tourlight-tooltip__title">{title}</div>
      <div className="tourlight-tooltip__content">{content}</div>
      <div className="tourlight-tooltip__footer">
        <span className="tourlight-tooltip__progress">
          {`Step ${stepNumber} of ${total}`}
        </span>
        <div className="tourlight-tooltip__actions">
          <button type="button" onClick={onSkip}>
            Skip
          </button>
          <button type="button" onClick={onPrev} disabled={stepNumber <= 1}>
            Back
          </button>
          <button type="button" onClick={onNext}>
            Next
          </button>
        </div>
      </div>
      <div ref={arrowRef} className="tourlight-tooltip__arrow" />
    </div>
  );
}
