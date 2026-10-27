import type { PendingMutation } from './types';

export function orderMutations(mutations: PendingMutation[]): PendingMutation[] {
  return [...mutations].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function canRetryMutation(mutation: PendingMutation): boolean {
  return mutation.attempts < 8;
}

export function nextRetryDelay(attempts: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts));
}

export function isVersionConflict(expected: number | null, actual: number): boolean {
  return expected !== null && expected !== actual;
}
