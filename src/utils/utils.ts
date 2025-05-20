// utils/waitUntil.ts

import { ContainerStatusSummary } from '../common/interface/containerStatus';
import { OpsctrlConfig } from '../core/config';
import { V1ContainerStatus } from '@kubernetes/client-node';

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
): Promise<T> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result !== undefined) return result;
    } catch (err: any) {
      console.log(err);
    }
  }

  throw new Error(`Timeout after ${timeout}ms`);
}

// utils/delay.ts

/**
 * Delays execution for the given number of milliseconds.
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/utils/parseContainerState.ts

export function parseContainerState(
  container: V1ContainerStatus,
  type: 'init' | 'main',
): ContainerStatusSummary {
  const { name, state } = container;

  if (!state) {
    return { name, type, state: 'Unknown' };
  }

  if (state.waiting) {
    return {
      name,
      type,
      state: `Waiting: ${state.waiting.reason || 'Unknown'}`,
      reason: state.waiting.reason,
    };
  }

  if (state.terminated) {
    return {
      name,
      type,
      state: `Terminated: ${state.terminated.reason || 'Unknown'}`,
      reason: state.terminated.reason,
    };
  }

  if (state.running) {
    return { name, type, state: 'Running' };
  }

  return { name, type, state: 'Unknown' };
}
