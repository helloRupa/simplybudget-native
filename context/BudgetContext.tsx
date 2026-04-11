import { CUSTOM_CATEGORY_COLORS } from "@/constants/colors";
import {
  LocaleKey,
  TranslationKey,
  categoryTranslations,
  locales,
} from "@/i18n/locales";
import { Category, Expense, RecurringExpense, WeeklyBudget } from "@/types";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
import { getDatabase } from "@/utils/database";
import { formatDate, getWeekRange, toISODate } from "@/utils/dates";
import { MOCK_STATE } from "@/utils/mockData";
import { generatePendingExpenses } from "@/utils/recurring";
import {
  deleteCategory as dbDeleteCategory,
  deleteExpense as dbDeleteExpense,
  deleteRecurringExpense as dbDeleteRecurringExpense,
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
import * as Crypto from "expo-crypto";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

// Load pre-populated mock data in dev builds. Always false in production.
const USE_MOCK_DATA = __DEV__ && process.env.NODE_ENV !== "test" && true;

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface State {
  expenses: Expense[];
  weeklyBudget: number;
  categories: Category[];
  firstUseDate: string;
  locale: LocaleKey;
  currency: string;
  recurringExpenses: RecurringExpense[];
  budgetHistory: WeeklyBudget[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "SET_INITIAL"; payload: State }
  | { type: "ADD_EXPENSE"; payload: Expense }
  | { type: "UPDATE_EXPENSE"; payload: Expense }
  | { type: "DELETE_EXPENSE"; payload: string }
  | {
      type: "SET_WEEKLY_BUDGET";
      payload: { amount: number; weekStart: string };
    }
  | { type: "ADD_CATEGORY"; payload: Category }
  | { type: "UPDATE_CATEGORY"; payload: Category }
  | { type: "DELETE_CATEGORY"; payload: string }
  | { type: "SET_LOCALE"; payload: LocaleKey }
  | { type: "SET_CURRENCY"; payload: string }
  | { type: "ADD_RECURRING_EXPENSE"; payload: RecurringExpense }
  | { type: "UPDATE_RECURRING_EXPENSE"; payload: RecurringExpense }
  | { type: "DELETE_RECURRING_EXPENSE"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INITIAL":
      return action.payload;
    case "ADD_EXPENSE":
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };
    case "SET_WEEKLY_BUDGET": {
      const { amount, weekStart } = action.payload;
      const existing = state.budgetHistory.findIndex(
        (b) => b.startDate === weekStart,
      );
      const newEntry: WeeklyBudget = { amount, startDate: weekStart };
      const updatedHistory =
        existing >= 0
          ? state.budgetHistory.map((b, i) => (i === existing ? newEntry : b))
          : [...state.budgetHistory, newEntry].sort((a, b) =>
              a.startDate.localeCompare(b.startDate),
            );
      return { ...state, weeklyBudget: amount, budgetHistory: updatedHistory };
    }
    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };
    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.name === action.payload.name ? action.payload : c,
        ),
      };
    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.name !== action.payload),
      };
    case "SET_LOCALE":
      return { ...state, locale: action.payload };
    case "SET_CURRENCY":
      return { ...state, currency: action.payload };
    case "ADD_RECURRING_EXPENSE":
      return {
        ...state,
        recurringExpenses: [...state.recurringExpenses, action.payload],
      };
    case "UPDATE_RECURRING_EXPENSE":
      return {
        ...state,
        recurringExpenses: state.recurringExpenses.map((r) =>
          r.id === action.payload.id ? action.payload : r,
        ),
      };
    case "DELETE_RECURRING_EXPENSE":
      return {
        ...state,
        recurringExpenses: state.recurringExpenses.filter(
          (r) => r.id !== action.payload,
        ),
      };
  }
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface BudgetContextValue {
  state: State;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  setWeeklyBudget: (amount: number) => void;
  addCategory: (name: string) => boolean;
  updateCategory: (category: Category) => void;
  deleteCategory: (name: string) => void;
  setLocale: (locale: LocaleKey) => void;
  setCurrency: (currency: string) => void;
  importData: (data: State) => void;
  addRecurringExpense: (
    expense: Omit<RecurringExpense, "id" | "createdAt" | "lastGeneratedDate">,
  ) => void;
  updateRecurringExpense: (expense: RecurringExpense) => void;
  deleteRecurringExpense: (id: string) => void;
  t: (key: TranslationKey) => string;
  tc: (category: string) => string;
  fc: (amount: number) => string;
  fd: (dateStr: string) => string;
  currencySymbol: string;
  intlLocale: string;
  isLoaded: boolean;
}

// Maps LocaleKey → BCP 47 tag used for Intl APIs
const LOCALE_TO_INTL: Record<LocaleKey, string> = {
  en: "en-US",
  es: "es",
  fr: "fr",
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const db = getDatabase();

  const [state, dispatch] = useReducer(reducer, {
    expenses: [],
    weeklyBudget: 200,
    categories: [],
    firstUseDate: toISODate(getWeekRange().start),
    locale: "en",
    currency: "USD",
    recurringExpenses: [],
    budgetHistory: [],
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Hydrate from SQLite on mount
  useEffect(() => {
    if (USE_MOCK_DATA) {
      dispatch({ type: "SET_INITIAL", payload: MOCK_STATE });
      setIsLoaded(true);
      return;
    }

    const expenses = getExpenses(db);
    const recurringExpenses = getRecurringExpenses(db);
    const categories = getCategories(db);
    const budgetHistory = getBudgetHistory(db);
    const prefs = getPreferences(db);

    const weekStart = toISODate(getWeekRange().start);
    const firstUseDate = prefs.firstUseDate;

    // Determine locale key from stored locale string
    const localeKey = prefs.locale.startsWith("es")
      ? "es"
      : prefs.locale.startsWith("fr")
        ? "fr"
        : "en";

    const loaded: State = {
      expenses,
      recurringExpenses,
      categories,
      budgetHistory,
      weeklyBudget: prefs.weeklyBudget,
      firstUseDate,
      locale: localeKey,
      currency: prefs.currency,
    };

    // Seed budget history on first launch (no history yet)
    if (loaded.budgetHistory.length === 0) {
      const seedEntry = {
        amount: loaded.weeklyBudget,
        startDate: firstUseDate,
      };
      saveBudgetHistory(db, seedEntry.startDate, seedEntry.amount);
      loaded.budgetHistory = [seedEntry];
    }

    // Ensure current week has a budget history entry
    const hasCurrentWeek = loaded.budgetHistory.some(
      (b) => b.startDate === weekStart,
    );
    if (!hasCurrentWeek) {
      // Find the most recent budget before this week
      const sorted = [...loaded.budgetHistory].sort((a, b) =>
        b.startDate.localeCompare(a.startDate),
      );
      const latest = sorted.find((b) => b.startDate <= weekStart);
      if (latest) {
        saveBudgetHistory(db, weekStart, latest.amount);
        loaded.budgetHistory = [
          ...loaded.budgetHistory,
          { amount: latest.amount, startDate: weekStart },
        ];
      }
    }

    // Generate any pending recurring expenses
    if (loaded.recurringExpenses.length > 0) {
      const { newExpenses, updatedRecurringExpenses } = generatePendingExpenses(
        loaded.recurringExpenses,
        new Date(),
      );

      if (newExpenses.length > 0) {
        newExpenses.forEach((exp) => saveExpense(db, exp));
        updatedRecurringExpenses.forEach((re) => {
          if (re.lastGeneratedDate) {
            updateLastGeneratedDate(db, re.id, re.lastGeneratedDate);
          }
        });
        loaded.expenses = [...newExpenses, ...loaded.expenses];
        loaded.recurringExpenses = updatedRecurringExpenses;
      }
    }

    dispatch({ type: "SET_INITIAL", payload: loaded });
    setIsLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Action handlers — write to DB at action time
  // ---------------------------------------------------------------------------

  const addExpense = useCallback(
    (expense: Omit<Expense, "id" | "createdAt">) => {
      const newExpense: Expense = {
        ...expense,
        id: Crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      saveExpense(db, newExpense);
      dispatch({ type: "ADD_EXPENSE", payload: newExpense });
    },
    [db],
  );

  const updateExpense = useCallback(
    (expense: Expense) => {
      saveExpense(db, expense);
      dispatch({ type: "UPDATE_EXPENSE", payload: expense });
    },
    [db],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      dbDeleteExpense(db, id);
      dispatch({ type: "DELETE_EXPENSE", payload: id });
    },
    [db],
  );

  const setWeeklyBudget = useCallback(
    (amount: number) => {
      const weekStart = toISODate(getWeekRange().start);
      saveBudgetHistory(db, weekStart, amount);
      // preferences weeklyBudget is kept in sync for quick reads
      const prefs = getPreferences(db);
      setPreferences(db, { ...prefs, weeklyBudget: amount });
      dispatch({ type: "SET_WEEKLY_BUDGET", payload: { amount, weekStart } });
    },
    [db],
  );

  const addCategory = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      if (trimmed.length > 30) return false;

      if (
        state.categories.some(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        return false;
      }

      const color =
        CUSTOM_CATEGORY_COLORS[
          Math.floor(Math.random() * CUSTOM_CATEGORY_COLORS.length)
        ];
      const cat: Category = { name: trimmed, color };
      saveCategory(db, cat);
      dispatch({ type: "ADD_CATEGORY", payload: cat });
      return true;
    },
    [db, state.categories],
  );

  const updateCategory = useCallback(
    (category: Category) => {
      saveCategory(db, category);
      dispatch({ type: "UPDATE_CATEGORY", payload: category });
    },
    [db],
  );

  const deleteCategory = useCallback(
    (name: string) => {
      dbDeleteCategory(db, name);
      dispatch({ type: "DELETE_CATEGORY", payload: name });
    },
    [db],
  );

  const setLocale = useCallback(
    (locale: LocaleKey) => {
      const prefs = getPreferences(db);
      setPreferences(db, { ...prefs, locale: LOCALE_TO_INTL[locale] });
      dispatch({ type: "SET_LOCALE", payload: locale });
    },
    [db],
  );

  const setCurrency = useCallback(
    (currency: string) => {
      const prefs = getPreferences(db);
      setPreferences(db, { ...prefs, currency });
      dispatch({ type: "SET_CURRENCY", payload: currency });
    },
    [db],
  );

  const addRecurringExpense = useCallback(
    (
      expense: Omit<RecurringExpense, "id" | "createdAt" | "lastGeneratedDate">,
    ) => {
      const newRecurring: RecurringExpense = {
        ...expense,
        id: Crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastGeneratedDate: null,
      };
      saveRecurringExpense(db, newRecurring);
      dispatch({ type: "ADD_RECURRING_EXPENSE", payload: newRecurring });

      // Immediately generate any pending expenses for the new recurring entry
      const { newExpenses, updatedRecurringExpenses } = generatePendingExpenses(
        [newRecurring],
        new Date(),
      );

      if (newExpenses.length > 0) {
        newExpenses.forEach((exp) => {
          saveExpense(db, exp);
          dispatch({ type: "ADD_EXPENSE", payload: exp });
        });
        const updated = updatedRecurringExpenses[0];
        if (updated.lastGeneratedDate) {
          updateLastGeneratedDate(db, updated.id, updated.lastGeneratedDate);
        }
        dispatch({ type: "UPDATE_RECURRING_EXPENSE", payload: updated });
      }
    },
    [db],
  );

  const updateRecurringExpense = useCallback(
    (expense: RecurringExpense) => {
      saveRecurringExpense(db, expense);
      dispatch({ type: "UPDATE_RECURRING_EXPENSE", payload: expense });
    },
    [db],
  );

  const deleteRecurringExpense = useCallback(
    (id: string) => {
      dbDeleteRecurringExpense(db, id);
      dispatch({ type: "DELETE_RECURRING_EXPENSE", payload: id });
    },
    [db],
  );

  const importData = useCallback(
    (data: State) => {
      // Write all imported data to DB
      data.expenses.forEach((e) => saveExpense(db, e));
      data.recurringExpenses.forEach((r) => saveRecurringExpense(db, r));
      data.categories.forEach((c) => saveCategory(db, c));
      data.budgetHistory.forEach((b) =>
        saveBudgetHistory(db, b.startDate, b.amount),
      );
      setPreferences(db, {
        weeklyBudget: data.weeklyBudget,
        firstUseDate: data.firstUseDate,
        locale: LOCALE_TO_INTL[data.locale],
        currency: data.currency,
      });
      dispatch({ type: "SET_INITIAL", payload: data });
    },
    [db],
  );

  // ---------------------------------------------------------------------------
  // Derived helpers
  // ---------------------------------------------------------------------------

  const intlLocale = LOCALE_TO_INTL[state.locale];
  const currencySymbol = getCurrencySymbol(state.currency, intlLocale);

  const t = useCallback(
    (key: TranslationKey): string => locales[state.locale][key],
    [state.locale],
  );

  const tc = useCallback(
    (category: string): string =>
      categoryTranslations[state.locale][category] ?? category,
    [state.locale],
  );

  const fc = useCallback(
    (amount: number): string =>
      formatCurrency(amount, intlLocale, state.currency),
    [intlLocale, state.currency],
  );

  const fd = useCallback(
    (dateStr: string): string => formatDate(dateStr, intlLocale),
    [intlLocale],
  );

  return (
    <BudgetContext.Provider
      value={{
        state,
        addExpense,
        updateExpense,
        deleteExpense,
        setWeeklyBudget,
        addCategory,
        updateCategory,
        deleteCategory,
        setLocale,
        setCurrency,
        importData,
        addRecurringExpense,
        updateRecurringExpense,
        deleteRecurringExpense,
        t,
        tc,
        fc,
        fd,
        currencySymbol,
        intlLocale,
        isLoaded,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);

  if (!ctx) {
    throw new Error("useBudget must be used within BudgetProvider");
  }

  return ctx;
}
