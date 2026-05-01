/**
 * Tests for notification deep-linking in app/_layout.tsx.
 *
 * Verifies that tapping a notification cold-starts the app and routes to the
 * correct screen (getLastNotificationResponseAsync path, Android cold-start).
 */
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { NOTIFICATION_IDS } from "@/utils/notifications";

const mockPush = jest.fn();

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
  useBudget: () => ({
    isLoaded: true,
    state: { lockEnabled: false },
    lockSuppressed: false,
  }),
  BudgetProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/components/AppName", () => () => null);
jest.mock("@/components/LockScreen", () => () => null);
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
});

describe("cold-start notification navigation", () => {
  it("navigates to /expense-form when daily reminder cold-starts the app", async () => {
    mockGetLast.mockResolvedValue(
      makeResponse(NOTIFICATION_IDS.dailyExpenseReminder),
    );
    render(<RootLayout />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/expense-form");
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
