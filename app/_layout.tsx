import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { BudgetProvider } from "@/context/BudgetContext";
import { colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Custom fonts can be added here, e.g.:
    // GeistSans: require("../assets/fonts/GeistVF.woff2"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <BudgetProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="expense-form" options={{ title: "Expense" }} />
        <Stack.Screen
          name="recurring-expenses"
          options={{ title: "Recurring Expenses" }}
        />
      </Stack>
    </BudgetProvider>
  );
}
