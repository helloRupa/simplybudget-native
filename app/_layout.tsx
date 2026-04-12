import AppName from "@/components/AppName";
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
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoaded } = useBudget();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

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
