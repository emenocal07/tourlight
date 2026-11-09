export function validateConfig(
  config: Record<string, { order: number }>,
): void {
  const entries = Object.entries(config);
  if (entries.length === 0) {
    throw new Error("Tour config must define at least one step");
  }
  const seen = new Set<number>();
  for (const [id, { order }] of entries) {
    if (seen.has(order)) {
      throw new Error(`Duplicate step order ${order} (step "${id}")`);
    }
    seen.add(order);
  }
}

export function orderSteps<Id extends string>(
  config: Record<Id, { order: number }>,
): readonly Id[] {
  return (Object.keys(config) as Id[]).sort(
    (a, b) => config[a].order - config[b].order,
  );
}
