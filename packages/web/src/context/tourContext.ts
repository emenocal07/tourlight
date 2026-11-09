import type { TourStorage } from "@emenocal07/tourlight-core";
import { createContext, type ReactNode } from "react";
import type { StepRegistry } from "../registry/stepRegistry";

export interface TourApi {
  start(): void;
  next(): void;
  prev(): void;
  skip(): void;
  finish(): void;
  isActive: boolean;
}

export interface TourProviderProps {
  children: ReactNode;
  storage?: TourStorage;
}

export interface TourContextValue {
  registry: StepRegistry;
  api: TourApi;
}

export const TourContext = createContext<TourContextValue | null>(null);
