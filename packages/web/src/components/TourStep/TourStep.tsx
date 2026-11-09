import {
  cloneElement,
  type ReactElement,
  type Ref,
  useCallback,
  useContext,
  useRef,
  version,
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

const isReact19OrLater = Number.parseInt(version, 10) >= 19;

// React 19 exposes the ref as a prop and warns on element.ref; React 18 only has element.ref.
function readChildRef(child: ReactElement): Ref<HTMLElement> | undefined {
  if (isReact19OrLater) {
    return (child.props as { ref?: Ref<HTMLElement> }).ref;
  }
  return (child as unknown as { ref?: Ref<HTMLElement> }).ref;
}

export function TourStep({ id, children }: TourStepProps): ReactElement {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("TourStep must be rendered inside its TourProvider");
  }
  const { registry } = ctx;
  const childRef = readChildRef(children);
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
