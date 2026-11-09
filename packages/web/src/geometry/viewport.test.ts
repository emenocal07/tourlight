import { afterEach, describe, expect, it, vi } from "vitest";
import { clampToViewport, shouldDock } from "./viewport";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubViewport(width: number, height: number): void {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("innerHeight", height);
}

describe("clampToViewport", () => {
  it("returns the same geometry when the rect is inside the viewport", () => {
    stubViewport(1000, 800);
    expect(
      clampToViewport({ top: 100, left: 50, width: 200, height: 100 }),
    ).toEqual({ top: 100, left: 50, width: 200, height: 100 });
  });

  it("cuts the part above the viewport", () => {
    stubViewport(1000, 800);
    expect(
      clampToViewport({ top: -50, left: 10, width: 100, height: 200 }),
    ).toEqual({ top: 0, left: 10, width: 100, height: 150 });
  });

  it("cuts the part below the viewport", () => {
    stubViewport(1000, 800);
    expect(
      clampToViewport({ top: 700, left: 10, width: 100, height: 200 }),
    ).toEqual({ top: 700, left: 10, width: 100, height: 100 });
  });

  it("cuts the part left of the viewport", () => {
    stubViewport(1000, 800);
    expect(
      clampToViewport({ top: 10, left: -30, width: 100, height: 50 }),
    ).toEqual({ top: 10, left: 0, width: 70, height: 50 });
  });

  it("cuts the part right of the viewport", () => {
    stubViewport(1000, 800);
    expect(
      clampToViewport({ top: 10, left: 950, width: 100, height: 50 }),
    ).toEqual({ top: 10, left: 950, width: 50, height: 50 });
  });

  it("clamps a rect taller than the viewport to the viewport height", () => {
    stubViewport(1000, 800);
    expect(
      clampToViewport({ top: -400, left: 0, width: 1000, height: 3000 }),
    ).toEqual({ top: 0, left: 0, width: 1000, height: 800 });
  });

  it("returns the original rect when it is entirely off-screen", () => {
    stubViewport(1000, 800);
    const rect = { top: 900, left: 10, width: 100, height: 50 };
    expect(clampToViewport(rect)).toBe(rect);
  });

  it("accepts a DOMRect", () => {
    stubViewport(1000, 800);
    expect(clampToViewport(new DOMRect(10, -20, 100, 100))).toEqual({
      top: 0,
      left: 10,
      width: 100,
      height: 80,
    });
  });
});

describe("shouldDock", () => {
  const viewport = { width: 1000, height: 800 };
  const tooltip = { width: 300, height: 150 };

  it("is false when there is room above", () => {
    const visible = { top: 400, left: 0, width: 100, height: 400 };
    expect(shouldDock(visible, tooltip, viewport)).toBe(false);
  });

  it("is false when there is room below", () => {
    const visible = { top: 0, left: 0, width: 100, height: 300 };
    expect(shouldDock(visible, tooltip, viewport)).toBe(false);
  });

  it("is true when there is no room above or below", () => {
    const visible = { top: 0, left: 0, width: 1000, height: 800 };
    expect(shouldDock(visible, tooltip, viewport)).toBe(true);
  });

  it("honors the gap", () => {
    const visible = { top: 160, left: 0, width: 100, height: 480 };
    expect(shouldDock(visible, tooltip, viewport, 0)).toBe(false);
    expect(shouldDock(visible, tooltip, viewport, 12)).toBe(true);
  });

  it("ignores horizontal room for top and bottom placements", () => {
    const visible = { top: 0, left: 400, width: 100, height: 800 };
    expect(shouldDock(visible, tooltip, viewport, 12, "top")).toBe(true);
    expect(shouldDock(visible, tooltip, viewport, 12, "bottom-start")).toBe(
      true,
    );
  });

  describe("left and right placements", () => {
    it("is false with room on the right only", () => {
      const visible = { top: 0, left: 0, width: 600, height: 800 };
      expect(shouldDock(visible, tooltip, viewport, 12, "right")).toBe(false);
    });

    it("is false with room on the left only", () => {
      const visible = { top: 0, left: 400, width: 600, height: 800 };
      expect(shouldDock(visible, tooltip, viewport, 12, "left-end")).toBe(
        false,
      );
    });

    it("is true with no horizontal room", () => {
      const visible = { top: 0, left: 0, width: 1000, height: 800 };
      expect(shouldDock(visible, tooltip, viewport, 12, "left")).toBe(true);
      expect(shouldDock(visible, tooltip, viewport, 12, "right-start")).toBe(
        true,
      );
    });

    it("does not dock a tall target that has horizontal room", () => {
      const visible = { top: 0, left: 300, width: 100, height: 800 };
      expect(shouldDock(visible, tooltip, viewport, 12, "right")).toBe(false);
    });
  });
});
