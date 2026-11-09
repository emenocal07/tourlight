import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTargetRect } from "./useTargetRect";

afterEach(() => {
  vi.unstubAllGlobals();
});

function targetWithHeight(height: number): {
  el: HTMLElement;
  scrollIntoView: ReturnType<typeof vi.fn>;
} {
  const el = document.createElement("div");
  document.body.appendChild(el);
  el.getBoundingClientRect = () => new DOMRect(10, 20, 100, height);
  const scrollIntoView = vi.fn();
  el.scrollIntoView = scrollIntoView;
  return { el, scrollIntoView };
}

describe("useTargetRect scrolling", () => {
  it("aligns a target taller than the viewport to the start", () => {
    vi.stubGlobal("innerHeight", 600);
    const { el, scrollIntoView } = targetWithHeight(2000);
    renderHook(() => useTargetRect(el));
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      inline: "nearest",
    });
  });

  it("centers a target that fits in the viewport", () => {
    vi.stubGlobal("innerHeight", 600);
    const { el, scrollIntoView } = targetWithHeight(100);
    renderHook(() => useTargetRect(el));
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "nearest",
    });
  });
});
