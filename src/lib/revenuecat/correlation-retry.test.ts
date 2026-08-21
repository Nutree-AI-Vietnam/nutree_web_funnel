import { describe, expect, it } from 'vitest';
import { retryRedemptionCorrelation } from './correlation-retry';

describe('retryRedemptionCorrelation', () => {
  it('keeps retrying a transient correlation failure until it succeeds', async () => {
    const attempts: number[] = [];

    await expect(retryRedemptionCorrelation(
      async () => {
        attempts.push(attempts.length + 1);
        if (attempts.length < 3) throw new Error('provider not ready');
      },
      { delayMs: 15_000, sleep: async () => {} },
    )).resolves.toBe(true);

    expect(attempts).toEqual([1, 2, 3]);
  });

  it('stops without another attempt when the page is unmounted', async () => {
    let attempts = 0;
    let cancelled = false;

    await expect(retryRedemptionCorrelation(
      async () => {
        attempts += 1;
        throw new Error('provider not ready');
      },
      { maxAttempts: 3, sleep: async () => { cancelled = true; }, isCancelled: () => cancelled },
    )).resolves.toBe(false);

    expect(attempts).toBe(1);
  });
});
