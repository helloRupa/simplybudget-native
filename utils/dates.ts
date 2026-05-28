import { WeeklyBudget } from "@/types";
import {
  addDays,
  addWeeks,
  Day,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

export function getWeekRange(date: Date = new Date(), weekStartsOn: Day = 1) {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
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
  budgetHistory: WeeklyBudget[],
): number {
  const weekStartStr = toISODate(weekStart);

  for (const entry of budgetHistory) {
    if (weekStartStr >= entry.startDate) {
      return entry.amount;
    }
  }

  return 0;
}

export function getTotalBudgeted(
  firstUseDate: string,
  budgetHistory: WeeklyBudget[],
  weekStartsOn: Day = 1,
): number {
  const weekRanges = getWeekRanges(firstUseDate, weekStartsOn);
  return weekRanges.reduce(
    (sum, week) => sum + getBudgetForWeek(week.start, budgetHistory),
    0,
  );
}

/**
 * Computes the new firstUseDate when the budget week start day changes.
 *
 * Picks the `newWeekStartDay` weekday closest to `currentFirstUseDate` (forward
 * or backward, fewer days wins; on a tie, backward is preferred). Then applies
 * the expense guard: if the earliest expense falls strictly before the
 * candidate, the candidate is shifted back one week so firstUseDate never lands
 * after a user's first expense. A single 7-day shift is always sufficient
 * because the candidate is within ±3 days of the (already-valid) current
 * firstUseDate.
 *
 * Strict `<` (not `<=`) is deliberate: an expense exactly on the candidate
 * belongs to the first week (no shift), which also preserves round-trip closure
 * (e.g. Mon → Sun → Mon with an expense on Mon returns to Mon).
 */
export function computeShiftedFirstUseDate(
  currentFirstUseDate: string,
  newWeekStartDay: Day,
  earliestExpense: string | null,
): string {
  const current = parseISO(currentFirstUseDate);
  const back = startOfWeek(current, { weekStartsOn: newWeekStartDay });
  const fwd = addDays(back, 7);
  const dBack = differenceInCalendarDays(current, back);
  const dFwd = differenceInCalendarDays(fwd, current);
  const candidate = dBack <= dFwd ? back : fwd;

  const candidateStr = toISODate(candidate);
  const guarded =
    earliestExpense !== null && earliestExpense < candidateStr
      ? subDays(candidate, 7)
      : candidate;

  return toISODate(guarded);
}

export function getWeekRanges(
  firstUseDate: string,
  weekStartsOn: Day = 1,
): { start: Date; end: Date }[] {
  try {
    const startDate = startOfWeek(parseISO(firstUseDate), { weekStartsOn });
    const now = new Date();
    const weeks: { start: Date; end: Date }[] = [];
    let current = startDate;

    while (current <= now) {
      weeks.push({
        start: current,
        end: endOfWeek(current, { weekStartsOn }),
      });
      current = addWeeks(current, 1);
    }

    return weeks;
  } catch {
    return [];
  }
}
