/**
 * Jest mock for @react-native-firebase/crashlytics.
 * Stubs the modular API functions used by utils/crashlytics.ts.
 */

const mockInstance = {};

export const getCrashlytics = jest.fn(() => mockInstance);
export const log = jest.fn();
export const setAttribute = jest.fn();
export const recordError = jest.fn();
export const crash = jest.fn();
