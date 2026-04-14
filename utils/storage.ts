import type { SQLiteDatabase } from "expo-sqlite";
import type {
  Category,
  Expense,
  Preferences,
  RecurringExpense,
} from "@/types";
import { getWeekRange, toISODate } from "@/utils/dates";

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function getExpenses(db: SQLiteDatabase): Expense[] {
  const rows = db.getAllSync<{
    id: string;
    amount: number;
    category: string;
    description: string | null;
    date: string;
    createdAt: string;
    recurringExpenseId: string | null;
  }>("SELECT * FROM expenses ORDER BY date DESC, createdAt DESC");

  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    category: r.category,
    description: r.description ?? "",
    date: r.date,
    createdAt: r.createdAt,
    ...(r.recurringExpenseId ? { recurringExpenseId: r.recurringExpenseId } : {}),
  }));
}

export function saveExpense(db: SQLiteDatabase, expense: Expense): void {
  db.runSync(
    `INSERT INTO expenses (id, amount, category, description, date, createdAt, recurringExpenseId)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       amount = excluded.amount,
       category = excluded.category,
       description = excluded.description,
       date = excluded.date,
       createdAt = excluded.createdAt,
       recurringExpenseId = excluded.recurringExpenseId`,
    expense.id,
    expense.amount,
    expense.category,
    expense.description ?? null,
    expense.date,
    expense.createdAt,
    expense.recurringExpenseId ?? null
  );
}

export function deleteExpense(db: SQLiteDatabase, id: string): void {
  db.runSync("DELETE FROM expenses WHERE id = ?", id);
}

// ---------------------------------------------------------------------------
// Recurring expenses
// ---------------------------------------------------------------------------

export function getRecurringExpenses(db: SQLiteDatabase): RecurringExpense[] {
  const rows = db.getAllSync<{
    id: string;
    amount: number;
    category: string;
    description: string | null;
    frequency: string;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    monthOfYear: number | null;
    createdAt: string;
    startDate: string;
    endDate: string | null;
    lastGeneratedDate: string | null;
  }>("SELECT * FROM recurring_expenses ORDER BY createdAt DESC");

  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    category: r.category,
    description: r.description ?? "",
    frequency: r.frequency as RecurringExpense["frequency"],
    dayOfMonth: r.dayOfMonth ?? 1,
    ...(r.dayOfWeek != null ? { dayOfWeek: r.dayOfWeek } : {}),
    ...(r.monthOfYear != null ? { monthOfYear: r.monthOfYear } : {}),
    createdAt: r.createdAt,
    startDate: r.startDate,
    endDate: r.endDate,
    lastGeneratedDate: r.lastGeneratedDate,
  }));
}

export function saveRecurringExpense(
  db: SQLiteDatabase,
  expense: RecurringExpense
): void {
  // Enforce per-frequency nulls to satisfy the DB CHECK constraint
  const isWeekly = expense.frequency === "weekly";
  const isAnnually = expense.frequency === "annually";
  const dayOfMonth = isWeekly ? null : (expense.dayOfMonth ?? null);
  const dayOfWeek = isWeekly ? (expense.dayOfWeek ?? null) : null;
  const monthOfYear = isAnnually ? (expense.monthOfYear ?? null) : null;

  db.runSync(
    `INSERT INTO recurring_expenses
       (id, amount, category, description, frequency, dayOfMonth, dayOfWeek, monthOfYear, createdAt, startDate, endDate, lastGeneratedDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       amount = excluded.amount,
       category = excluded.category,
       description = excluded.description,
       frequency = excluded.frequency,
       dayOfMonth = excluded.dayOfMonth,
       dayOfWeek = excluded.dayOfWeek,
       monthOfYear = excluded.monthOfYear,
       createdAt = excluded.createdAt,
       startDate = excluded.startDate,
       endDate = excluded.endDate,
       lastGeneratedDate = excluded.lastGeneratedDate`,
    expense.id,
    expense.amount,
    expense.category,
    expense.description ?? null,
    expense.frequency,
    dayOfMonth,
    dayOfWeek,
    monthOfYear,
    expense.createdAt,
    expense.startDate,
    expense.endDate,
    expense.lastGeneratedDate
  );
}

export function deleteRecurringExpense(db: SQLiteDatabase, id: string): void {
  db.runSync("DELETE FROM recurring_expenses WHERE id = ?", id);
}

export function updateLastGeneratedDate(
  db: SQLiteDatabase,
  id: string,
  date: string
): void {
  db.runSync(
    "UPDATE recurring_expenses SET lastGeneratedDate = ? WHERE id = ?",
    date,
    id
  );
}

// ---------------------------------------------------------------------------
// Budget history
// ---------------------------------------------------------------------------

export function getBudgetHistory(
  db: SQLiteDatabase
): { startDate: string; amount: number }[] {
  return db.getAllSync<{ startDate: string; amount: number }>(
    "SELECT * FROM budget_history ORDER BY startDate DESC"
  );
}

export function saveBudgetHistory(
  db: SQLiteDatabase,
  startDate: string,
  amount: number
): void {
  db.runSync(
    "INSERT INTO budget_history (startDate, amount) VALUES (?, ?) ON CONFLICT(startDate) DO UPDATE SET amount = excluded.amount",
    startDate,
    amount
  );
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function getCategories(db: SQLiteDatabase): Category[] {
  return db.getAllSync<Category>("SELECT * FROM categories ORDER BY name ASC");
}

export function saveCategory(db: SQLiteDatabase, category: Category): void {
  db.runSync(
    "INSERT INTO categories (name, color) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET color = excluded.color",
    category.name,
    category.color
  );
}

export function deleteCategory(db: SQLiteDatabase, name: string): void {
  db.runSync("DELETE FROM categories WHERE name = ?", name);
}

export function clearAllData(db: SQLiteDatabase): void {
  db.runSync("DELETE FROM expenses");
  db.runSync("DELETE FROM recurring_expenses");
  db.runSync("DELETE FROM categories");
  db.runSync("DELETE FROM budget_history");
}

// ---------------------------------------------------------------------------
// Preferences (single-row table)
// ---------------------------------------------------------------------------

const PREFERENCES_DEFAULTS: Preferences = {
  weeklyBudget: 200,
  firstUseDate: toISODate(getWeekRange().start),
  locale: "en-US",
  currency: "USD",
  lockEnabled: false,
  notifyDailyExpense: false,
  notifyWeeklyBackup: false,
  crashlyticsEnabled: false,
};

export function getPreferences(db: SQLiteDatabase): Preferences {
  const row = db.getFirstSync<{
    weeklyBudget: number;
    firstUseDate: string;
    locale: string;
    currency: string;
    lockEnabled: number;
    notifyDailyExpense: number;
    notifyWeeklyBackup: number;
    crashlyticsEnabled: number;
  }>(
    "SELECT weeklyBudget, firstUseDate, locale, currency, lockEnabled, notifyDailyExpense, notifyWeeklyBackup, crashlyticsEnabled FROM preferences WHERE id = 1"
  );
  if (!row) return { ...PREFERENCES_DEFAULTS };
  return {
    weeklyBudget: row.weeklyBudget,
    firstUseDate: row.firstUseDate,
    locale: row.locale,
    currency: row.currency,
    lockEnabled: row.lockEnabled === 1,
    notifyDailyExpense: row.notifyDailyExpense === 1,
    notifyWeeklyBackup: row.notifyWeeklyBackup === 1,
    crashlyticsEnabled: row.crashlyticsEnabled === 1,
  };
}

export function setPreferences(
  db: SQLiteDatabase,
  prefs: Preferences
): void {
  db.runSync(
    `INSERT INTO preferences (id, weeklyBudget, firstUseDate, locale, currency, lockEnabled, notifyDailyExpense, notifyWeeklyBackup, crashlyticsEnabled)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       weeklyBudget = excluded.weeklyBudget,
       firstUseDate = excluded.firstUseDate,
       locale = excluded.locale,
       currency = excluded.currency,
       lockEnabled = excluded.lockEnabled,
       notifyDailyExpense = excluded.notifyDailyExpense,
       notifyWeeklyBackup = excluded.notifyWeeklyBackup,
       crashlyticsEnabled = excluded.crashlyticsEnabled`,
    prefs.weeklyBudget,
    prefs.firstUseDate,
    prefs.locale,
    prefs.currency,
    prefs.lockEnabled ? 1 : 0,
    prefs.notifyDailyExpense ? 1 : 0,
    prefs.notifyWeeklyBackup ? 1 : 0,
    prefs.crashlyticsEnabled ? 1 : 0
  );
}
