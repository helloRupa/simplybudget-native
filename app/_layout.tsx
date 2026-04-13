import AppName from "@/components/AppName";
import LockScreen from "@/components/LockScreen";
import { colors } from "@/constants/colors";
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoaded, state } = useBudget();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Start locked when lock is enabled; unlock if lock is off
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);
  const LOCK_GRACE_MS = 30_000;

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
          appState.current === "background" ||
          appState.current === "inactive";
        const isActive = nextState === "active";

        if (!wasBackground && (nextState === "background" || nextState === "inactive")) {
          backgroundedAt.current = Date.now();
        }

        if (wasBackground && isActive && state.lockEnabled) {
          const elapsed = backgroundedAt.current
            ? Date.now() - backgroundedAt.current
            : Infinity;
          if (elapsed >= LOCK_GRACE_MS) {
            setIsAuthenticated(false);
          }
        }

        appState.current = nextState;
      }
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "" }} />
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
