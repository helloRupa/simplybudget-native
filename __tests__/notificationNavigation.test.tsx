/**
 * Tests for notification deep-linking in app/_layout.tsx.
 *
 * Covers:
 *  - Cold-start (getLastNotificationResponseAsync path, Android)
 *  - Warm-start (addNotificationResponseReceivedListener path)
 *  - Deduplication when both paths fire for the same notification
 *  - Lock-enabled: navigation queued and fired after unlock
 */
import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { NOTIFICATION_IDS } from "@/utils/notifications";

const mockPush = jest.fn();
const mockUseBudget = jest.fn(() => ({
  isLoaded: true,
  state: { lockEnabled: false },
  lockSuppressed: false,
}));
let mockOnUnlock: (() => void) | null = null;

jest.mock("expo-router", () => {
  const StackScreen = () => null;
  const Stack = Object.assign(
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
    { Screen: StackScreen },
  );
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    Stack,
  };
});

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  setOptions: jest.fn(),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@expo-google-fonts/inter", () => ({
  useFonts: () => [true],
  Inter_400Regular: undefined,
  Inter_500Medium: undefined,
  Inter_600SemiBold: undefined,
  Inter_700Bold: undefined,
  Inter_800ExtraBold: undefined,
}));

jest.mock("@/context/BudgetContext", () => ({
  useBudget: () => mockUseBudget(),
  BudgetProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/components/AppName", () => () => null);
jest.mock(
  "@/components/LockScreen",
  () =>
    ({ onUnlock }: { onUnlock: () => void }) => {
      mockOnUnlock = onUnlock;
      return null;
    },
);
jest.mock("@/utils/crashlytics", () => ({ initCrashlytics: jest.fn() }));
jest.mock("@/utils/lockTimer", () => ({
  shouldReLock: jest.fn().mockReturnValue(false),
}));

import RootLayout from "@/app/_layout";

const mockGetLast =
  Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockAddListener =
  Notifications.addNotificationResponseReceivedListener as jest.Mock;

function makeResponse(id: string): Notifications.NotificationResponse {
  return {
    notification: {
      request: {
        identifier: id,
        content: { title: "t", body: "b", data: {} },
        trigger: {},
      },
      date: Date.now(),
    },
    actionIdentifier: "com.apple.UNNotificationDefaultActionIdentifier",
  } as unknown as Notifications.NotificationResponse;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLast.mockResolvedValue(null);
  mockAddListener.mockReturnValue({ remove: jest.fn() });
  mockUseBudget.mockReturnValue({
    isLoaded: true,
    state: { lockEnabled: false },
    lockSuppressed: false,
  });
  mockOnUnlock = null;
});

describe("cold-start notification navigation", () => {
  it("navigates to /expense-form when daily reminder cold-starts the app", async () => {
    mockGetLast.mockResolvedValue(
      makeResponse(NOTIFICATION_IDS.dailyExpenseReminder),
    );
    render(<RootLayout />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/expenses");
    });
  });

  it("navigates to /(tabs)/settings when weekly reminder cold-starts the app", async () => {
    mockGetLast.mockResolvedValue(
      makeResponse(NOTIFICATION_IDS.weeklyBackupReminder),
    );
    render(<RootLayout />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/settings");
    });
  });

  it("does not navigate when there is no stored notification response", async () => {
    mockGetLast.mockResolvedValue(null);
    render(<RootLayout />);
    await waitFor(() => expect(mockGetLast).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not navigate for an unrecognised notification identifier", async () => {
    mockGetLast.mockResolvedValue(makeResponse("some-other-notification"));
    render(<RootLayout />);
    await waitFor(() => expect(mockGetLast).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("warm-start notification navigation", () => {
  it("navigates when the live listener fires", async () => {
    let listenerCallback:
      | ((r: Notifications.NotificationResponse) => void)
      | null = null;
    mockAddListener.mockImplementation((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    render(<RootLayout />);
    await waitFor(() => expect(mockGetLast).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      listenerCallback!(makeResponse(NOTIFICATION_IDS.dailyExpenseReminder));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/expenses");
    });
  });
});

describe("notification deduplication", () => {
  it("navigates only once when both cold-start and live listener fire for the same notification", async () => {
    const response = makeResponse(NOTIFICATION_IDS.dailyExpenseReminder);
    mockGetLast.mockResolvedValue(response);

    let listenerCallback:
      | ((r: Notifications.NotificationResponse) => void)
      | null = null;
    mockAddListener.mockImplementation((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    render(<RootLayout />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));

    act(() => {
      listenerCallback!(response);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});

describe("notification navigation with lock enabled", () => {
  it("queues navigation and fires after unlock on cold-start", async () => {
    mockUseBudget.mockReturnValue({
      isLoaded: true,
      state: { lockEnabled: true },
      lockSuppressed: false,
    });
    mockGetLast.mockResolvedValue(
      makeResponse(NOTIFICATION_IDS.dailyExpenseReminder),
    );

    render(<RootLayout />);

    // Flush all pending microtasks so the promise resolves and
    // handleResponse sets pendingNavigation — but push must not fire yet
    await act(async () => {});
    expect(mockPush).not.toHaveBeenCalled();

    // Simulate user unlocking the app
    await act(async () => {
      mockOnUnlock?.();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/expenses");
    });
  });
});
