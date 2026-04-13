import { useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

export interface LockAuthState {
  isAvailable: boolean; // true if device has any secure lock (PIN, pattern, biometrics)
  isReady: boolean;     // true once the async check has resolved
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  return result.success;
}

export function useLockAuthAvailability(): LockAuthState {
  const [state, setState] = useState<LockAuthState>({
    isAvailable: false,
    isReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      // SecurityLevel.NONE means no lock screen at all — PIN, pattern,
      // password, and biometrics all return a level above NONE.
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      const isAvailable = level > LocalAuthentication.SecurityLevel.NONE;
      if (!cancelled) {
        setState({ isAvailable, isReady: true });
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
