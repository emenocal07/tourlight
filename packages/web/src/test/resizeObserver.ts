type ResizeCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver,
) => void;

const instances = new Set<MockResizeObserver>();

class MockResizeObserver implements ResizeObserver {
  private readonly callback: ResizeCallback;
  private readonly targets = new Set<Element>();

  constructor(callback: ResizeCallback) {
    this.callback = callback;
    instances.add(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    instances.delete(this);
  }

  fire(): void {
    this.callback([], this);
  }
}

export function installResizeObserver(): void {
  globalThis.ResizeObserver = MockResizeObserver;
}

// Simulates the browser notifying every live observer that a size changed.
export function triggerResize(): void {
  for (const instance of [...instances]) instance.fire();
}
