import { validateConfig } from "@emenocal07/tourlight-core";
import {
  type ComponentType,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import { TourProvider } from "./components/TourProvider/TourProvider";
import { TourStep as TourStepImpl } from "./components/TourStep/TourStep";
import {
  type TourApi,
  TourContext,
  type TourProviderProps,
} from "./context/tourContext";

export interface StepConfig {
  order: number;
  title: ReactNode;
  content: ReactNode;
  interactive?: boolean;
}

export interface TourOptions {
  maxShows?: number;
  storageKey?: string;
}

export interface TourInstance<Id extends string> {
  TourProvider: ComponentType<TourProviderProps>;
  TourStep: ComponentType<{ id: Id; children: ReactElement }>;
  useTour: () => TourApi;
}

function useTour(): TourApi {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used inside its TourProvider");
  }
  return ctx.api;
}

export function createTour<const C extends Record<string, StepConfig>>(
  config: C,
  _options?: TourOptions,
): TourInstance<keyof C & string> {
  validateConfig(config);

  return {
    TourProvider,
    TourStep: TourStepImpl,
    useTour,
  };
}
