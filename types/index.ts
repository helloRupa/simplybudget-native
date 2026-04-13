export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime
  recurringExpenseId?: string;
}

export type RecurringFrequency = "weekly" | "monthly" | "annually";

export interface RecurringExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  frequency: RecurringFrequency;
  dayOfMonth: number; // 1-31 (used for monthly/annually)
  dayOfWeek?: number; // 0=Sunday..6=Saturday (used for weekly)
  monthOfYear?: number; // 0=Jan..11=Dec (used for annually)
  createdAt: string; // ISO datetime
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string | null;
  lastGeneratedDate: string | null;
}

export interface WeeklyBudget {
  amount: number;
  startDate: string; // ISO date of the Monday that begins this budget week
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  category: string;
  searchQuery: string;
}

export type SortField = "date" | "amount" | "category";
export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface Preferences {
  weeklyBudget: number;
  firstUseDate: string; // ISO date YYYY-MM-DD
  locale: string;
  currency: string;
  lockEnabled: boolean;
  notifyDailyExpense: boolean;
  notifyWeeklyBackup: boolean;
}

export interface Category {
  name: string;
  color: string;
}
