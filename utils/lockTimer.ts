/**
 * Pure function — determines whether the app should re-lock when returning
 * from the background. Extracted so it can be unit-tested independently of
 * the React component that calls it.
 */
export function shouldReLock({
  lockEnabled,
  lockSuppressed,
  elapsed,
  gracePeriodMs,
}: {
  lockEnabled: boolean;
  lockSuppressed: boolean;
  elapsed: number;
  gracePeriodMs: number;
}): boolean {
  return lockEnabled && !lockSuppressed && elapsed >= gracePeriodMs;
}
