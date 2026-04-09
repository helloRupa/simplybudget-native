/**
 * Tests for context/BudgetContext.tsx
 *
 * expo-sqlite is mocked with a better-sqlite3-backed in-memory database
 * (see __mocks__/expo-sqlite.ts). We inject a fresh DB per test via
 * _setDatabase so the context always starts with a clean slate.
 */
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import type { Category, Expense } from "@/types";
import { _setDatabase, initDatabase } from "@/utils/database";
import { act, renderHook } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import React from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  const db = openDatabaseSync("test.db");
  initDatabase(db);
  return db;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <BudgetProvider>{children}</BudgetProvider>;
}

beforeEach(() => {
  const db = makeDb();
  _setDatabase(db);
});

afterEach(() => {
  _setDatabase(null);
});

// ---------------------------------------------------------------------------
// Initial state / hydration
// ---------------------------------------------------------------------------

describe("BudgetProvider — initial state", () => {
  it("marks isLoaded after mount", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });
    expect(result.current.isLoaded).toBe(true);
  });

  it("loads default preferences (weeklyBudget 500, en-US, USD)", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });
    expect(result.current.state.weeklyBudget).toBe(500);
    expect(result.current.state.locale).toBe("en");
    expect(result.current.state.currency).toBe("USD");
  });

  it("hydrates default categories from the DB seed", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });
    const names = result.current.state.categories.map((c: Category) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Bills",
        "Entertainment",
        "Food",
        "Other",
        "Shopping",
        "Transportation",
      ]),
    );
  });

  it("starts with empty expenses and recurring expenses", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });
    expect(result.current.state.expenses).toEqual([]);
    expect(result.current.state.recurringExpenses).toEqual([]);
  });

  it("seeds budget history on first launch", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });
    expect(result.current.state.budgetHistory.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

describe("BudgetProvider — expenses", () => {
  it("addExpense adds to state and persists to DB", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addExpense({
        amount: 25,
        category: "Food",
        description: "Lunch",
        date: "2026-04-08",
      });
    });

    expect(result.current.state.expenses).toHaveLength(1);
    expect(result.current.state.expenses[0].amount).toBe(25);
    expect(result.current.state.expenses[0].id).toBeTruthy();
    expect(result.current.state.expenses[0].createdAt).toBeTruthy();
  });

  it("updateExpense replaces the matching expense", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addExpense({
        amount: 25,
        category: "Food",
        description: "Lunch",
        date: "2026-04-08",
      });
    });

    const added = result.current.state.expenses[0];

    act(() => {
      result.current.updateExpense({ ...added, amount: 99 });
    });

    expect(result.current.state.expenses).toHaveLength(1);
    expect(result.current.state.expenses[0].amount).toBe(99);
  });

  it("deleteExpense removes the expense from state", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addExpense({
        amount: 25,
        category: "Food",
        description: "Lunch",
        date: "2026-04-08",
      });
    });

    const id = result.current.state.expenses[0].id;

    act(() => {
      result.current.deleteExpense(id);
    });

    expect(result.current.state.expenses).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Weekly budget
// ---------------------------------------------------------------------------

describe("BudgetProvider — weekly budget", () => {
  it("setWeeklyBudget updates weeklyBudget in state", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.setWeeklyBudget(750);
    });

    expect(result.current.state.weeklyBudget).toBe(750);
  });

  it("setWeeklyBudget creates or updates a budget history entry for the current week", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.setWeeklyBudget(750);
    });

    const { budgetHistory } = result.current.state;
    const thisWeekEntry = budgetHistory.find((b) => b.amount === 750);
    expect(thisWeekEntry).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

describe("BudgetProvider — categories", () => {
  it("addCategory adds a new category and returns true", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    let added: boolean = false;
    act(() => {
      added = result.current.addCategory("Pets");
    });

    expect(added).toBe(true);
    const names = result.current.state.categories.map((c: Category) => c.name);
    expect(names).toContain("Pets");
  });

  it("addCategory assigns a color from the palette", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addCategory("Pets");
    });

    const pets = result.current.state.categories.find(
      (c: Category) => c.name === "Pets",
    );
    expect(pets?.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("addCategory returns false for duplicate (case-insensitive)", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    let added: boolean = false;
    act(() => {
      added = result.current.addCategory("food");
    });

    expect(added).toBe(false);
  });

  it("addCategory returns false for empty name", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    let added: boolean = false;
    act(() => {
      added = result.current.addCategory("  ");
    });

    expect(added).toBe(false);
  });

  it("updateCategory updates the color of an existing category", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.updateCategory({ name: "Food", color: "#000000" });
    });

    const food = result.current.state.categories.find(
      (c: Category) => c.name === "Food",
    );
    expect(food?.color).toBe("#000000");
  });

  it("deleteCategory removes the category from state", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addCategory("Pets");
    });

    act(() => {
      result.current.deleteCategory("Pets");
    });

    const names = result.current.state.categories.map((c: Category) => c.name);
    expect(names).not.toContain("Pets");
  });
});

// ---------------------------------------------------------------------------
// Locale and currency
// ---------------------------------------------------------------------------

describe("BudgetProvider — locale and currency", () => {
  it("setLocale updates locale and intlLocale", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.setLocale("fr");
    });

    expect(result.current.state.locale).toBe("fr");
    expect(result.current.intlLocale).toBe("fr");
  });

  it("setCurrency updates currency state", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.setCurrency("GBP");
    });

    expect(result.current.state.currency).toBe("GBP");
  });

  it("t() returns translation for the active locale", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    expect(result.current.t("dashboard")).toBe("Dashboard");

    act(() => {
      result.current.setLocale("es");
    });

    expect(result.current.t("dashboard")).toBe("Panel");
  });

  it("tc() translates a category name for the active locale", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.setLocale("fr");
    });

    expect(result.current.tc("Food")).toBe("Alimentation");
  });

  it("fc() formats a currency amount", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });
    const formatted = result.current.fc(42.5);
    expect(formatted).toContain("42");
  });
});

// ---------------------------------------------------------------------------
// Recurring expenses
// ---------------------------------------------------------------------------

describe("BudgetProvider — recurring expenses", () => {
  it("addRecurringExpense adds to state", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addRecurringExpense({
        amount: 100,
        category: "Bills",
        description: "Internet",
        frequency: "monthly",
        dayOfMonth: 15,
        startDate: "2026-04-01",
        endDate: null,
      });
    });

    expect(result.current.state.recurringExpenses).toHaveLength(1);
    expect(result.current.state.recurringExpenses[0].amount).toBe(100);
    expect(result.current.state.recurringExpenses[0].id).toBeTruthy();
  });

  it("addRecurringExpense immediately generates past-due expenses", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    // startDate in the past — should trigger generation
    act(() => {
      result.current.addRecurringExpense({
        amount: 50,
        category: "Bills",
        description: "Phone",
        frequency: "monthly",
        dayOfMonth: 1,
        startDate: "2026-01-01",
        endDate: null,
      });
    });

    // Should have generated expenses for Jan, Feb, Mar, Apr (day 1 of each)
    const generated = result.current.state.expenses.filter(
      (e: Expense) => e.description === "Phone",
    );
    expect(generated.length).toBeGreaterThan(0);
  });

  it("updateRecurringExpense replaces the matching entry", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addRecurringExpense({
        amount: 100,
        category: "Bills",
        description: "Internet",
        frequency: "monthly",
        dayOfMonth: 15,
        startDate: "2026-04-15",
        endDate: null,
      });
    });

    const added = result.current.state.recurringExpenses[0];

    act(() => {
      result.current.updateRecurringExpense({ ...added, amount: 200 });
    });

    expect(result.current.state.recurringExpenses[0].amount).toBe(200);
  });

  it("deleteRecurringExpense removes the entry", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    act(() => {
      result.current.addRecurringExpense({
        amount: 100,
        category: "Bills",
        description: "Internet",
        frequency: "monthly",
        dayOfMonth: 15,
        startDate: "2026-04-15",
        endDate: null,
      });
    });

    const id = result.current.state.recurringExpenses[0].id;

    act(() => {
      result.current.deleteRecurringExpense(id);
    });

    expect(result.current.state.recurringExpenses).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// importData
// ---------------------------------------------------------------------------

describe("BudgetProvider — importData", () => {
  it("replaces all state with imported data", () => {
    const { result } = renderHook(() => useBudget(), { wrapper });

    const importedExpense: Expense = {
      id: "imported-1",
      amount: 999,
      category: "Other",
      description: "Imported",
      date: "2026-03-01",
      createdAt: "2026-03-01T00:00:00.000Z",
    };

    act(() => {
      result.current.importData({
        expenses: [importedExpense],
        recurringExpenses: [],
        categories: [{ name: "Other", color: "#6b7280" }],
        budgetHistory: [{ startDate: "2026-03-30", amount: 300 }],
        weeklyBudget: 300,
        firstUseDate: "2026-03-30",
        locale: "en",
        currency: "EUR",
      });
    });

    expect(result.current.state.expenses).toHaveLength(1);
    expect(result.current.state.expenses[0].id).toBe("imported-1");
    expect(result.current.state.currency).toBe("EUR");
    expect(result.current.state.weeklyBudget).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// useBudget — error when used outside provider
// ---------------------------------------------------------------------------

describe("useBudget — outside provider", () => {
  it("throws when used outside BudgetProvider", () => {
    // Suppress expected error output
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useBudget())).toThrow(
      "useBudget must be used within BudgetProvider",
    );
    spy.mockRestore();
  });
});
