import { useEffect, useState } from "react";

// A target that is detached, display: none or zero-sized cannot be highlighted.
function measure(el: HTMLElement): DOMRect | null {
  if (!el.isConnected) return null;
  if (getComputedStyle(el).display === "none") return null;
  const rect = el.getBoundingClientRect();
  return rect.width === 0 || rect.height === 0 ? null : rect;
}

function sameRect(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function useTargetRect(el: HTMLElement | undefined): DOMRect | null {
  const [measured, setMeasured] = useState<{
    el: HTMLElement | undefined;
    rect: DOMRect | null;
  }>(() => ({ el, rect: el ? measure(el) : null }));

  useEffect(() => {
    if (!el) {
      setMeasured({ el, rect: null });
      return;
    }
    const update = (): void => {
      const next = measure(el);
      setMeasured((previous) =>
        previous.el === el && sameRect(previous.rect, next)
          ? previous
          : { el, rect: next },
      );
    };

    el.scrollIntoView({ block: "center", inline: "nearest" });
    update();

    // The observer also fires when the element is removed, which is how an unmount is noticed.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // Capture so scrolling any ancestor container updates the rect, not only the window.
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [el]);

  // After the target changes, the stored rect belongs to the previous element until the effect runs.
  if (measured.el !== el) return el ? measure(el) : null;
  return measured.rect;
}
