import { orderSteps, validateConfig } from "@emenocal07/tourlight-core";
import {
  type ComponentType,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import { TourProvider as TourProviderImpl } from "./components/TourProvider/TourProvider";
import { TourStep as TourStepImpl } from "./components/TourStep/TourStep";
import {
  createTourContext,
  type TourApi,
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

export function createTour<const C extends Record<string, StepConfig>>(
  config: C,
  options?: TourOptions,
): TourInstance<keyof C & string> {
  type Id = keyof C & string;
  validateConfig(config);

  const context = createTourContext();
  const steps = orderSteps<Id>(config);
  const maxShows = options?.maxShows ?? 1;
  // Derived from the step ids so two different tours do not share progress by default.
  const storageKey = options?.storageKey ?? `tourlight:${steps.join(",")}`;

  // biome-ignore lint/correctness/noComponentHookFactories: createTour runs once at module scope; a distinct identity per call is the intended per-tour binding.
  function TourProvider({
    children,
    storage,
    variant,
    theme,
  }: TourProviderProps) {
    return (
      <TourProviderImpl
        context={context}
        steps={steps}
        configs={config}
        maxShows={maxShows}
        storageKey={storageKey}
        storage={storage}
        variant={variant}
        theme={theme}
      >
        {children}
      </TourProviderImpl>
    );
  }

  // biome-ignore lint/correctness/noComponentHookFactories: createTour runs once at module scope; a distinct identity per call is the intended per-tour binding.
  function TourStep({ id, children }: { id: Id; children: ReactElement }) {
    return (
      <TourStepImpl context={context} id={id}>
        {children}
      </TourStepImpl>
    );
  }

  // biome-ignore lint/correctness/noComponentHookFactories: createTour runs once at module scope; a distinct identity per call is the intended per-tour binding.
  function useTour(): TourApi {
    const ctx = useContext(context);
    if (!ctx) {
      throw new Error("useTour must be used inside its TourProvider");
    }
    return ctx.api;
  }

  return { TourProvider, TourStep, useTour };
}
