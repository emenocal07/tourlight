export type TourVariant = "glass" | "minimal" | "bold";

export interface TourTheme {
  primary: string;
  surface: string;
  text: string;
  radius: string;
  dim: string;
}

// Mirrored by the [data-variant] blocks in styles/tourlight.css (guarded by a test).
// surface and text are opaque hex so their contrast can be checked; translucency is CSS only.
export const variantDefaults: Record<TourVariant, TourTheme> = {
  glass: {
    primary: "#5b7cff",
    surface: "#151a2e",
    text: "#f1f4ff",
    radius: "14px",
    dim: "rgba(6, 9, 22, 0.72)",
  },
  minimal: {
    primary: "#111827",
    surface: "#ffffff",
    text: "#1f2937",
    radius: "6px",
    dim: "rgba(226, 232, 240, 0.7)",
  },
  bold: {
    primary: "#ffd60a",
    surface: "#c81e4a",
    text: "#ffffff",
    radius: "16px",
    dim: "rgba(30, 10, 50, 0.7)",
  },
};
