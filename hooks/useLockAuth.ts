import { useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

export interface LockAuthState {
  hasHardware: boolean;
  isEnrolled: boolean;
  isReady: boolean; // true once the async checks have resolved
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
    hasHardware: false,
    isEnrolled: false,
    isReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!cancelled) {
        setState({ hasHardware, isEnrolled, isReady: true });
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
