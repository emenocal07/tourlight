import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip";

afterEach(cleanup);

function renderTooltip(overrides: Partial<Parameters<typeof Tooltip>[0]> = {}) {
  const target = document.createElement("div");
  document.body.appendChild(target);
  const handlers = { onNext: vi.fn(), onPrev: vi.fn(), onSkip: vi.fn() };
  render(
    <Tooltip
      target={target}
      title="Filters"
      content="Narrow by genre"
      stepNumber={1}
      total={3}
      {...handlers}
      {...overrides}
    />,
  );
  return { target, ...handlers };
}

describe("Tooltip", () => {
  it('renders title, content and "Step 1 of 3"', () => {
    renderTooltip();
    expect(screen.getByText("Filters")).toBeTruthy();
    expect(screen.getByText("Narrow by genre")).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
  });

  it("wires the Back, Next and Skip buttons", () => {
    const { onNext, onPrev, onSkip } = renderTooltip({ stepNumber: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("disables Back on the first step", () => {
    renderTooltip({ stepNumber: 1 });
    const back = screen.getByRole("button", { name: "Back" });
    expect((back as HTMLButtonElement).disabled).toBe(true);
  });
});
