import { useEffect, useState } from "react";

// True while any scroll event (window or any scrollable ancestor) happened within the last quietMs.
export function useIsScrolling(quietMs = 120): boolean {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = false;
    const onScroll = (): void => {
      // Set state only on a real change: scroll fires every frame while scrolling.
      if (!active) {
        active = true;
        setScrolling(true);
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        active = false;
        setScrolling(false);
      }, quietMs);
    };
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      clearTimeout(timer);
    };
  }, [quietMs]);

  return scrolling;
}
