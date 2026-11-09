import type { TourProgress, TourStorage } from "../types";

function emptyProgress(): TourProgress {
  return { shown: 0, completed: false };
}

export async function loadProgress(
  storage: TourStorage,
  key: string,
): Promise<TourProgress> {
  try {
    const raw = await storage.getItem(key);
    if (raw === null) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyProgress();
    const { shown, completed } = parsed as Partial<TourProgress>;
    return {
      shown:
        typeof shown === "number" && Number.isFinite(shown) && shown >= 0
          ? shown
          : 0,
      completed: completed === true,
    };
  } catch {
    return emptyProgress();
  }
}

async function persist(
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

export async function recordStart(
  storage: TourStorage,
  key: string,
  progress: TourProgress,
): Promise<TourProgress> {
  const next: TourProgress = { ...progress, shown: progress.shown + 1 };
  await persist(storage, key, next);
  return next;
}

export async function markFinished(
  storage: TourStorage,
  key: string,
  progress: TourProgress,
): Promise<TourProgress> {
  const next: TourProgress = { ...progress, completed: true };
  await persist(storage, key, next);
  return next;
}

export function shouldAutoStart(
  progress: TourProgress,
  maxShows: number,
): boolean {
  return !progress.completed && progress.shown < maxShows;
}
