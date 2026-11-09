import {
  createInitialState,
  createLocalStorageAdapter,
  loadProgress,
  markFinished,
  recordStart,
  shouldAutoStart,
  type TourProgress,
  tourReducer,
} from "@emenocal07/tourlight-core";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  TourApi,
  TourContextType,
  TourContextValue,
  TourProviderProps,
} from "../../context/tourContext";
import { createStepRegistry } from "../../registry/stepRegistry";

export interface TourProviderImplProps<Id extends string>
  extends TourProviderProps {
  context: TourContextType;
  steps: readonly Id[];
  maxShows: number;
  storageKey: string;
}

function warnMissingStep(id: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[tourlight] Step "${id}" has no mounted element; skipping.`);
  }
}

export function TourProvider<Id extends string>({
  context: Context,
  steps,
  maxShows,
  storageKey,
  storage,
  children,
}: TourProviderImplProps<Id>): ReactElement {
  const [state, dispatch] = useReducer(
    tourReducer<Id>,
    createInitialState<Id>(),
  );
  const [registry] = useState(createStepRegistry);
  const [defaultStorage] = useState(createLocalStorageAdapter);
  const activeStorage = storage ?? defaultStorage;

  const storageRef = useRef(activeStorage);
  storageRef.current = activeStorage;
  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  // In-memory progress is authoritative; storage is a best-effort mirror.
  const progressRef = useRef<TourProgress>({ shown: 0, completed: false });
  const loadHandledRef = useRef(false);

  const start = useCallback(() => {
    if (statusRef.current === "active") return;
    const available = steps.filter((id) => {
      const mounted = registry.get(id) !== undefined;
      if (!mounted) warnMissingStep(id);
      return mounted;
    });
    if (available.length === 0) return;
    statusRef.current = "active";
    dispatch({ type: "start", available });
    const previous = progressRef.current;
    progressRef.current = { ...previous, shown: previous.shown + 1 };
    void recordStart(storageRef.current, storageKey, previous);
  }, [registry, steps, storageKey]);

  // StrictMode mounts, cleans up and re-mounts effects. The first load is cancelled by its
  // cleanup and ignored; only a load that resolves while mounted is handled, and only once
  // (loadHandledRef), so exactly one auto start is recorded. An unmount before the load
  // resolves cancels it: nothing starts and nothing is written.
  useEffect(() => {
    let cancelled = false;
    void loadProgress(activeStorage, storageKey).then((loaded) => {
      if (cancelled || loadHandledRef.current) return;
      loadHandledRef.current = true;
      // Merge with any manual start/finish that happened before the load resolved.
      const local = progressRef.current;
      const merged: TourProgress = {
        shown: loaded.shown + local.shown,
        completed: loaded.completed || local.completed,
      };
      progressRef.current = merged;
      if (statusRef.current === "idle" && shouldAutoStart(merged, maxShows)) {
        start();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeStorage, storageKey, maxShows, start]);

  useEffect(() => {
    if (state.status !== "completed" && state.status !== "skipped") return;
    const previous = progressRef.current;
    if (previous.completed) return;
    progressRef.current = { ...previous, completed: true };
    void markFinished(storageRef.current, storageKey, previous);
  }, [state.status, storageKey]);

  const currentId =
    state.status === "active" ? state.steps[state.index] : undefined;
  useEffect(() => {
    if (currentId !== undefined && registry.get(currentId) === undefined) {
      warnMissingStep(currentId);
      dispatch({ type: "stepUnavailable", id: currentId });
    }
  }, [currentId, registry]);

  const isActive = state.status === "active";
  const api = useMemo<TourApi>(
    () => ({
      start,
      next: () => dispatch({ type: "next" }),
      prev: () => dispatch({ type: "prev" }),
      skip: () => dispatch({ type: "skip" }),
      finish: () => dispatch({ type: "finish" }),
      isActive,
    }),
    [start, isActive],
  );
  const value = useMemo<TourContextValue>(
    () => ({ registry, api }),
    [registry, api],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
