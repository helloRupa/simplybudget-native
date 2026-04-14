/**
 * Tests for utils/crashlytics.ts
 *
 * @react-native-firebase/crashlytics is auto-mocked via
 * __mocks__/@react-native-firebase/crashlytics.ts.
 */
import {
  logToCrashlytics,
  recordNonFatalError,
  setCrashlyticsAttribute,
} from "@/utils/crashlytics";
import {
  getCrashlytics,
  log,
  recordError,
  setAttribute,
} from "@react-native-firebase/crashlytics";

const mockInstance = (getCrashlytics as jest.Mock)();

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// logToCrashlytics
// ---------------------------------------------------------------------------

describe("logToCrashlytics", () => {
  it("calls log with the crashlytics instance and the given message", () => {
    logToCrashlytics("user opened expense form");
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(mockInstance, "user opened expense form");
  });

  it("forwards any string message verbatim", () => {
    logToCrashlytics("backup export failed");
    expect(log).toHaveBeenCalledWith(mockInstance, "backup export failed");
  });
});

// ---------------------------------------------------------------------------
// setCrashlyticsAttribute
// ---------------------------------------------------------------------------

describe("setCrashlyticsAttribute", () => {
  it("calls setAttribute with the crashlytics instance, key, and value", () => {
    setCrashlyticsAttribute("locale", "en");
    expect(setAttribute).toHaveBeenCalledTimes(1);
    expect(setAttribute).toHaveBeenCalledWith(mockInstance, "locale", "en");
  });

  it("forwards the key and value verbatim", () => {
    setCrashlyticsAttribute("currency", "EUR");
    expect(setAttribute).toHaveBeenCalledWith(mockInstance, "currency", "EUR");
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
    recordNonFatalError(error, "handleExportBackup failed");
    expect(log).toHaveBeenCalledWith(mockInstance, "handleExportBackup failed");
    expect(recordError).toHaveBeenCalledWith(mockInstance, error);
  });

  it("does not call log when no context is provided", () => {
    recordNonFatalError(new Error("oops"));
    expect(log).not.toHaveBeenCalled();
  });
});
