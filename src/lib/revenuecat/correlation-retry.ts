export interface CorrelationRetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  isCancelled?: () => boolean;
}

const defaultSleep = (delayMs: number) => new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));

/** Keeps a transient provider read from being lost when checkout navigates away. */
export async function retryRedemptionCorrelation(
  correlate: () => Promise<unknown>,
  {
    maxAttempts = 8,
    delayMs = 15_000,
    sleep = defaultSleep,
    isCancelled = () => false,
  }: CorrelationRetryOptions = {},
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (isCancelled()) return false;
    try {
      await correlate();
      return true;
    } catch {
      if (attempt === maxAttempts - 1) return false;
      await sleep(delayMs);
    }
  }
  return false;
}
