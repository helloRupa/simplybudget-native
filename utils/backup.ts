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
  };
}

export async function exportBackup(state: State): Promise<void> {
  const now = new Date();
  const backup = {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: state,
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
    type: "application/json",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    throw new Error("cancelled");
  }

  const uri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const parsed: BackupFile = JSON.parse(content);

  if (!parsed.version || !parsed.data) {
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
  };
}
