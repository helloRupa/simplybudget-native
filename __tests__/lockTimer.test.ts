import { shouldReLock } from "@/utils/lockTimer";

const GRACE = 30_000;

describe("shouldReLock", () => {
  it("returns true when lock is enabled, not suppressed, and grace period has elapsed", () => {
    expect(shouldReLock({ lockEnabled: true, lockSuppressed: false, elapsed: GRACE, gracePeriodMs: GRACE })).toBe(true);
  });

  it("returns true when elapsed exceeds the grace period", () => {
    expect(shouldReLock({ lockEnabled: true, lockSuppressed: false, elapsed: GRACE + 1, gracePeriodMs: GRACE })).toBe(true);
  });

  it("returns false when elapsed is within the grace period", () => {
    expect(shouldReLock({ lockEnabled: true, lockSuppressed: false, elapsed: GRACE - 1, gracePeriodMs: GRACE })).toBe(false);
  });

  it("returns false when lock is disabled", () => {
    expect(shouldReLock({ lockEnabled: false, lockSuppressed: false, elapsed: GRACE * 10, gracePeriodMs: GRACE })).toBe(false);
  });

  it("returns false when lock is suppressed", () => {
    expect(shouldReLock({ lockEnabled: true, lockSuppressed: true, elapsed: GRACE * 10, gracePeriodMs: GRACE })).toBe(false);
  });

  it("returns false when both disabled and suppressed", () => {
    expect(shouldReLock({ lockEnabled: false, lockSuppressed: true, elapsed: GRACE * 10, gracePeriodMs: GRACE })).toBe(false);
  });

  it("returns false when elapsed is zero", () => {
    expect(shouldReLock({ lockEnabled: true, lockSuppressed: false, elapsed: 0, gracePeriodMs: GRACE })).toBe(false);
  });
});
