import { useEffect, useRef } from "react";

export interface TourKeyboardHandlers {
  onNext(): void;
  onPrev(): void;
  onClose(): void;
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}

export function useTourKeyboard(
  handlers: TourKeyboardHandlers,
  active: boolean,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        handlersRef.current.onClose();
        return;
      }
      // Arrow keys belong to the field while the user is typing.
      if (isEditable(event.target)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handlersRef.current.onNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlersRef.current.onPrev();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active]);
}
