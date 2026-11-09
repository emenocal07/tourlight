export interface StepRegistry {
  register(id: string, el: HTMLElement): void;
  unregister(id: string, el: HTMLElement): void;
  get(id: string): HTMLElement | undefined;
}

export function createStepRegistry(): StepRegistry {
  const elements = new Map<string, HTMLElement>();
  return {
    register(id, el) {
      if (elements.has(id)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[tourlight] Step "${id}" is already registered; keeping the first element.`,
          );
        }
        return;
      }
      elements.set(id, el);
    },
    unregister(id, el) {
      if (elements.get(id) === el) {
        elements.delete(id);
      }
    },
    get(id) {
      return elements.get(id);
    },
  };
}
