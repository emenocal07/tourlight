import { afterEach, describe, expect, it, vi } from "vitest";
import { createStepRegistry } from "./stepRegistry";

describe("createStepRegistry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registry returns the registered element", () => {
    const registry = createStepRegistry();
    const el = document.createElement("div");
    registry.register("a", el);
    expect(registry.get("a")).toBe(el);
  });

  it("registry unregister removes it", () => {
    const registry = createStepRegistry();
    const el = document.createElement("div");
    registry.register("a", el);
    registry.unregister("a", el);
    expect(registry.get("a")).toBeUndefined();
  });

  it("unregister ignores a different element", () => {
    const registry = createStepRegistry();
    const el = document.createElement("div");
    registry.register("a", el);
    registry.unregister("a", document.createElement("div"));
    expect(registry.get("a")).toBe(el);
  });

  it("duplicate id keeps the first element and warns (Review Focus 5)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registry = createStepRegistry();
    const first = document.createElement("div");
    const second = document.createElement("div");
    registry.register("a", first);
    registry.register("a", second);
    expect(registry.get("a")).toBe(first);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
