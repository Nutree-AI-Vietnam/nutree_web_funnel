import { describe, expect, it, vi } from 'vitest';
import { SingleFlight } from './single-flight';

describe('SingleFlight', () => {
  it('does not start a superseding operation until the active attempt completes', async () => {
    let complete: ((value: void) => void) | undefined;
    const operation = vi.fn(() => new Promise<void>((resolve) => { complete = resolve; }));
    const singleFlight = new SingleFlight<void>();

    const first = singleFlight.run(operation);
    const duplicate = singleFlight.run(operation);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(duplicate).toBe(first);
    complete?.();
    await first;
    await singleFlight.run(async () => undefined);
  });
});
