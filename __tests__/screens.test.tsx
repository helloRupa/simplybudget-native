import React from "react";
import { render, screen } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import { initDatabase, _setDatabase } from "@/utils/database";
import { BudgetProvider } from "@/context/BudgetContext";

import DashboardScreen from "@/app/(tabs)/index";
import SettingsScreen from "@/app/(tabs)/settings";

function makeDb() {
  const db = openDatabaseSync("test.db");
  initDatabase(db);
  return db;
}

function Providers({ children }: { children: React.ReactNode }) {
  return <BudgetProvider>{children}</BudgetProvider>;
}

beforeEach(() => {
  _setDatabase(makeDb());
});

afterEach(() => {
  _setDatabase(null);
});

describe("Smoke tests", () => {
  it("DashboardScreen renders without crashing", () => {
    render(
      <Providers>
        <DashboardScreen />
      </Providers>
    );
    expect(screen.getAllByText("Weekly Budget").length).toBeGreaterThan(0);
  });

  it("SettingsScreen renders without crashing", () => {
    render(
      <Providers>
        <SettingsScreen />
      </Providers>
    );
    expect(screen.getByText("Set Weekly Budget")).toBeTruthy();
  });
});
