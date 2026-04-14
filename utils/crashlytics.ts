import {
  getCrashlytics,
  log,
  recordError,
  setCrashlyticsCollectionEnabled,
} from "@react-native-firebase/crashlytics";

function getInstance() {
  return getCrashlytics();
}

/** Allowed breadcrumb messages for Crashlytics. Add new entries here as needed. */
export const CrashlyticsLog = {
  ExpenseAdded: "Expense added",
  ExpenseUpdated: "Expense updated",
  ExpenseDeleted: "Expense deleted",
  ExpenseFormOpenedNew: "Opened expense form: new",
  ExpenseFormOpenedEdit: "Opened expense form: edit",
  CsvExportSucceeded: "CSV export succeeded",
  BackupExportSucceeded: "Backup export succeeded",
  BackupImportSucceeded: "Backup import succeeded",
  NavigatedToRecurringExpenses: "Navigated to recurring expenses",
} as const;

type CrashlyticsLogValue = (typeof CrashlyticsLog)[keyof typeof CrashlyticsLog];

/** Log a breadcrumb message visible in the Crashlytics crash report. */
export function logToCrashlytics(message: CrashlyticsLogValue) {
  log(getInstance(), message);
}

/**
 * Apply the user's crash reporting consent to the Firebase SDK.
 * Call this once on startup (after preferences load) and whenever the setting changes.
 */
export function applyCrashlyticsConsent(enabled: boolean) {
  setCrashlyticsCollectionEnabled(getInstance(), enabled);
}

/**
 * Record a non-fatal error — shows up in Crashlytics as a non-fatal issue
 * rather than a full crash, useful for caught errors you still want visibility on.
 */
export function recordNonFatalError(error: Error, context?: string) {
  if (context) {
    log(getInstance(), context);
  }
  recordError(getInstance(), error);
}
