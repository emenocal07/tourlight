import {
  cloneElement,
  type ReactElement,
  type Ref,
  useCallback,
  useContext,
  useRef,
} from "react";
import { TourContext } from "../../context/tourContext";

export interface TourStepProps {
  id: string;
  children: ReactElement;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    (ref as { current: T | null }).current = value;
  }
}

export function TourStep({ id, children }: TourStepProps): ReactElement {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("TourStep must be rendered inside its TourProvider");
  }
  const { registry } = ctx;
  // React 19 exposes the ref as a prop; React 18 on the element itself.
  const childRef =
    (children.props as { ref?: Ref<HTMLElement> }).ref ??
    (children as unknown as { ref?: Ref<HTMLElement> }).ref;
  const childRefRef = useRef(childRef);
  childRefRef.current = childRef;
  const nodeRef = useRef<HTMLElement | null>(null);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (nodeRef.current) {
        registry.unregister(id, nodeRef.current);
      }
      nodeRef.current = node;
      if (node) {
        registry.register(id, node);
      }
      assignRef(childRefRef.current, node);
    },
    [id, registry],
  );

  return cloneElement(children, { ref: setRef } as { ref: typeof setRef });
}
