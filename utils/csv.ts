import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Expense } from "@/types";

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportToCSV(
  expenses: Expense[],
  translate: (key: string) => string,
  translateCategory: (category: string) => string,
  formatDate: (dateStr: string) => string
): Promise<void> {
  const headers = [
    translate("date"),
    translate("amount"),
    translate("category"),
    translate("description"),
  ];
  const rows = expenses.map((e) => [
    csvCell(formatDate(e.date)),
    e.amount.toFixed(2),
    csvCell(translateCategory(e.category)),
    csvCell(e.description),
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");

  const filename = `simplybudget-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  const uri = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    dialogTitle: filename,
  });
}
