import {
  getCrashlytics,
  log,
  recordError,
  setCrashlyticsCollectionEnabled,
} from "@react-native-firebase/crashlytics";

/**
 * True when the Firebase Crashlytics native module initialized successfully.
 * False in environments where the native module is absent (e.g. Expo Go, broken build config).
 */
export let crashlyticsAvailable = false;

/**
 * Initialize Crashlytics at startup. Call once from the app entry point.
 * Sets crashlyticsAvailable; silently no-ops if the native module is absent.
 */
export function initCrashlytics(): void {
  try {
    getCrashlytics();
    crashlyticsAvailable = true;
  } catch {
    crashlyticsAvailable = false;
  }
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
  try {
    log(getCrashlytics(), message);
  } catch {}
}

/**
 * Apply the user's crash reporting consent to the Firebase SDK.
 * Call this once on startup (after preferences load) and whenever the setting changes.
 */
export function applyCrashlyticsConsent(enabled: boolean) {
  try {
    setCrashlyticsCollectionEnabled(getCrashlytics(), enabled);
  } catch {}
}

/**
 * Record a non-fatal error — shows up in Crashlytics as a non-fatal issue
 * rather than a full crash, useful for caught errors you still want visibility on.
 */
export function recordNonFatalError(error: Error, context?: string) {
  try {
    const instance = getCrashlytics();
    if (context) log(instance, context);
    recordError(instance, error);
  } catch {}
}
