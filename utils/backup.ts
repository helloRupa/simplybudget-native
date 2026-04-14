import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Expense, RecurringExpense, WeeklyBudget, Category } from "@/types";
import { LocaleKey } from "@/i18n/locales";
import { State } from "@/context/BudgetContext";

const BACKUP_VERSION = 1;

interface BackupFile {
  version: number;
  exportedAt: string;
  data: {
    expenses: Expense[];
    weeklyBudget: number;
    categories: unknown[];
    firstUseDate: string;
    locale: string;
    currency: string;
    recurringExpenses: RecurringExpense[];
    budgetHistory: WeeklyBudget[];
    lockEnabled?: boolean;
  };
}

export async function exportBackup(state: State): Promise<void> {
  const now = new Date();
  const { lockEnabled: _omit, crashlyticsEnabled: _omit2, ...exportableState } = state;
  const backup = {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: exportableState,
  };
  const json = JSON.stringify(backup, null, 2);
  const filename = `simplybudget-backup-${now.toISOString().slice(0, 10)}.json`;
  const uri = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: filename,
  });
}

export async function pickAndParseBackup(): Promise<State> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*", // broad type so local Files app appears on Android
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    throw new Error("cancelled");
  }

  const asset = result.assets[0];
  if (asset.name && !asset.name.toLowerCase().endsWith(".json")) {
    throw new Error("Please select a .json backup file.");
  }

  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: BackupFile;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid backup file format.");
  }

  if (!parsed?.version || !parsed?.data) {
    throw new Error("Invalid backup file format.");
  }

  const { data } = parsed;

  if (
    !Array.isArray(data.expenses) ||
    typeof data.weeklyBudget !== "number" ||
    !Array.isArray(data.categories) ||
    typeof data.firstUseDate !== "string"
  ) {
    throw new Error("Backup file is missing required data.");
  }

  // Handle categories: string[] (web backup) or Category[] (native backup)
  let categories: Category[];
  if (data.categories.length === 0) {
    categories = [];
  } else if (typeof data.categories[0] === "string") {
    const fallbackColors = [
      "#f97316",
      "#3b82f6",
      "#a855f7",
      "#ec4899",
      "#ef4444",
      "#6b7280",
    ];
    categories = (data.categories as string[]).map((name, i) => ({
      name,
      color: fallbackColors[i % fallbackColors.length],
    }));
  } else {
    categories = data.categories as Category[];
  }

  const locale: LocaleKey = data.locale.startsWith("es")
    ? "es"
    : data.locale.startsWith("fr")
      ? "fr"
      : "en";

  return {
    expenses: data.expenses,
    weeklyBudget: data.weeklyBudget,
    categories,
    firstUseDate: data.firstUseDate,
    locale,
    currency: data.currency ?? "USD",
    recurringExpenses: data.recurringExpenses ?? [],
    budgetHistory: data.budgetHistory ?? [],
    lockEnabled: false, // never inherit from backup — lock is a per-device setting
    notifyDailyExpense: false, // never inherit from backup — notification prefs are per-device
    notifyWeeklyBackup: false, // never inherit from backup — notification prefs are per-device
    crashlyticsEnabled: false, // never inherit from backup — consent is a per-device setting
  };
}
