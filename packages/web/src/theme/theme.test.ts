import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themeToCssVariables } from "./applyTheme";
import { contrastRatio } from "./contrast";
import { type TourTheme, type TourVariant, variantDefaults } from "./variants";

const css = readFileSync(
  `${import.meta.dirname}/../styles/tourlight.css`,
  "utf8",
);

const variants = Object.keys(variantDefaults) as TourVariant[];

describe("contrastRatio", () => {
  it("contrastRatio of black on white is 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("accepts 3 digit hex and is symmetric", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777", "#777")).toBeCloseTo(1, 5);
  });

  it("rejects non hex input", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow();
  });
});

describe("variant palettes", () => {
  it.each(variants)("%s text/surface pair has ratio >= 4.5", (variant) => {
    const { text, surface } = variantDefaults[variant];
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("every variant text/surface pair has ratio >= 4.5", () => {
    for (const variant of variants) {
      const { text, surface } = variantDefaults[variant];
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(variants)(
    "%s CSS block matches variantDefaults (single source)",
    (variant) => {
      const match = new RegExp(
        `\\[data-variant="${variant}"\\]\\s*\\{([^}]*)\\}`,
      ).exec(css);
      expect(match).not.toBeNull();
      const body = match?.[1] ?? "";
      const names: Record<keyof TourTheme, string> = {
        primary: "--tour-primary",
        surface: "--tour-surface",
        text: "--tour-text",
        radius: "--tour-radius",
        dim: "--tour-dim",
      };
      for (const key of Object.keys(names) as (keyof TourTheme)[]) {
        const declaration = new RegExp(`${names[key]}:\\s*([^;]+);`).exec(body);
        expect(declaration?.[1]?.trim(), `${variant} ${key}`).toBe(
          variantDefaults[variant][key],
        );
      }
    },
  );
});

describe("themeToCssVariables", () => {
  it("theme prop overrides only the given variables", () => {
    expect(themeToCssVariables({ primary: "#7c3aed" })).toEqual({
      "--tour-primary": "#7c3aed",
    });
  });

  it("maps every token to its variable", () => {
    expect(
      themeToCssVariables({
        primary: "a",
        surface: "b",
        text: "c",
        radius: "d",
        dim: "e",
      }),
    ).toEqual({
      "--tour-primary": "a",
      "--tour-surface": "b",
      "--tour-text": "c",
      "--tour-radius": "d",
      "--tour-dim": "e",
    });
  });

  it("returns nothing for an empty theme", () => {
    expect(themeToCssVariables({})).toEqual({});
  });
});
