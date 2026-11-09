import {
  createInitialState,
  createLocalStorageAdapter,
  loadProgress,
  markFinished,
  recordStart,
  shouldAutoStart,
  type TourProgress,
  type TourStorage,
  tourReducer,
} from "@emenocal07/tourlight-core";
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  TourApi,
  TourContextType,
  TourContextValue,
  TourProviderProps,
} from "../../context/tourContext";
import { clampToViewport } from "../../geometry/viewport";
import { useIsScrolling } from "../../hooks/useIsScrolling";
import { useScrollLock } from "../../hooks/useScrollLock";
import { measure, useTargetRect } from "../../hooks/useTargetRect";
import { useTourKeyboard } from "../../hooks/useTourKeyboard";
import type { TourPlacement } from "../../placement";
import { createStepRegistry } from "../../registry/stepRegistry";
import { themeToCssVariables } from "../../theme/applyTheme";
import { Blockers } from "../Blockers/Blockers";
import { Mask } from "../Mask/Mask";
import { Tooltip } from "../Tooltip/Tooltip";

export interface StepContent {
  title: ReactNode;
  content: ReactNode;
  interactive?: boolean;
  placement?: TourPlacement;
}

export interface TourProviderImplProps<Id extends string>
  extends TourProviderProps {
  context: TourContextType;
  steps: readonly Id[];
  configs: Readonly<Record<Id, StepContent>>;
  maxShows: number;
  storageKey: string;
}

async function saveProgress(
  storage: TourStorage,
  key: string,
  progress: TourProgress,
): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(progress));
  } catch {
    // Write failures are swallowed: the in-memory progress stays authoritative.
  }
}

function warnMissingStep(id: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[tourlight] Step "${id}" has no mounted element; skipping.`);
  }
}

// Mounted as soon as the tour is active and filled after mount, so the first message is a
// change inside an existing live region and is read by screen readers.
function LiveRegion({ message }: { message: string }): ReactElement {
  const [text, setText] = useState("");
  useEffect(() => setText(message), [message]);
  return (
    <div className="tourlight-sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}

interface OverlayProps {
  target: HTMLElement;
  title: ReactNode;
  content: ReactNode;
  stepNumber: number;
  total: number;
  interactive: boolean;
  placement: TourPlacement;
  onNext(): void;
  onPrev(): void;
  onSkip(): void;
  onUnavailable(): void;
}

function Overlay({
  onUnavailable,
  interactive,
  ...tooltip
}: OverlayProps): ReactElement | null {
  const rect = useTargetRect(tooltip.target);
  const scrolling = useIsScrolling();
  // A null rect means the target is detached, hidden or zero-sized.
  useEffect(() => {
    if (rect === null) onUnavailable();
  }, [rect, onUnavailable]);
  if (rect === null) return null;
  // The raw rect decides availability; everything drawn uses only the part that is on screen.
  const visible = clampToViewport(rect);
  return (
    <>
      <Blockers rect={visible} interactive={interactive} />
      <Mask rect={visible} scrolling={scrolling} />
      <Tooltip {...tooltip} />
    </>
  );
}

export function TourProvider<Id extends string>({
  context: Context,
  steps,
  configs,
  maxShows,
  storageKey,
  storage,
  variant = "minimal",
  theme,
  lockScroll = true,
  placement: defaultPlacement = "bottom",
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
      const element = registry.get(id);
      if (element === undefined) {
        warnMissingStep(id);
        return false;
      }
      // A mounted but hidden or zero-sized target (e.g. a responsive layout) is not a visible step.
      return measure(element) !== null;
    });
    if (available.length === 0) return;
    statusRef.current = "active";
    dispatch({ type: "start", available });
    const previous = progressRef.current;
    progressRef.current = { ...previous, shown: previous.shown + 1 };
    // Before the stored progress is loaded, only count in memory: writing now would overwrite it.
    if (loadHandledRef.current) {
      void recordStart(storageRef.current, storageKey, previous);
    }
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
      // progressRef holds only the starts/finish that happened before the load (none were
      // written), so adding them to the stored progress counts each exactly once.
      const local = progressRef.current;
      const merged: TourProgress = {
        shown: loaded.shown + local.shown,
        completed: loaded.completed || local.completed,
      };
      progressRef.current = merged;
      if (
        merged.shown !== loaded.shown ||
        merged.completed !== loaded.completed
      ) {
        void saveProgress(activeStorage, storageKey, merged);
      }
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
    if (loadHandledRef.current) {
      void markFinished(storageRef.current, storageKey, previous);
    }
  }, [state.status, storageKey]);

  // The overlay renders only after hydration: nothing may be portaled during server render.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const currentId =
    state.status === "active" ? state.steps[state.index] : undefined;
  const currentElement =
    currentId === undefined ? undefined : registry.get(currentId);
  // A tour that runs out of available steps mid-tour ends as completed, by design.
  // Runs after every render: the registry is not reactive, so an unmounted step is only seen here.
  useEffect(() => {
    if (currentId !== undefined && registry.get(currentId) === undefined) {
      warnMissingStep(currentId);
      dispatch({ type: "stepUnavailable", id: currentId });
    }
  });
  const onUnavailable = useCallback(() => {
    if (currentId !== undefined) {
      dispatch({ type: "stepUnavailable", id: currentId });
    }
  }, [currentId]);

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

  useScrollLock(lockScroll && isActive);

  useTourKeyboard(
    { onNext: api.next, onPrev: api.prev, onClose: api.skip },
    isActive,
  );

  const current =
    currentId === undefined ? undefined : configs[currentId as Id];
  return (
    <Context.Provider value={value}>
      {children}
      {hydrated && isActive
        ? createPortal(
            <div
              className="tourlight-root"
              data-variant={variant}
              // Custom properties are valid inline styles but are not part of CSSProperties.
              style={themeToCssVariables(theme ?? {}) as CSSProperties}
            >
              <LiveRegion
                message={`Now on step ${state.index + 1} of ${state.steps.length}${
                  typeof current?.title === "string" ? `: ${current.title}` : ""
                }`}
              />
              {currentElement && current ? (
                <Overlay
                  target={currentElement}
                  title={current.title}
                  content={current.content}
                  stepNumber={state.index + 1}
                  total={state.steps.length}
                  interactive={current.interactive === true}
                  placement={current.placement ?? defaultPlacement}
                  onNext={api.next}
                  onPrev={api.prev}
                  onSkip={api.skip}
                  onUnavailable={onUnavailable}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </Context.Provider>
  );
}
