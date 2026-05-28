/**
 * Tests for the configurable week-start-day date logic in utils/dates.ts:
 *  - getWeekRange / getWeekRanges with non-Monday start days
 *  - getTotalBudgeted with a weekStartsOn argument
 *  - computeShiftedFirstUseDate (closest-match + expense guard)
 *
 * Anchors: 2026-04-20 is a Monday (per totalSaved.test.ts), so 2026-04-13 and
 * 2026-04-06 are also Mondays, 2026-04-12 a Sunday, 2026-04-14 a Tuesday.
 */
import {
  computeShiftedFirstUseDate,
  getTotalBudgeted,
  getWeekRange,
  getWeekRanges,
} from "@/utils/dates";
import { getDay, parseISO } from "date-fns";

function d(isoDate: string): Date {
  return parseISO(isoDate);
}

// ---------------------------------------------------------------------------
// getWeekRange
// ---------------------------------------------------------------------------

describe("getWeekRange with non-Monday start days", () => {
  // 2026-04-15 is a Wednesday
  it("Sunday start (0): Sun→Sat surrounding the date", () => {
    const { start, end } = getWeekRange(d("2026-04-15"), 0);
    expect(start.getFullYear()).toBe(2026);
    expect(getDay(start)).toBe(0); // Sunday
    expect(getDay(end)).toBe(6); // Saturday
    expect(start.getDate()).toBe(12);
    expect(end.getDate()).toBe(18);
  });

  it("Monday start (1): Mon→Sun (default behaviour)", () => {
    const { start, end } = getWeekRange(d("2026-04-15"), 1);
    expect(getDay(start)).toBe(1);
    expect(start.getDate()).toBe(13);
    expect(end.getDate()).toBe(19);
  });

  it("Saturday start (6): Sat→Fri surrounding the date", () => {
    const { start, end } = getWeekRange(d("2026-04-15"), 6);
    expect(getDay(start)).toBe(6);
    expect(start.getDate()).toBe(11);
    expect(end.getDate()).toBe(17);
  });

  it("defaults to Monday when weekStartsOn is omitted", () => {
    const { start } = getWeekRange(d("2026-04-15"));
    expect(getDay(start)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getWeekRanges / getTotalBudgeted
// ---------------------------------------------------------------------------

describe("getWeekRanges / getTotalBudgeted with weekStartsOn", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-20T12:00:00")); // Monday
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("produces Sunday-aligned ranges for a Sunday start", () => {
    const ranges = getWeekRanges("2026-04-12", 0); // Sunday
    expect(ranges).toHaveLength(2); // Apr 12, Apr 19
    ranges.forEach((r) => expect(getDay(r.start)).toBe(0));
  });

  it("getTotalBudgeted threads weekStartsOn into getWeekRanges", () => {
    const history = [{ startDate: "2026-04-12", amount: 100 }];
    // 2 Sunday-weeks (Apr 12, Apr 19), each at 100 → 200
    expect(getTotalBudgeted("2026-04-12", history, 0)).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// computeShiftedFirstUseDate
// ---------------------------------------------------------------------------

describe("computeShiftedFirstUseDate", () => {
  const MON = "2026-04-13";

  it("returns the date unchanged when already on the target weekday", () => {
    expect(computeShiftedFirstUseDate(MON, 1, null)).toBe(MON);
  });

  it("picks the closest match backward (Mon → Sun is 1 day back)", () => {
    // Sunday before Monday Apr 13 is Apr 12 (1 back vs 6 forward)
    expect(computeShiftedFirstUseDate(MON, 0, null)).toBe("2026-04-12");
  });

  it("picks the closest match forward (Mon → Tue is 1 day forward)", () => {
    // Tuesday Apr 14 is 1 forward vs 6 back to Apr 7
    expect(computeShiftedFirstUseDate(MON, 2, null)).toBe("2026-04-14");
  });

  it("expense guard: earliest expense strictly before candidate → shift back a week", () => {
    // Mon → Tue candidate is Apr 14; an expense on Apr 13 is before it,
    // so firstUseDate shifts back a week to Apr 7 (still a Tuesday).
    expect(computeShiftedFirstUseDate(MON, 2, "2026-04-13")).toBe("2026-04-07");
    expect(getDay(parseISO("2026-04-07"))).toBe(2);
  });

  it("expense guard: earliest expense exactly on candidate → no shift", () => {
    expect(computeShiftedFirstUseDate(MON, 2, "2026-04-14")).toBe("2026-04-14");
  });

  it("expense guard: earliest expense after candidate → no shift", () => {
    expect(computeShiftedFirstUseDate(MON, 2, "2026-04-20")).toBe("2026-04-14");
  });

  it("no expenses → candidate returned unchanged", () => {
    expect(computeShiftedFirstUseDate(MON, 2, null)).toBe("2026-04-14");
  });

  it("round trip Mon → Sun → Mon restores the original date", () => {
    const toSun = computeShiftedFirstUseDate(MON, 0, null); // 2026-04-12
    const backToMon = computeShiftedFirstUseDate(toSun, 1, null);
    expect(backToMon).toBe(MON);
  });

  it("round trip with an expense on the start day still closes (strict <)", () => {
    // Expense on the Monday start day. Mon → Sun keeps Apr 12 (expense on Apr 13
    // is inside that week), Sun → Mon returns to Apr 13.
    const toSun = computeShiftedFirstUseDate(MON, 0, MON); // 2026-04-12
    expect(toSun).toBe("2026-04-12");
    const backToMon = computeShiftedFirstUseDate(toSun, 1, MON);
    expect(backToMon).toBe(MON);
  });
});
