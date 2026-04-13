/**
 * Tests for utils/notifications.ts
 *
 * expo-notifications is auto-mocked via __mocks__/expo-notifications.ts.
 */
import {
  cancelDailyExpenseReminder,
  cancelWeeklyBackupReminder,
  NOTIFICATION_IDS,
  requestNotificationPermissions,
  scheduleDailyExpenseReminder,
  scheduleWeeklyBackupReminder,
  syncNotificationsOnStartup,
} from "@/utils/notifications";
import * as Notifications from "expo-notifications";

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const mockGetPerms = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPerms = Notifications.requestPermissionsAsync as jest.Mock;
const mockSetChannel = Notifications.setNotificationChannelAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: permissions are granted
  mockGetPerms.mockResolvedValue({ status: "granted" });
  mockRequestPerms.mockResolvedValue({ status: "granted" });
  mockSchedule.mockResolvedValue("mock-id");
  mockCancel.mockResolvedValue(undefined);
  mockSetChannel.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// requestNotificationPermissions
// ---------------------------------------------------------------------------

describe("requestNotificationPermissions", () => {
  it("returns true when permissions are already granted", async () => {
    mockGetPerms.mockResolvedValue({ status: "granted" });
    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  it("requests permissions when not yet granted and returns true on approval", async () => {
    mockGetPerms.mockResolvedValue({ status: "undetermined" });
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
    expect(mockRequestPerms).toHaveBeenCalledTimes(1);
  });

  it("returns false when the user denies permissions", async () => {
    mockGetPerms.mockResolvedValue({ status: "undetermined" });
    mockRequestPerms.mockResolvedValue({ status: "denied" });
    const result = await requestNotificationPermissions();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scheduleDailyExpenseReminder
// ---------------------------------------------------------------------------

describe("scheduleDailyExpenseReminder", () => {
  it("cancels any existing daily notification before scheduling", async () => {
    await scheduleDailyExpenseReminder("Title", "Body");
    expect(mockCancel).toHaveBeenCalledWith(
      NOTIFICATION_IDS.dailyExpenseReminder,
    );
  });

  it("schedules with the correct identifier", async () => {
    await scheduleDailyExpenseReminder("Title", "Body");
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: NOTIFICATION_IDS.dailyExpenseReminder,
      }),
    );
  });

  it("schedules with the provided title and body", async () => {
    await scheduleDailyExpenseReminder("Any expenses?", "Log them now.");
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: { title: "Any expenses?", body: "Log them now." },
      }),
    );
  });

  it("uses a DAILY trigger at 20:00", async () => {
    await scheduleDailyExpenseReminder("T", "B");
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// scheduleWeeklyBackupReminder
// ---------------------------------------------------------------------------

describe("scheduleWeeklyBackupReminder", () => {
  it("cancels any existing weekly notification before scheduling", async () => {
    await scheduleWeeklyBackupReminder("Title", "Body");
    expect(mockCancel).toHaveBeenCalledWith(
      NOTIFICATION_IDS.weeklyBackupReminder,
    );
  });

  it("schedules with the correct identifier", async () => {
    await scheduleWeeklyBackupReminder("Title", "Body");
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: NOTIFICATION_IDS.weeklyBackupReminder,
      }),
    );
  });

  it("uses a WEEKLY trigger on Sunday (weekday 1) at 20:00", async () => {
    await scheduleWeeklyBackupReminder("T", "B");
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour: 20,
          minute: 0,
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// cancelDailyExpenseReminder / cancelWeeklyBackupReminder
// ---------------------------------------------------------------------------

describe("cancelDailyExpenseReminder", () => {
  it("cancels the daily notification by its identifier", async () => {
    await cancelDailyExpenseReminder();
    expect(mockCancel).toHaveBeenCalledWith(
      NOTIFICATION_IDS.dailyExpenseReminder,
    );
  });

  it("does not throw if the notification was never scheduled", async () => {
    mockCancel.mockRejectedValueOnce(new Error("not found"));
    await expect(cancelDailyExpenseReminder()).resolves.toBeUndefined();
  });
});

describe("cancelWeeklyBackupReminder", () => {
  it("cancels the weekly notification by its identifier", async () => {
    await cancelWeeklyBackupReminder();
    expect(mockCancel).toHaveBeenCalledWith(
      NOTIFICATION_IDS.weeklyBackupReminder,
    );
  });

  it("does not throw if the notification was never scheduled", async () => {
    mockCancel.mockRejectedValueOnce(new Error("not found"));
    await expect(cancelWeeklyBackupReminder()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// syncNotificationsOnStartup
// ---------------------------------------------------------------------------

describe("syncNotificationsOnStartup", () => {
  const content = {
    dailyTitle: "Daily title",
    dailyBody: "Daily body",
    weeklyTitle: "Weekly title",
    weeklyBody: "Weekly body",
  };

  it("schedules both notifications when both prefs are enabled and permission is granted", async () => {
    await syncNotificationsOnStartup(
      { notifyDailyExpense: true, notifyWeeklyBackup: true },
      content,
    );
    expect(mockSchedule).toHaveBeenCalledTimes(2);
    const ids = mockSchedule.mock.calls.map(
      (c: unknown[]) => (c[0] as { identifier: string }).identifier,
    );
    expect(ids).toContain(NOTIFICATION_IDS.dailyExpenseReminder);
    expect(ids).toContain(NOTIFICATION_IDS.weeklyBackupReminder);
  });

  it("cancels both notifications when both prefs are disabled", async () => {
    await syncNotificationsOnStartup(
      { notifyDailyExpense: false, notifyWeeklyBackup: false },
      content,
    );
    expect(mockSchedule).not.toHaveBeenCalled();
    // cancelScheduledNotificationAsync is called by each cancel helper
    const cancelIds = mockCancel.mock.calls.map((c: unknown[]) => c[0]);
    expect(cancelIds).toContain(NOTIFICATION_IDS.dailyExpenseReminder);
    expect(cancelIds).toContain(NOTIFICATION_IDS.weeklyBackupReminder);
  });

  it("schedules only the daily notification when only that pref is enabled", async () => {
    await syncNotificationsOnStartup(
      { notifyDailyExpense: true, notifyWeeklyBackup: false },
      content,
    );
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: NOTIFICATION_IDS.dailyExpenseReminder,
      }),
    );
  });

  it("does not schedule when permissions are not granted, even if prefs are enabled", async () => {
    mockGetPerms.mockResolvedValue({ status: "denied" });
    await syncNotificationsOnStartup(
      { notifyDailyExpense: true, notifyWeeklyBackup: true },
      content,
    );
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("passes the correct content strings to each notification", async () => {
    await syncNotificationsOnStartup(
      { notifyDailyExpense: true, notifyWeeklyBackup: true },
      content,
    );
    const calls = mockSchedule.mock.calls as [
      { identifier: string; content: { title: string; body: string } },
    ][];
    const dailyCall = calls.find(
      (c) => c[0].identifier === NOTIFICATION_IDS.dailyExpenseReminder,
    );
    const weeklyCall = calls.find(
      (c) => c[0].identifier === NOTIFICATION_IDS.weeklyBackupReminder,
    );
    expect(dailyCall?.[0].content).toEqual({
      title: "Daily title",
      body: "Daily body",
    });
    expect(weeklyCall?.[0].content).toEqual({
      title: "Weekly title",
      body: "Weekly body",
    });
  });
});
