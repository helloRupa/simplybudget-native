/**
 * Jest mock for expo-notifications.
 * Provides jest.fn() stubs for all functions used by utils/notifications.ts
 * and app/_layout.tsx so tests run without native modules.
 */

export enum SchedulableTriggerInputTypes {
  CALENDAR = "calendar",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  DATE = "date",
  TIME_INTERVAL = "timeInterval",
}

export enum AndroidImportance {
  NONE = 0,
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
  MAX = 5,
}

export const scheduleNotificationAsync = jest.fn().mockResolvedValue("mock-notification-id");
export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted" });
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted" });
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
export const setNotificationHandler = jest.fn();
export const addNotificationResponseReceivedListener = jest
  .fn()
  .mockReturnValue({ remove: jest.fn() });
export const getLastNotificationResponseAsync = jest.fn().mockResolvedValue(null);
