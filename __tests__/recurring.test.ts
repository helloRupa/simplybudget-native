/**
 * Tests for utils/recurring.ts — generatePendingExpenses
 *
 * All tests pass an explicit `today` date so results are deterministic.
 * Dates are constructed with new Date(year, month, day) to avoid UTC/local
 * timezone skew (ISO string constructors parse as UTC midnight).
 */
import { generatePendingExpenses } from "@/utils/recurring";
import type { RecurringExpense } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE: Omit<RecurringExpense, "frequency" | "dayOfMonth" | "dayOfWeek" | "monthOfYear"> = {
  id: "re-1",
  amount: 50,
  category: "Bills",
  description: "Test",
  createdAt: "2026-01-01T00:00:00.000Z",
  startDate: "2026-01-01",
  endDate: null,
  lastGeneratedDate: null,
};

function monthly(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return { ...BASE, frequency: "monthly", dayOfMonth: 1, ...overrides };
}

function weekly(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return { ...BASE, frequency: "weekly", dayOfMonth: 1, dayOfWeek: 1, ...overrides }; // Monday
}

function annually(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return { ...BASE, frequency: "annually", dayOfMonth: 15, monthOfYear: 2, ...overrides }; // Mar 15
}

// Use local-time constructors to avoid UTC-midnight timezone skew
const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);

// ---------------------------------------------------------------------------
// Monthly
// ---------------------------------------------------------------------------

describe("generatePendingExpenses — monthly", () => {
  it("generates one expense per elapsed month up to and including today", () => {
    const { newExpenses } = generatePendingExpenses([monthly()], d(2026, 3, 1));
    expect(newExpenses).toHaveLength(3); // Jan 1, Feb 1, Mar 1
    expect(newExpenses.map((e) => e.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("generates nothing when start date is in the future", () => {
    const { newExpenses } = generatePendingExpenses(
      [monthly({ startDate: "2026-02-01" })],
      d(2026, 1, 1)
    );
    expect(newExpenses).toHaveLength(0);
  });

  it("does not re-generate already-generated months", () => {
    const re = monthly({ lastGeneratedDate: "2026-02-01" });
    const { newExpenses } = generatePendingExpenses([re], d(2026, 3, 1));
    expect(newExpenses).toHaveLength(1);
    expect(newExpenses[0].date).toBe("2026-03-01");
  });

  it("updates lastGeneratedDate on the returned recurring expense", () => {
    const { updatedRecurringExpenses } = generatePendingExpenses([monthly()], d(2026, 3, 1));
    expect(updatedRecurringExpenses[0].lastGeneratedDate).toBe("2026-03-01");
  });

  it("stops generating after endDate", () => {
    const re = monthly({ endDate: "2026-02-01" });
    const { newExpenses } = generatePendingExpenses([re], d(2026, 4, 1));
    expect(newExpenses.map((e) => e.date)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("clamps day-of-month for short months (day 31 in Feb → Feb 28)", () => {
    const re = monthly({ dayOfMonth: 31, startDate: "2026-02-01" });
    const { newExpenses } = generatePendingExpenses([re], d(2026, 3, 1));
    const dates = newExpenses.map((e) => e.date);
    expect(dates).toContain("2026-02-28");
  });

  it("generates expenses with the correct amount, category, and recurringExpenseId", () => {
    const re = monthly({ amount: 99, category: "Food" });
    const { newExpenses } = generatePendingExpenses([re], d(2026, 1, 1));
    expect(newExpenses[0].amount).toBe(99);
    expect(newExpenses[0].category).toBe("Food");
    expect(newExpenses[0].recurringExpenseId).toBe("re-1");
  });

  it("generates nothing when today is before the first due date", () => {
    const { newExpenses } = generatePendingExpenses([monthly()], d(2025, 12, 31));
    expect(newExpenses).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Weekly
// ---------------------------------------------------------------------------

describe("generatePendingExpenses — weekly", () => {
  // startDate 2026-01-05 (Monday), dayOfWeek=1 (Monday)
  const re = weekly({ startDate: "2026-01-05" });

  it("generates the correct number of weekly occurrences", () => {
    // Jan 5, 12, 19, 26 = 4 Mondays
    const { newExpenses } = generatePendingExpenses([re], d(2026, 1, 26));
    expect(newExpenses).toHaveLength(4);
  });

  it("all generated dates fall on the correct day of week (Monday = 1)", () => {
    const { newExpenses } = generatePendingExpenses([re], d(2026, 1, 26));
    newExpenses.forEach((e) => {
      // Parse as local noon to avoid DST edge cases
      const parts = e.date.split("-").map(Number);
      expect(new Date(parts[0], parts[1] - 1, parts[2]).getDay()).toBe(1);
    });
  });

  it("does not re-generate already-generated weeks", () => {
    const resumed = weekly({ startDate: "2026-01-05", lastGeneratedDate: "2026-01-19" });
    const { newExpenses } = generatePendingExpenses([resumed], d(2026, 1, 26));
    expect(newExpenses).toHaveLength(1);
    expect(newExpenses[0].date).toBe("2026-01-26");
  });

  it("stops generating after endDate", () => {
    const bounded = weekly({ startDate: "2026-01-05", endDate: "2026-01-12" });
    const { newExpenses } = generatePendingExpenses([bounded], d(2026, 1, 26));
    expect(newExpenses.map((e) => e.date)).toEqual(["2026-01-05", "2026-01-12"]);
  });
});

// ---------------------------------------------------------------------------
// Annually
// ---------------------------------------------------------------------------

describe("generatePendingExpenses — annually", () => {
  // Mar 15 each year, starting 2024
  const re = annually({ startDate: "2024-03-15" });

  it("generates one expense per year up to and including today", () => {
    const { newExpenses } = generatePendingExpenses([re], d(2026, 3, 15));
    expect(newExpenses.map((e) => e.date)).toEqual([
      "2024-03-15",
      "2025-03-15",
      "2026-03-15",
    ]);
  });

  it("does not generate future annual expenses", () => {
    const { newExpenses } = generatePendingExpenses([re], d(2026, 3, 14));
    expect(newExpenses.map((e) => e.date)).toEqual(["2024-03-15", "2025-03-15"]);
  });

  it("does not re-generate already-generated years", () => {
    const resumed = annually({ startDate: "2024-03-15", lastGeneratedDate: "2025-03-15" });
    const { newExpenses } = generatePendingExpenses([resumed], d(2026, 3, 15));
    expect(newExpenses).toHaveLength(1);
    expect(newExpenses[0].date).toBe("2026-03-15");
  });

  it("stops generating after endDate", () => {
    const bounded = annually({ startDate: "2024-03-15", endDate: "2025-03-15" });
    const { newExpenses } = generatePendingExpenses([bounded], d(2026, 3, 15));
    expect(newExpenses.map((e) => e.date)).toEqual(["2024-03-15", "2025-03-15"]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("generatePendingExpenses — edge cases", () => {
  it("handles empty recurring expenses array", () => {
    const { newExpenses, updatedRecurringExpenses } = generatePendingExpenses([], d(2026, 3, 1));
    expect(newExpenses).toEqual([]);
    expect(updatedRecurringExpenses).toEqual([]);
  });

  it("handles multiple recurring expenses in one call", () => {
    const re1 = monthly({ id: "re-1", startDate: "2026-01-01" });
    const re2 = monthly({ id: "re-2", startDate: "2026-01-01", amount: 99 });
    const { newExpenses } = generatePendingExpenses([re1, re2], d(2026, 1, 1));
    expect(newExpenses).toHaveLength(2);
    expect(newExpenses.map((e) => e.recurringExpenseId)).toEqual(["re-1", "re-2"]);
  });

  it("each generated expense has a unique id", () => {
    const { newExpenses } = generatePendingExpenses([monthly()], d(2026, 3, 1));
    const ids = newExpenses.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("migrates legacy entries without a frequency field to monthly", () => {
    const legacy = { ...monthly(), frequency: undefined } as unknown as RecurringExpense;
    const { newExpenses } = generatePendingExpenses([legacy], d(2026, 1, 1));
    expect(newExpenses).toHaveLength(1);
  });
});
