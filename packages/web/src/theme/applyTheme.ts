import type { TourTheme } from "./variants";

const VARIABLE_NAMES: Record<keyof TourTheme, string> = {
  primary: "--tour-primary",
  surface: "--tour-surface",
  text: "--tour-text",
  radius: "--tour-radius",
  dim: "--tour-dim",
};

// Only the keys the user actually passed are emitted, so variant defaults stay in CSS.
export function themeToCssVariables(
  theme: Partial<TourTheme>,
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const key of Object.keys(VARIABLE_NAMES) as (keyof TourTheme)[]) {
    const value = theme[key];
    if (value !== undefined) variables[VARIABLE_NAMES[key]] = value;
  }
  return variables;
}
