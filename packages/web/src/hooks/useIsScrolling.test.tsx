import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsScrolling } from "./useIsScrolling";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function scrollWindow(): void {
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useIsScrolling", () => {
  it("is false initially", () => {
    const { result } = renderHook(() => useIsScrolling());
    expect(result.current).toBe(false);
  });

  it("becomes true after a window scroll event", () => {
    const { result } = renderHook(() => useIsScrolling());
    scrollWindow();
    expect(result.current).toBe(true);
  });

  it("becomes true when an inner element scrolls (capture)", () => {
    const inner = document.createElement("div");
    document.body.append(inner);
    const { result } = renderHook(() => useIsScrolling());
    act(() => {
      // Scroll events do not bubble; only a capture listener sees this one.
      inner.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);
    inner.remove();
  });

  it("returns to false after the quiet period", () => {
    const { result } = renderHook(() => useIsScrolling(120));
    scrollWindow();
    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("restarts the quiet timer on every scroll event", () => {
    const { result } = renderHook(() => useIsScrolling(120));
    scrollWindow();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    scrollWindow();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current).toBe(false);
  });

  it("does not re-render on further scroll events while already scrolling", () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useIsScrolling();
    });
    scrollWindow();
    const afterFirst = renders;
    scrollWindow();
    scrollWindow();
    expect(renders).toBe(afterFirst);
  });

  it("removes the listener and clears the timer on unmount", () => {
    const removed = vi.spyOn(window, "removeEventListener");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderHook(() => useIsScrolling());
    scrollWindow();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(
      removed.mock.calls.some(
        ([type, , options]) =>
          type === "scroll" &&
          typeof options === "object" &&
          options.capture === true,
      ),
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(500);
    expect(error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is safe under StrictMode", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useIsScrolling(120), {
      wrapper: StrictMode,
    });
    expect(result.current).toBe(false);
    scrollWindow();
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current).toBe(false);
    scrollWindow();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(error).not.toHaveBeenCalled();
  });
});
