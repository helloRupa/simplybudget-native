/**
 * Tests for utils/storage.ts and utils/database.ts.
 *
 * expo-sqlite is mocked with a better-sqlite3-backed in-memory database
 * (see __mocks__/expo-sqlite.ts), so these tests exercise real SQL.
 */
import { openDatabaseSync, SQLiteDatabase } from "expo-sqlite";
import { initDatabase } from "@/utils/database";
import {
  deleteExpense,
  deleteRecurringExpense,
  getBudgetHistory,
  getCategories,
  getExpenses,
  getPreferences,
  getRecurringExpenses,
  saveBudgetHistory,
  saveCategory,
  saveExpense,
  saveRecurringExpense,
  setPreferences,
  updateLastGeneratedDate,
} from "@/utils/storage";
import type { Expense, Preferences, RecurringExpense } from "@/types";

function makeDb(): SQLiteDatabase {
  const db = openDatabaseSync("test.db");
  initDatabase(db);
  return db;
}

// ---------------------------------------------------------------------------
// Schema / initialization
// ---------------------------------------------------------------------------

describe("initDatabase", () => {
  it("creates all required tables", () => {
    const db = makeDb();
    const tableNames = db
      .getAllSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .map((r) => r.name);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "budget_history",
        "categories",
        "expenses",
        "preferences",
        "recurring_expenses",
      ])
    );
  });

  it("seeds default categories on first launch", () => {
    const db = makeDb();
    const cats = getCategories(db);
    const names = cats.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Bills",
        "Entertainment",
        "Food",
        "Other",
        "Shopping",
        "Transportation",
      ])
    );
  });

  it("seeding is idempotent (calling initDatabase twice is safe)", () => {
    const db = makeDb();
    initDatabase(db); // second call
    const cats = getCategories(db);
    const foodEntries = cats.filter((c) => c.name === "Food");
    expect(foodEntries).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const expense1: Expense = {
  id: "exp-1",
  amount: 42.5,
  category: "Food",
  description: "Lunch",
  date: "2026-04-01",
  createdAt: "2026-04-01T12:00:00.000Z",
};

const expense2: Expense = {
  id: "exp-2",
  amount: 10,
  category: "Transportation",
  description: "Bus",
  date: "2026-04-02",
  createdAt: "2026-04-02T08:00:00.000Z",
};

describe("expenses", () => {
  it("returns empty array when no expenses exist", () => {
    const db = makeDb();
    expect(getExpenses(db)).toEqual([]);
  });

  it("saves and retrieves an expense", () => {
    const db = makeDb();
    saveExpense(db, expense1);
    const result = getExpenses(db);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "exp-1",
      amount: 42.5,
      category: "Food",
      description: "Lunch",
      date: "2026-04-01",
    });
  });

  it("retrieves multiple expenses ordered by date descending", () => {
    const db = makeDb();
    saveExpense(db, expense1);
    saveExpense(db, expense2);
    const result = getExpenses(db);
    expect(result[0].id).toBe("exp-2");
    expect(result[1].id).toBe("exp-1");
  });

  it("upserts an expense (update existing)", () => {
    const db = makeDb();
    saveExpense(db, expense1);
    saveExpense(db, { ...expense1, amount: 99 });
    const result = getExpenses(db);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(99);
  });

  it("deletes an expense", () => {
    const db = makeDb();
    saveExpense(db, expense1);
    deleteExpense(db, "exp-1");
    expect(getExpenses(db)).toEqual([]);
  });

  it("ignores delete for a non-existent id", () => {
    const db = makeDb();
    saveExpense(db, expense1);
    deleteExpense(db, "does-not-exist");
    expect(getExpenses(db)).toHaveLength(1);
  });

  it("stores null description as empty string on retrieval", () => {
    const db = makeDb();
    saveExpense(db, { ...expense1, description: "" });
    const result = getExpenses(db);
    expect(result[0].description).toBe("");
  });

  it("stores and retrieves recurringExpenseId", () => {
    const db = makeDb();
    saveExpense(db, { ...expense1, recurringExpenseId: "rec-99" });
    const result = getExpenses(db);
    expect(result[0].recurringExpenseId).toBe("rec-99");
  });
});

// ---------------------------------------------------------------------------
// Recurring expenses
// ---------------------------------------------------------------------------

const monthlyRecurring: RecurringExpense = {
  id: "rec-1",
  amount: 150,
  category: "Bills",
  description: "Internet",
  frequency: "monthly",
  dayOfMonth: 15,
  createdAt: "2026-01-01T00:00:00.000Z",
  startDate: "2026-01-15",
  endDate: null,
  lastGeneratedDate: null,
};

const weeklyRecurring: RecurringExpense = {
  id: "rec-2",
  amount: 20,
  category: "Food",
  description: "Groceries",
  frequency: "weekly",
  dayOfMonth: 1, // required by the TS type; storage layer nulls it for weekly
  dayOfWeek: 1, // Monday
  createdAt: "2026-01-01T00:00:00.000Z",
  startDate: "2026-01-06",
  endDate: null,
  lastGeneratedDate: null,
};

const annualRecurring: RecurringExpense = {
  id: "rec-3",
  amount: 500,
  category: "Entertainment",
  description: "Subscription",
  frequency: "annually",
  dayOfMonth: 1,
  monthOfYear: 0, // January
  createdAt: "2026-01-01T00:00:00.000Z",
  startDate: "2026-01-01",
  endDate: null,
  lastGeneratedDate: null,
};

describe("recurring expenses", () => {
  it("returns empty array when none exist", () => {
    const db = makeDb();
    expect(getRecurringExpenses(db)).toEqual([]);
  });

  it("saves and retrieves a monthly recurring expense", () => {
    const db = makeDb();
    saveRecurringExpense(db, monthlyRecurring);
    const result = getRecurringExpenses(db);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "rec-1",
      frequency: "monthly",
      dayOfMonth: 15,
    });
    expect(result[0].dayOfWeek).toBeUndefined();
    expect(result[0].monthOfYear).toBeUndefined();
  });

  it("saves and retrieves a weekly recurring expense", () => {
    const db = makeDb();
    saveRecurringExpense(db, weeklyRecurring);
    const result = getRecurringExpenses(db);
    expect(result[0]).toMatchObject({ frequency: "weekly", dayOfWeek: 1 });
    expect(result[0].monthOfYear).toBeUndefined();
  });

  it("saves and retrieves an annual recurring expense", () => {
    const db = makeDb();
    saveRecurringExpense(db, annualRecurring);
    const result = getRecurringExpenses(db);
    expect(result[0]).toMatchObject({
      frequency: "annually",
      dayOfMonth: 1,
      monthOfYear: 0,
    });
    expect(result[0].dayOfWeek).toBeUndefined();
  });

  it("upserts a recurring expense", () => {
    const db = makeDb();
    saveRecurringExpense(db, monthlyRecurring);
    saveRecurringExpense(db, { ...monthlyRecurring, amount: 200 });
    const result = getRecurringExpenses(db);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(200);
  });

  it("deletes a recurring expense", () => {
    const db = makeDb();
    saveRecurringExpense(db, monthlyRecurring);
    deleteRecurringExpense(db, "rec-1");
    expect(getRecurringExpenses(db)).toEqual([]);
  });

  it("updates lastGeneratedDate", () => {
    const db = makeDb();
    saveRecurringExpense(db, monthlyRecurring);
    updateLastGeneratedDate(db, "rec-1", "2026-04-15");
    const result = getRecurringExpenses(db);
    expect(result[0].lastGeneratedDate).toBe("2026-04-15");
  });
});

// ---------------------------------------------------------------------------
// Budget history
// ---------------------------------------------------------------------------

describe("budget history", () => {
  it("returns empty array when none exist", () => {
    const db = makeDb();
    expect(getBudgetHistory(db)).toEqual([]);
  });

  it("saves and retrieves budget history entries", () => {
    const db = makeDb();
    saveBudgetHistory(db, "2026-03-30", 400);
    saveBudgetHistory(db, "2026-04-06", 450);
    const result = getBudgetHistory(db);
    expect(result).toHaveLength(2);
    // ordered descending
    expect(result[0].startDate).toBe("2026-04-06");
    expect(result[1].startDate).toBe("2026-03-30");
  });

  it("upserts an existing budget history entry", () => {
    const db = makeDb();
    saveBudgetHistory(db, "2026-04-06", 400);
    saveBudgetHistory(db, "2026-04-06", 500);
    const result = getBudgetHistory(db);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

describe("categories", () => {
  it("returns seeded default categories", () => {
    const db = makeDb();
    const cats = getCategories(db);
    expect(cats.length).toBeGreaterThanOrEqual(6);
  });

  it("saves a new custom category", () => {
    const db = makeDb();
    saveCategory(db, { name: "Pets", color: "#84cc16" });
    const cats = getCategories(db);
    const pets = cats.find((c) => c.name === "Pets");
    expect(pets).toBeDefined();
    expect(pets?.color).toBe("#84cc16");
  });

  it("updates the color of an existing category", () => {
    const db = makeDb();
    saveCategory(db, { name: "Food", color: "#000000" });
    const cats = getCategories(db);
    const food = cats.find((c) => c.name === "Food");
    expect(food?.color).toBe("#000000");
  });

  it("deletes a category", () => {
    const db = makeDb();
    saveCategory(db, { name: "Pets", color: "#84cc16" });
    const { deleteCategory } = require("@/utils/storage");
    deleteCategory(db, "Pets");
    const cats = getCategories(db);
    expect(cats.find((c) => c.name === "Pets")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

const testPrefs: Preferences = {
  weeklyBudget: 300,
  firstUseDate: "2026-01-01",
  locale: "en-GB",
  currency: "GBP",
  lockEnabled: false,
  notifyDailyExpense: false,
  notifyWeeklyBackup: false,
  crashlyticsEnabled: false,
};

describe("preferences", () => {
  it("returns defaults when no preferences row exists", () => {
    const db = makeDb();
    const prefs = getPreferences(db);
    expect(prefs.weeklyBudget).toBe(200);
    expect(prefs.locale).toBe("en-US");
    expect(prefs.currency).toBe("USD");
  });

  it("saves and retrieves preferences", () => {
    const db = makeDb();
    setPreferences(db, testPrefs);
    const result = getPreferences(db);
    expect(result).toEqual(testPrefs);
  });

  it("updates preferences on subsequent saves", () => {
    const db = makeDb();
    setPreferences(db, testPrefs);
    setPreferences(db, { ...testPrefs, weeklyBudget: 999, currency: "EUR" });
    const result = getPreferences(db);
    expect(result.weeklyBudget).toBe(999);
    expect(result.currency).toBe("EUR");
  });

  it("enforces single-row constraint (only one preferences row)", () => {
    const db = makeDb();
    setPreferences(db, testPrefs);
    setPreferences(db, { ...testPrefs, weeklyBudget: 100 });
    const rows = db.getAllSync("SELECT * FROM preferences");
    expect(rows).toHaveLength(1);
  });
});
