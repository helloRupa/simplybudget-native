import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Show notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const NOTIFICATION_IDS = {
  dailyExpenseReminder: "daily-expense-reminder",
  weeklyBackupReminder: "weekly-backup-reminder",
} as const;

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ---------------------------------------------------------------------------
// Schedule / cancel
// ---------------------------------------------------------------------------

export async function scheduleDailyExpenseReminder(
  title: string,
  body: string
): Promise<void> {
  // Cancel first so we never end up with duplicate scheduled notifications
  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_IDS.dailyExpenseReminder
  ).catch(() => undefined);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.dailyExpenseReminder,
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleWeeklyBackupReminder(
  title: string,
  body: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_IDS.weeklyBackupReminder
  ).catch(() => undefined);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.weeklyBackupReminder,
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // 1 = Sunday (iOS NSCalendar convention used by expo-notifications)
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelDailyExpenseReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_IDS.dailyExpenseReminder
  ).catch(() => undefined);
}

export async function cancelWeeklyBackupReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_IDS.weeklyBackupReminder
  ).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Startup sync — re-registers notifications based on saved prefs.
// Does NOT prompt for permissions; skips silently if not granted.
// ---------------------------------------------------------------------------

export async function syncNotificationsOnStartup(
  prefs: { notifyDailyExpense: boolean; notifyWeeklyBackup: boolean },
  content: {
    dailyTitle: string;
    dailyBody: string;
    weeklyTitle: string;
    weeklyBody: string;
  }
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  const granted = status === "granted";

  if (prefs.notifyDailyExpense && granted) {
    await scheduleDailyExpenseReminder(content.dailyTitle, content.dailyBody);
  } else {
    await cancelDailyExpenseReminder();
  }

  if (prefs.notifyWeeklyBackup && granted) {
    await scheduleWeeklyBackupReminder(content.weeklyTitle, content.weeklyBody);
  } else {
    await cancelWeeklyBackupReminder();
  }
}
