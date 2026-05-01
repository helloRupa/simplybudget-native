/**
 * Tests for utils/crashlytics.ts
 *
 * @react-native-firebase/crashlytics is auto-mocked via
 * __mocks__/@react-native-firebase/crashlytics.ts.
 */
import * as Crashlytics from "@/utils/crashlytics";
import {
  getCrashlytics,
  log,
  recordError,
  setCrashlyticsCollectionEnabled,
} from "@react-native-firebase/crashlytics";

const {
  CrashlyticsContext,
  CrashlyticsLog,
  applyCrashlyticsConsent,
  initCrashlytics,
  logToCrashlytics,
  recordNonFatalError,
} = Crashlytics;

const mockInstance = (getCrashlytics as jest.Mock)();

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// initCrashlytics
// ---------------------------------------------------------------------------

describe("initCrashlytics", () => {
  it("sets crashlyticsAvailable to true on success", () => {
    initCrashlytics();
    expect(Crashlytics.crashlyticsAvailable).toBe(true);
  });

  it("sets crashlyticsAvailable to false when getCrashlytics throws", () => {
    (getCrashlytics as jest.Mock).mockImplementationOnce(() => {
      throw new Error("native module unavailable");
    });
    initCrashlytics();
    expect(Crashlytics.crashlyticsAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyCrashlyticsConsent
// ---------------------------------------------------------------------------

describe("applyCrashlyticsConsent", () => {
  it("calls setCrashlyticsCollectionEnabled with true when enabled", () => {
    applyCrashlyticsConsent(true);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledTimes(1);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(mockInstance, true);
  });

  it("calls setCrashlyticsCollectionEnabled with false when disabled", () => {
    applyCrashlyticsConsent(false);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledTimes(1);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(mockInstance, false);
  });
});

// ---------------------------------------------------------------------------
// logToCrashlytics
// ---------------------------------------------------------------------------

describe("logToCrashlytics", () => {
  it("calls log with the crashlytics instance and the given constant", () => {
    logToCrashlytics(CrashlyticsLog.ExpenseFormOpenedNew);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      mockInstance,
      CrashlyticsLog.ExpenseFormOpenedNew
    );
  });

  it("forwards the constant value verbatim", () => {
    logToCrashlytics(CrashlyticsLog.BackupExportSucceeded);
    expect(log).toHaveBeenCalledWith(
      mockInstance,
      CrashlyticsLog.BackupExportSucceeded
    );
  });
});

// ---------------------------------------------------------------------------
// recordNonFatalError
// ---------------------------------------------------------------------------

describe("recordNonFatalError", () => {
  it("calls recordError with the crashlytics instance and the given error", () => {
    const error = new Error("something went wrong");
    recordNonFatalError(error);
    expect(recordError).toHaveBeenCalledTimes(1);
    expect(recordError).toHaveBeenCalledWith(mockInstance, error);
  });

  it("logs the context message before recording the error when context is provided", () => {
    const error = new Error("export failed");
    recordNonFatalError(error, CrashlyticsContext.HandleExportBackupFailed);
    expect(log).toHaveBeenCalledWith(mockInstance, CrashlyticsContext.HandleExportBackupFailed);
    expect(recordError).toHaveBeenCalledWith(mockInstance, error);
  });

  it("does not call log when no context is provided", () => {
    recordNonFatalError(new Error("oops"));
    expect(log).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Guard behaviour — SDK throws, app must not crash
// ---------------------------------------------------------------------------

describe("silent failure guards", () => {
  beforeEach(() => {
    (getCrashlytics as jest.Mock).mockImplementation(() => {
      throw new Error("native module unavailable");
    });
  });

  it("applyCrashlyticsConsent does not throw when getCrashlytics throws", () => {
    expect(() => applyCrashlyticsConsent(true)).not.toThrow();
  });

  it("logToCrashlytics does not throw when getCrashlytics throws", () => {
    expect(() => logToCrashlytics(CrashlyticsLog.ExpenseAdded)).not.toThrow();
  });

  it("recordNonFatalError does not throw when getCrashlytics throws", () => {
    expect(() => recordNonFatalError(new Error("boom"))).not.toThrow();
  });

  it("recordNonFatalError with context does not throw when getCrashlytics throws", () => {
    expect(() =>
      recordNonFatalError(new Error("boom"), CrashlyticsContext.HandleImportBackupFailed)
    ).not.toThrow();
  });
});
