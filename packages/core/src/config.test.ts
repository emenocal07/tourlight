import { describe, expect, it } from "vitest";
import { orderSteps, validateConfig } from "./config";

describe("validateConfig", () => {
  it("throws on empty config", () => {
    expect(() => validateConfig({})).toThrow(Error);
  });

  it("throws on duplicate order", () => {
    expect(() => validateConfig({ a: { order: 1 }, b: { order: 1 } })).toThrow(
      Error,
    );
  });
});

describe("orderSteps", () => {
  it("orders ids by order value", () => {
    expect(
      orderSteps({ c: { order: 3 }, a: { order: 1 }, b: { order: 2 } }),
    ).toEqual(["a", "b", "c"]);
  });
});
