import * as SQLite from "expo-sqlite";

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food", color: "#f97316" },
  { name: "Transportation", color: "#3b82f6" },
  { name: "Entertainment", color: "#a855f7" },
  { name: "Shopping", color: "#ec4899" },
  { name: "Bills", color: "#ef4444" },
  { name: "Other", color: "#6b7280" },
];

let _db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync("simplybudget.db");
    initDatabase(_db);
  }
  return _db;
}

// Exposed for testing — resets the singleton so tests can inject a fresh DB
export function _setDatabase(db: SQLite.SQLiteDatabase | null): void {
  _db = db;
}

export function initDatabase(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      recurringExpenseId TEXT
    );

    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      dayOfMonth INTEGER,
      dayOfWeek INTEGER,
      monthOfYear INTEGER,
      createdAt TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      lastGeneratedDate TEXT,
      CHECK (
        (frequency = 'weekly'   AND dayOfWeek IS NOT NULL AND dayOfMonth IS NULL     AND monthOfYear IS NULL) OR
        (frequency = 'monthly'  AND dayOfMonth IS NOT NULL AND dayOfWeek IS NULL     AND monthOfYear IS NULL) OR
        (frequency = 'annually' AND dayOfMonth IS NOT NULL AND monthOfYear IS NOT NULL AND dayOfWeek IS NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS budget_history (
      startDate TEXT PRIMARY KEY,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      weeklyBudget REAL NOT NULL,
      firstUseDate TEXT NOT NULL,
      locale TEXT NOT NULL,
      currency TEXT NOT NULL
    );
  `);

  seedDefaultCategories(db);
}

function seedDefaultCategories(db: SQLite.SQLiteDatabase): void {
  for (const cat of DEFAULT_CATEGORIES) {
    db.runSync(
      "INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)",
      cat.name,
      cat.color
    );
  }
}
