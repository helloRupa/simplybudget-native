import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isWithinInterval,
  addWeeks,
} from "date-fns";
import { WeeklyBudget } from "@/types";

export function getWeekRange(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return { start, end };
}

export function getMonthRange(date: Date = new Date()) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function formatDate(dateStr: string, intlLocale = "en-US"): string {
  try {
    const date = parseISO(dateStr);
    return new Intl.DateTimeFormat(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatShortDate(date: Date, intlLocale = "en-US"): string {
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isInRange(dateStr: string, from: string, to: string): boolean {
  if (!from && !to) {
    return true;
  }

  try {
    const date = parseISO(dateStr);
    const start = from ? parseISO(from) : new Date(0);
    const end = to ? parseISO(to) : new Date(9999, 11, 31);
    return isWithinInterval(date, { start, end });
  } catch {
    return false;
  }
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getBudgetForWeek(
  weekStart: Date,
  budgetHistory: WeeklyBudget[]
): number {
  const weekStartStr = toISODate(weekStart);

  for (const entry of budgetHistory) {
    if (entry.startDate <= weekStartStr) {
      return entry.amount;
    }
  }

  return 0;
}

export function getTotalBudgeted(
  firstUseDate: string,
  budgetHistory: WeeklyBudget[]
): number {
  const weekRanges = getWeekRanges(firstUseDate);
  return weekRanges.reduce(
    (sum, week) => sum + getBudgetForWeek(week.start, budgetHistory),
    0
  );
}

export function getWeekRanges(
  firstUseDate: string
): { start: Date; end: Date }[] {
  try {
    const startDate = startOfWeek(parseISO(firstUseDate), { weekStartsOn: 1 });
    const now = new Date();
    const weeks: { start: Date; end: Date }[] = [];
    let current = startDate;

    while (current <= now) {
      weeks.push({
        start: current,
        end: endOfWeek(current, { weekStartsOn: 1 }),
      });
      current = addWeeks(current, 1);
    }

    return weeks;
  } catch {
    return [];
  }
}
