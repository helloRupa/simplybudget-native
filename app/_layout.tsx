import AppName from "@/components/AppName";
import LockScreen from "@/components/LockScreen";
import { colors } from "@/constants/colors";
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import { shouldReLock } from "@/utils/lockTimer";
import { NOTIFICATION_IDS } from "@/utils/notifications";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { initCrashlytics } from "@/utils/crashlytics";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, StyleSheet, View } from "react-native";

SplashScreen.setOptions({ duration: 1000, fade: true });
SplashScreen.preventAutoHideAsync();
initCrashlytics();

function RootLayoutNav() {
  const router = useRouter();
  const { isLoaded, state, lockSuppressed } = useBudget();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Start locked when lock is enabled; unlock if lock is off
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const pendingNavigation = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);
  const lockSuppressedRef = useRef(lockSuppressed);
  const LOCK_GRACE_MS = 30_000;

  // Keep refs in sync so event handlers always read the latest value
  // without needing to re-register subscriptions on every change.
  useEffect(() => {
    lockSuppressedRef.current = lockSuppressed;
  }, [lockSuppressed]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Navigate to any destination queued during a notification tap while locked
  useEffect(() => {
    if (isAuthenticated && pendingNavigation.current) {
      router.push(
        pendingNavigation.current as Parameters<typeof router.push>[0],
      );
      pendingNavigation.current = null;
    }
  }, [isAuthenticated, router]);

  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.identifier;
        let destination: string | null = null;
        if (id === NOTIFICATION_IDS.dailyExpenseReminder) {
          destination = "/expense-form";
        } else if (id === NOTIFICATION_IDS.weeklyBackupReminder) {
          destination = "/(tabs)/settings";
        }
        if (!destination) return;

        if (isAuthenticatedRef.current) {
          router.push(destination as Parameters<typeof router.push>[0]);
        } else {
          pendingNavigation.current = destination;
        }
      },
    );
    return () => subscription.remove();
  }, [router]);

  // Once data loads, resolve initial auth state
  useEffect(() => {
    if (isLoaded) {
      if (!state.lockEnabled) {
        setIsAuthenticated(true);
      }
      // If lockEnabled, keep isAuthenticated=false — LockScreen will prompt
    }
  }, [isLoaded, state.lockEnabled]);

  // Re-lock when app returns from background after the grace period
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const wasBackground =
          appState.current === "background" || appState.current === "inactive";
        const isActive = nextState === "active";

        if (
          !wasBackground &&
          (nextState === "background" || nextState === "inactive")
        ) {
          backgroundedAt.current = Date.now();
        }

        if (wasBackground && isActive) {
          const elapsed = backgroundedAt.current
            ? Date.now() - backgroundedAt.current
            : Infinity;
          if (
            shouldReLock({
              lockEnabled: state.lockEnabled,
              lockSuppressed: lockSuppressedRef.current,
              elapsed,
              gracePeriodMs: LOCK_GRACE_MS,
            })
          ) {
            setIsAuthenticated(false);
          }
        }

        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [state.lockEnabled]);

  useEffect(() => {
    if (isLoaded && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded, fontsLoaded]);

  if (!isLoaded || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <AppName size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, title: "" }}
        />
        <Stack.Screen name="expense-form" options={{ title: "Expense" }} />
        <Stack.Screen
          name="recurring-expenses"
          options={{ title: "Recurring Expenses" }}
        />
      </Stack>
      {!isAuthenticated && (
        <LockScreen onUnlock={() => setIsAuthenticated(true)} />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <BudgetProvider>
      <RootLayoutNav />
    </BudgetProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
