import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

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
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="expense-form" options={{ title: "Expense" }} />
      <Stack.Screen
        name="recurring-expenses"
        options={{ title: "Recurring Expenses" }}
      />
    </Stack>
  );
}
