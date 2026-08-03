/** Serializes an operation whose server result supersedes prior attempts. */
export class SingleFlight<T> {
  private inFlight: Promise<T> | null = null;

  run(operation: () => Promise<T>): Promise<T> {
    if (!this.inFlight) {
      this.inFlight = operation().finally(() => { this.inFlight = null; });
    }
    return this.inFlight;
  }
}
