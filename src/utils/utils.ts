// utils/waitUntil.ts

/**
 * Polls until a condition returns a value or timeout is hit.
 * @param fn - async function to call repeatedly
 * @param timeout - max time in ms before giving up (default 30s)
 * @param interval - how often to call fn (ms, default 2s)
 * @param onPoll - optional callback called each cycle (e.g. for spinner)
 */
export async function waitUntil<T>(
  fn: () => Promise<T>,
  timeout = 30000,
  interval = 2000,
  onPoll?: () => void,
  delayBeforeFirstAttempt = 0,
): Promise<T> {
  const start = Date.now();

  if (delayBeforeFirstAttempt > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayBeforeFirstAttempt));
  }

  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result !== undefined) return result;
    } catch (err: any) {
      console.log(err);
    }

    if (onPoll) onPoll();
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout after ${timeout}ms`);
}
