import { readFileSync } from "node:fs";
import { createMemoryStorage } from "@emenocal07/tourlight-core";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTour } from "../../createTour";
import { Tooltip } from "./Tooltip";

const tour = createTour(
  {
    a: { order: 1, title: "Title A", content: "Step A" },
    b: { order: 2, title: "Title B", content: "Step B" },
    c: { order: 3, title: "Title C", content: "Step C" },
  },
  { maxShows: 1, storageKey: "a11y-tour" },
);

function App() {
  const { TourProvider, TourStep } = tour;
  return (
    <TourProvider storage={createMemoryStorage()}>
      {(["a", "b", "c"] as const).map((id) => (
        <TourStep key={id} id={id}>
          <div>{`target ${id}`}</div>
        </TourStep>
      ))}
    </TourProvider>
  );
}

async function flush(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

// Focuses the opener before the auto start so there is something to restore.
async function renderActive() {
  const user = userEvent.setup();
  // Outside the rendered tree, so it survives unmounting the provider.
  const opener = document.createElement("button");
  opener.textContent = "opener";
  document.body.appendChild(opener);
  opener.focus();
  const view = render(<App />);
  await flush();
  return { user, ...view };
}

const dialog = (): HTMLElement => screen.getByRole("dialog");

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Tooltip accessibility", () => {
  it("tooltip has role dialog with labelledby and describedby", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    render(
      <Tooltip
        target={target}
        title="Filters"
        content="Narrow by genre"
        stepNumber={1}
        total={3}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    const el = screen.getByRole("dialog");
    const labelledBy = el.getAttribute("aria-labelledby");
    const describedBy = el.getAttribute("aria-describedby");
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(labelledBy).not.toBe(describedBy);
    expect(document.getElementById(labelledBy as string)?.textContent).toBe(
      "Filters",
    );
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Narrow by genre",
    );
  });

  it("focus moves into the tooltip on open", async () => {
    await renderActive();
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it("Tab cycles inside the tooltip", async () => {
    const { user } = await renderActive();
    const skip = within(dialog()).getByRole("button", { name: "Skip" });
    const next = within(dialog()).getByRole("button", { name: "Next" });
    // Back is disabled on the first step, so Skip and Next are the only stops.
    await user.tab();
    expect(document.activeElement).toBe(skip);
    await user.tab();
    expect(document.activeElement).toBe(next);
    await user.tab();
    expect(document.activeElement).toBe(skip);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(next);
  });

  it("Escape skips the tour", async () => {
    const { user } = await renderActive();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ArrowRight and ArrowLeft navigate", async () => {
    const { user } = await renderActive();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
  });

  it("focus returns to the previous element when the tour ends", async () => {
    const { user } = await renderActive();
    expect(document.activeElement).not.toBe(
      screen.getByRole("button", { name: "opener" }),
    );
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "opener" }),
    );
  });

  it('live region announces "Step 2 of 3" on step change', async () => {
    const { user } = await renderActive();
    const region = document.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toMatch(/step 1 of 3/i);
    await user.keyboard("{ArrowRight}");
    expect(region?.textContent).toMatch(/step 2 of 3/i);
  });

  it("unmounting mid-tour restores focus and leaves no listeners (Review Focus 3)", async () => {
    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    const error = vi.spyOn(console, "error");
    const { user, unmount } = await renderActive();
    const opener = screen.getByRole("button", { name: "opener" });
    expect(document.activeElement).not.toBe(opener);

    unmount();

    expect(document.activeElement).toBe(opener);
    const count = (spy: typeof added): number =>
      spy.mock.calls.filter(([type]) => type === "keydown").length;
    expect(count(added)).toBeGreaterThan(0);
    expect(count(removed)).toBe(count(added));

    await user.keyboard("{Escape}{ArrowRight}");
    expect(error).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it("stylesheet disables animations under prefers-reduced-motion", () => {
    const css = readFileSync(
      `${import.meta.dirname}/../../styles/tourlight.css`,
      "utf8",
    );
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).toBeGreaterThanOrEqual(0);
    const block = css.slice(start);
    expect(block).toContain("animation: none");
    expect(block).toContain("transition: none");
    expect(block).toContain(".tourlight-mask");
    expect(block).toContain(".tourlight-tooltip");
  });
});
