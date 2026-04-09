import { Expense, RecurringExpense } from "@/types";
import { toISODate } from "./dates";
import { v4 as uuidv4 } from "uuid";
import {
  getDaysInMonth,
  parseISO,
  addMonths,
  addWeeks,
  startOfMonth,
} from "date-fns";

interface GenerationResult {
  newExpenses: Expense[];
  updatedRecurringExpenses: RecurringExpense[];
}

function clampDay(day: number, year: number, month: number): number {
  const maxDay = getDaysInMonth(new Date(year, month));
  return Math.min(day, maxDay);
}

function buildDate(year: number, month: number, day: number): string {
  const clamped = clampDay(day, year, month);
  return toISODate(new Date(year, month, clamped));
}

function buildExpense(re: RecurringExpense, date: string): Expense {
  return {
    id: uuidv4(),
    amount: re.amount,
    category: re.category,
    description: re.description,
    date,
    createdAt: new Date().toISOString(),
    recurringExpenseId: re.id,
  };
}

/** Migrate legacy recurring expenses that lack a frequency field */
function ensureFrequency(re: RecurringExpense): RecurringExpense {
  if (!re.frequency) {
    return { ...re, frequency: "monthly" };
  }

  return re;
}

function generateWeekly(
  re: RecurringExpense,
  today: Date,
  todayStr: string
): { expenses: Expense[]; lastDate: string | null } {
  const expenses: Expense[] = [];
  let lastDate = re.lastGeneratedDate;
  const dayOfWeek = re.dayOfWeek ?? 0;

  let cursor: Date;

  if (re.lastGeneratedDate) {
    cursor = addWeeks(parseISO(re.lastGeneratedDate), 1);
  } else {
    cursor = parseISO(re.startDate);
  }

  while (cursor.getDay() !== dayOfWeek) {
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1
    );
  }

  while (true) {
    const dateStr = toISODate(cursor);

    if (dateStr > todayStr) {
      break;
    }

    if (dateStr < re.startDate) {
      cursor = addWeeks(cursor, 1);
      continue;
    }

    if (re.endDate && dateStr > re.endDate) {
      break;
    }

    expenses.push(buildExpense(re, dateStr));
    lastDate = dateStr;
    cursor = addWeeks(cursor, 1);
  }

  return { expenses, lastDate };
}

function generateMonthly(
  re: RecurringExpense,
  todayStr: string
): { expenses: Expense[]; lastDate: string | null } {
  const expenses: Expense[] = [];
  let lastDate = re.lastGeneratedDate;

  let genStart: Date;

  if (re.lastGeneratedDate) {
    genStart = startOfMonth(addMonths(parseISO(re.lastGeneratedDate), 1));
  } else {
    genStart = startOfMonth(parseISO(re.startDate));
  }

  let year = genStart.getFullYear();
  let month = genStart.getMonth();

  while (true) {
    const clampedDay = clampDay(re.dayOfMonth, year, month);
    const expenseDate = buildDate(year, month, clampedDay);

    if (expenseDate > todayStr) {
      break;
    }

    if (expenseDate < re.startDate) {
      month++;

      if (month > 11) {
        month = 0;
        year++;
      }

      continue;
    }

    if (re.endDate && expenseDate > re.endDate) {
      break;
    }

    expenses.push(buildExpense(re, expenseDate));
    lastDate = expenseDate;

    month++;

    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return { expenses, lastDate };
}

function generateAnnually(
  re: RecurringExpense,
  todayStr: string
): { expenses: Expense[]; lastDate: string | null } {
  const expenses: Expense[] = [];
  let lastDate = re.lastGeneratedDate;
  const targetMonth = re.monthOfYear ?? parseISO(re.startDate).getMonth();

  let startYear: number;

  if (re.lastGeneratedDate) {
    startYear = parseISO(re.lastGeneratedDate).getFullYear() + 1;
  } else {
    startYear = parseISO(re.startDate).getFullYear();
  }

  for (let year = startYear; ; year++) {
    const clampedDay = clampDay(re.dayOfMonth, year, targetMonth);
    const expenseDate = buildDate(year, targetMonth, clampedDay);

    if (expenseDate > todayStr) {
      break;
    }

    if (expenseDate < re.startDate) {
      continue;
    }

    if (re.endDate && expenseDate > re.endDate) {
      break;
    }

    expenses.push(buildExpense(re, expenseDate));
    lastDate = expenseDate;
  }

  return { expenses, lastDate };
}

export function generatePendingExpenses(
  recurringExpenses: RecurringExpense[],
  today: Date
): GenerationResult {
  const newExpenses: Expense[] = [];
  const updatedRecurringExpenses = recurringExpenses.map((raw) => {
    const re = ensureFrequency(raw);
    const updated = { ...re };
    const todayStr = toISODate(today);

    if (parseISO(updated.startDate) > today) {
      return updated;
    }

    let result: { expenses: Expense[]; lastDate: string | null };

    switch (updated.frequency) {
      case "weekly":
        result = generateWeekly(updated, today, todayStr);
        break;
      case "annually":
        result = generateAnnually(updated, todayStr);
        break;
      case "monthly":
      default:
        result = generateMonthly(updated, todayStr);
        break;
    }

    newExpenses.push(...result.expenses);

    if (result.lastDate) {
      updated.lastGeneratedDate = result.lastDate;
    }

    return updated;
  });

  return { newExpenses, updatedRecurringExpenses };
}
