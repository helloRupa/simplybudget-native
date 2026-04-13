/**
 * Jest mock for expo-local-authentication.
 *
 * Provides controllable jest.fn() stubs so individual tests can set up
 * return values with mockResolvedValueOnce / mockReturnValueOnce.
 * Defaults: no lock screen enrolled, authentication fails.
 */
export const SecurityLevel = {
  NONE: 0,
  SECRET: 1,
  BIOMETRIC_WEAK: 2,
  BIOMETRIC_STRONG: 3,
} as const;

export const getEnrolledLevelAsync = jest
  .fn()
  .mockResolvedValue(SecurityLevel.NONE);

export const authenticateAsync = jest
  .fn()
  .mockResolvedValue({ success: false, error: "user_cancel" });
