import { useMemo } from "react";
import {
  type TourApi,
  TourContext,
  type TourProviderProps,
} from "../../context/tourContext";
import { createStepRegistry } from "../../registry/stepRegistry";

const inertApi: TourApi = {
  start() {},
  next() {},
  prev() {},
  skip() {},
  finish() {},
  isActive: false,
};

// Minimal placeholder: only provides context. Replaced by the real provider in Task 5.
export function TourProvider({ children }: TourProviderProps) {
  const value = useMemo(
    () => ({ registry: createStepRegistry(), api: inertApi }),
    [],
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
