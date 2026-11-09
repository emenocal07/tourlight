import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import {
  type ReactElement,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { clampToViewport, shouldDock } from "../../geometry/viewport";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type { TourPlacement } from "../../placement";

export interface TooltipProps {
  target: HTMLElement;
  title: ReactNode;
  content: ReactNode;
  stepNumber: number;
  total: number;
  placement?: TourPlacement;
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

const DOCK_MARGIN = 16;

// The reference is the visible part of the target; contextElement keeps autoUpdate listening
// to the target's scroll ancestors.
function visibleReference(target: HTMLElement): VirtualElement {
  return {
    contextElement: target,
    getBoundingClientRect: () => {
      const { top, left, width, height } = clampToViewport(
        target.getBoundingClientRect(),
      );
      return {
        x: left,
        y: top,
        top,
        left,
        width,
        height,
        right: left + width,
        bottom: top + height,
      };
    },
  };
}

function updatePosition(
  target: HTMLElement,
  floating: HTMLElement,
  arrowEl: HTMLElement,
  placement: TourPlacement,
): Promise<void> {
  const reference = visibleReference(target);
  const visible = reference.getBoundingClientRect();
  const size = floating.getBoundingClientRect();
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  if (
    shouldDock(
      {
        top: visible.top,
        left: visible.left,
        width: visible.width,
        height: visible.height,
      },
      size,
      viewport,
      undefined,
      placement,
    )
  ) {
    floating.style.left = `${(viewport.width - size.width) / 2}px`;
    floating.style.top = `${viewport.height - DOCK_MARGIN - size.height}px`;
    floating.dataset.placement = "docked";
    return Promise.resolve();
  }
  return computePosition(reference, floating, {
    strategy: "fixed",
    placement,
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowEl, padding: 8 }),
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
  placement = "bottom",
  onNext,
  onPrev,
  onSkip,
}: TooltipProps): ReactElement {
  const floatingRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  const titleId = useId();
  const contentId = useId();
  useFocusTrap(floatingRef, true);

  // Layout effect: the tooltip must be positioned before the first paint.
  useLayoutEffect(() => {
    const floating = floatingRef.current;
    const arrowEl = arrowRef.current;
    if (!floating || !arrowEl) return;
    return autoUpdate(target, floating, () => {
      void updatePosition(target, floating, arrowEl, placement);
    });
  }, [target, placement]);

  return (
    <div
      ref={floatingRef}
      className="tourlight-tooltip"
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={contentId}
      tabIndex={-1}
    >
      <span className="tourlight-tooltip__badge" aria-hidden="true">
        {stepNumber}
      </span>
      <div className="tourlight-tooltip__bar" aria-hidden="true">
        <span
          className="tourlight-tooltip__bar-fill"
          style={{ width: `${(stepNumber / total) * 100}%` }}
        />
      </div>
      <div id={titleId} className="tourlight-tooltip__title">
        {title}
      </div>
      <div id={contentId} className="tourlight-tooltip__content">
        {content}
      </div>
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
