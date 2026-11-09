import type { TourStorage } from "@emenocal07/tourlight-core";
import { type Context, createContext, type ReactNode } from "react";
import type { StepRegistry } from "../registry/stepRegistry";
import type { TourTheme, TourVariant } from "../theme/variants";

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
  variant?: TourVariant;
  theme?: Partial<TourTheme>;
}

export interface TourContextValue {
  registry: StepRegistry;
  api: TourApi;
}

export type TourContextType = Context<TourContextValue | null>;

// One context per createTour call, so components of different tours never bind to each other.
export function createTourContext(): TourContextType {
  return createContext<TourContextValue | null>(null);
}
