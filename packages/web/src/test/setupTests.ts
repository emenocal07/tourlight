import { beforeEach } from "vitest";
import { installResizeObserver } from "./resizeObserver";

// jsdom lays nothing out: every rect is zero and these browser APIs do not exist.
beforeEach(() => {
  installResizeObserver();
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.getBoundingClientRect = () => new DOMRect(10, 20, 100, 40);
});
