import {
  getCrashlytics,
  log,
  recordError,
  setAttribute,
} from "@react-native-firebase/crashlytics";

function getInstance() {
  return getCrashlytics();
}

/** Log a breadcrumb message visible in the Crashlytics crash report. */
export function logToCrashlytics(message: string) {
  log(getInstance(), message);
}

/** Attach a key/value attribute to all subsequent crash reports. */
export function setCrashlyticsAttribute(key: string, value: string) {
  setAttribute(getInstance(), key, value);
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
