import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Mask } from "./Mask";

afterEach(cleanup);

describe("Mask", () => {
  it("applies the rect as inline top, left, width, height", () => {
    render(<Mask rect={new DOMRect(30, 50, 200, 80)} padding={0} />);
    const mask = screen.getByTestId("tourlight-mask");
    expect(mask.style.top).toBe("50px");
    expect(mask.style.left).toBe("30px");
    expect(mask.style.width).toBe("200px");
    expect(mask.style.height).toBe("80px");
  });

  it("grows the hole by the padding on every side", () => {
    render(<Mask rect={new DOMRect(30, 50, 200, 80)} padding={6} />);
    const mask = screen.getByTestId("tourlight-mask");
    expect(mask.style.top).toBe("44px");
    expect(mask.style.left).toBe("24px");
    expect(mask.style.width).toBe("212px");
    expect(mask.style.height).toBe("92px");
  });
});
