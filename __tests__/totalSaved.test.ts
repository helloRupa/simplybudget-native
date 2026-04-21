/**
 * Tests for the "total saved / overspent all time" calculation.
 *
 * getBudgetForWeek and getTotalBudgeted are pure functions tested directly.
 * getTotalBudgeted calls getWeekRanges which reads new Date(), so we pin the
 * clock with jest.useFakeTimers for those tests.
 *
 * budgetHistory arrays use descending startDate order (most recent first),
 * matching the ORDER BY startDate DESC from the DB and the sort order that
 * getBudgetForWeek expects.
 */

import { getBudgetForWeek, getTotalBudgeted } from "@/utils/dates";
import { parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function d(isoDate: string): Date {
  return parseISO(isoDate);
}

// ---------------------------------------------------------------------------
// getBudgetForWeek
// ---------------------------------------------------------------------------

describe("getBudgetForWeek", () => {
  it("returns the amount when the week exactly matches an entry", () => {
    const history = [{ startDate: "2026-04-20", amount: 10 }];
    expect(getBudgetForWeek(d("2026-04-20"), history)).toBe(10);
  });

  it("returns the most recent entry when the week is after the newest entry", () => {
    const history = [
      { startDate: "2026-04-20", amount: 10 },
      { startDate: "2026-04-13", amount: 150 },
    ];
    expect(getBudgetForWeek(d("2026-04-27"), history)).toBe(10);
  });

  it("returns the correct entry when the week falls between two entries", () => {
    const history = [
      { startDate: "2026-04-20", amount: 10 },
      { startDate: "2026-04-13", amount: 150 },
    ];
    // Apr 13 week predates the Apr 20 change — should use 150
    expect(getBudgetForWeek(d("2026-04-13"), history)).toBe(150);
  });

  it("returns 0 when the week predates all history entries", () => {
    const history = [{ startDate: "2026-04-20", amount: 10 }];
    expect(getBudgetForWeek(d("2026-04-06"), history)).toBe(0);
  });

  it("returns 0 for empty history", () => {
    expect(getBudgetForWeek(d("2026-04-20"), [])).toBe(0);
  });

  it("returns the correct entry across three budget periods", () => {
    const history = [
      { startDate: "2026-04-20", amount: 10 },
      { startDate: "2026-04-13", amount: 150 },
      { startDate: "2026-04-06", amount: 200 },
    ];
    expect(getBudgetForWeek(d("2026-04-06"), history)).toBe(200);
    expect(getBudgetForWeek(d("2026-04-13"), history)).toBe(150);
    expect(getBudgetForWeek(d("2026-04-20"), history)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getTotalBudgeted
// ---------------------------------------------------------------------------

describe("getTotalBudgeted", () => {
  beforeEach(() => {
    // Pin clock to Monday 2026-04-20 so getWeekRanges returns a known set
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-20T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns weekly budget × number of weeks when budget never changed", () => {
    // firstUseDate = Apr 13 → 2 weeks (Apr 13, Apr 20)
    const history = [{ startDate: "2026-04-13", amount: 150 }];
    expect(getTotalBudgeted("2026-04-13", history)).toBe(300);
  });

  it("uses each week's applicable budget when the budget changed mid-history", () => {
    // Week 1 (Apr 13): $150, Week 2 (Apr 20): $10 → total $160
    const history = [
      { startDate: "2026-04-20", amount: 10 },
      { startDate: "2026-04-13", amount: 150 },
    ];
    expect(getTotalBudgeted("2026-04-13", history)).toBe(160);
  });

  it("applies budget change on the exact week boundary, not before", () => {
    // Apr 20 change applies only to Apr 20 week, not Apr 13
    const history = [
      { startDate: "2026-04-20", amount: 50 },
      { startDate: "2026-04-13", amount: 100 },
    ];
    expect(getTotalBudgeted("2026-04-13", history)).toBe(150);
  });

  it("returns the single week's budget when only one week has elapsed", () => {
    // firstUseDate = Apr 20, same as today → only 1 week
    const history = [{ startDate: "2026-04-20", amount: 75 }];
    expect(getTotalBudgeted("2026-04-20", history)).toBe(75);
  });

  it("returns 0 for empty history", () => {
    expect(getTotalBudgeted("2026-04-13", [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// totalSavedAllTime = totalBudgeted - totalSpentToDate
// Mirrors the computation in app/(tabs)/index.tsx
// ---------------------------------------------------------------------------

describe("totalSavedAllTime calculation", () => {
  const firstUseDate = "2026-04-13";

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-20T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function computeTotalSaved(
    budgetHistory: { startDate: string; amount: number }[],
    expenses: { date: string; amount: number }[],
  ): number {
    const now = new Date();
    const totalBudgeted = getTotalBudgeted(firstUseDate, budgetHistory);
    const totalSpentToDate = expenses
      .filter((e) => {
        try {
          return e.date >= firstUseDate && parseISO(e.date) <= now;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + e.amount, 0);
    return totalBudgeted - totalSpentToDate;
  }

  it("equals total budgeted when there are no expenses", () => {
    const history = [{ startDate: "2026-04-13", amount: 150 }];
    expect(computeTotalSaved(history, [])).toBe(300);
  });

  it("returns 0 when spending exactly equals budget", () => {
    const history = [{ startDate: "2026-04-13", amount: 150 }];
    const expenses = [
      { date: "2026-04-14", amount: 150 },
      { date: "2026-04-20", amount: 150 },
    ];
    expect(computeTotalSaved(history, expenses)).toBe(0);
  });

  it("returns a negative value when overspent", () => {
    const history = [{ startDate: "2026-04-13", amount: 150 }];
    const expenses = [{ date: "2026-04-14", amount: 400 }];
    expect(computeTotalSaved(history, expenses)).toBe(-100);
  });

  it("correctly accounts for a budget change partway through history", () => {
    // Week 1 budget: $150, Week 2 budget: $10, total budgeted: $160
    const history = [
      { startDate: "2026-04-20", amount: 10 },
      { startDate: "2026-04-13", amount: 150 },
    ];
    const expenses = [{ date: "2026-04-14", amount: 15.8 }];
    expect(computeTotalSaved(history, expenses)).toBeCloseTo(144.2);
  });

  it("reduces total spent correctly when a negative expense (refund) exists", () => {
    const history = [{ startDate: "2026-04-13", amount: 150 }];
    const expenses = [
      { date: "2026-04-14", amount: 50 },
      { date: "2026-04-15", amount: -20 }, // refund
    ];
    // spent = 30, budgeted = 300, saved = 270
    expect(computeTotalSaved(history, expenses)).toBe(270);
  });

  it("excludes future-dated expenses from total spent", () => {
    const history = [{ startDate: "2026-04-13", amount: 150 }];
    const expenses = [
      { date: "2026-04-14", amount: 50 },
      { date: "2026-04-25", amount: 999 }, // future
    ];
    expect(computeTotalSaved(history, expenses)).toBe(250);
  });
});
