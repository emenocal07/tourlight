import { useEffect } from "react";

// Hides the page scrollbar while active. Programmatic scrolling (scrollIntoView) still works.
// The previous inline values are captured per activation and restored exactly, so a StrictMode
// re-run never records "hidden" as the original value.
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPaddingRight = root.style.paddingRight;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    if (scrollbarWidth > 0) {
      const current = Number.parseFloat(getComputedStyle(root).paddingRight);
      root.style.paddingRight = `${(Number.isNaN(current) ? 0 : current) + scrollbarWidth}px`;
    }
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}
