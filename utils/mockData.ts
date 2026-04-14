/**
 * Mock data for development — simulates 3 weeks of usage.
 *
 * All dates are computed relative to the current week so the data
 * stays relevant no matter when the app is loaded.
 *
 * Week 1 (current):  Mon+0 → Sun+6   budget $100  |  3 expenses  $100 spent
 * Week 2 (previous): Mon-7 → Sun-1   budget $150  |  4 expenses  $120 spent
 * Week 3 (earlier):  Mon-14 → Sun-8  budget $120  |  2 expenses   $86 spent
 *
 * Toggle via USE_MOCK_DATA in context/BudgetContext.tsx.
 */

import { State } from "@/context/BudgetContext";
import { startOfWeek, subWeeks, addDays, format } from "date-fns";

function monday(weeksAgo: number): Date {
  return startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
}

// Returns a YYYY-MM-DD string for a date that is `daysAfter` days after
// the Monday of `weeksAgo` weeks ago.
function d(weeksAgo: number, daysAfter: number): string {
  return format(addDays(monday(weeksAgo), daysAfter), "yyyy-MM-dd");
}

// ISO timestamp at a given hour on that day.
function ts(weeksAgo: number, daysAfter: number, hour: number): string {
  const base = addDays(monday(weeksAgo), daysAfter);
  base.setHours(hour, 0, 0, 0);
  return base.toISOString();
}

export const MOCK_STATE: State = {
  locale: "en",
  currency: "USD",
  firstUseDate: d(2, 0), // Monday 2 weeks ago
  lockEnabled: false,
  notifyDailyExpense: false,
  notifyWeeklyBackup: false,
  crashlyticsEnabled: false,

  weeklyBudget: 100, // current week's budget

  categories: [
    { name: "Food", color: "#f97316" },
    { name: "Transportation", color: "#3b82f6" },
    { name: "Entertainment", color: "#a855f7" },
    { name: "Shopping", color: "#ec4899" },
    { name: "Bills", color: "#ef4444" },
    { name: "Other", color: "#6b7280" },
  ],

  budgetHistory: [
    { startDate: d(0, 0), amount: 100 }, // current week
    { startDate: d(1, 0), amount: 150 }, // previous week
    { startDate: d(2, 0), amount: 120 }, // week before that
  ],

  // ------------------------------------------------------------------
  // Expenses — sorted newest first (mirrors DB query order)
  // ------------------------------------------------------------------
  expenses: [
    // Week 1 (current): $45 + $30 + $25 = $100
    {
      id: "mock-w1-e1",
      amount: 45,
      category: "Food",
      description: "Grocery run",
      date: d(0, 1), // Tuesday
      createdAt: ts(0, 1, 10),
    },
    {
      id: "mock-w1-e2",
      amount: 30,
      category: "Transportation",
      description: "Uber to work",
      date: d(0, 2), // Wednesday
      createdAt: ts(0, 2, 8),
    },
    {
      id: "mock-w1-e3",
      amount: 25,
      category: "Entertainment",
      description: "Coffee & snacks",
      date: d(0, 3), // Thursday
      createdAt: ts(0, 3, 14),
    },

    // Week 2 (previous): $38 + $42 + $15 + $25 = $120
    {
      id: "mock-w2-e1",
      amount: 38,
      category: "Food",
      description: "Lunch out",
      date: d(1, 1), // Tuesday
      createdAt: ts(1, 1, 12),
    },
    {
      id: "mock-w2-e2",
      amount: 42,
      category: "Shopping",
      description: "New shirt",
      date: d(1, 2), // Wednesday
      createdAt: ts(1, 2, 15),
    },
    {
      id: "mock-w2-e3",
      amount: 15,
      category: "Entertainment",
      description: "Streaming subscription",
      date: d(1, 3), // Thursday
      createdAt: ts(1, 3, 9),
    },
    {
      id: "mock-w2-e4",
      amount: 25,
      category: "Transportation",
      description: "Gas fill-up",
      date: d(1, 4), // Friday
      createdAt: ts(1, 4, 17),
    },

    // Week 3 (earlier): $54 + $32 = $86
    {
      id: "mock-w3-e1",
      amount: 54,
      category: "Bills",
      description: "Electric bill",
      date: d(2, 1), // Tuesday
      createdAt: ts(2, 1, 11),
    },
    {
      id: "mock-w3-e2",
      amount: 32,
      category: "Food",
      description: "Dinner with friends",
      date: d(2, 4), // Friday
      createdAt: ts(2, 4, 19),
    },
  ],

  recurringExpenses: [],
};
