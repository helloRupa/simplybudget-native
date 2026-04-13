/**
 * Tests for app/(tabs)/settings.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import { initDatabase, _setDatabase } from "@/utils/database";
import { BudgetProvider } from "@/context/BudgetContext";
import SettingsScreen from "@/app/(tabs)/settings";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// exportToCSV and backup utils touch native APIs — mock them
jest.mock("@/utils/csv", () => ({ exportToCSV: jest.fn() }));
jest.mock("@/utils/backup", () => ({
  exportBackup: jest.fn(),
  pickAndParseBackup: jest.fn(),
}));

function makeDb() {
  const db = openDatabaseSync("test.db");
  initDatabase(db);
  return db;
}

function Providers({ children }: { children: React.ReactNode }) {
  return <BudgetProvider>{children}</BudgetProvider>;
}

function renderSettings() {
  return render(
    <Providers>
      <SettingsScreen />
    </Providers>
  );
}

beforeEach(() => {
  _setDatabase(makeDb());
});

afterEach(() => {
  _setDatabase(null);
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("SettingsScreen — rendering", () => {
  it("renders without crashing", () => {
    renderSettings();
    expect(screen.getByText("Set Weekly Budget")).toBeTruthy();
  });

  it("shows the current weekly budget as a hint", () => {
    renderSettings();
    // Default budget is 200
    expect(screen.getByText(/200/)).toBeTruthy();
  });

  it("shows the default categories as chips", () => {
    renderSettings();
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.getByText("Bills")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Weekly budget
// ---------------------------------------------------------------------------

describe("SettingsScreen — weekly budget", () => {
  it("shows a validation error for a non-numeric value", () => {
    renderSettings();
    fireEvent.changeText(screen.getByDisplayValue("200"), "abc");
    fireEvent.press(screen.getByText("Save"));
    expect(screen.getByText("Budget must be greater than zero.")).toBeTruthy();
  });

  it("shows a validation error for zero", () => {
    renderSettings();
    fireEvent.changeText(screen.getByDisplayValue("200"), "0");
    fireEvent.press(screen.getByText("Save"));
    expect(screen.getByText("Budget must be greater than zero.")).toBeTruthy();
  });

  it("shows a success toast on valid save", () => {
    renderSettings();
    fireEvent.changeText(screen.getByDisplayValue("200"), "350");
    fireEvent.press(screen.getByText("Save"));
    expect(screen.getByText("Weekly budget updated!")).toBeTruthy();
  });

  it("clears the error when a valid value is saved", () => {
    renderSettings();
    // First trigger the error
    fireEvent.changeText(screen.getByDisplayValue("200"), "0");
    fireEvent.press(screen.getByText("Save"));
    expect(screen.getByText("Budget must be greater than zero.")).toBeTruthy();
    // Then fix it
    fireEvent.changeText(screen.getByDisplayValue("0"), "300");
    fireEvent.press(screen.getByText("Save"));
    expect(screen.queryByText("Budget must be greater than zero.")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Category management
// ---------------------------------------------------------------------------

describe("SettingsScreen — category management", () => {
  it("adds a new category and shows a success toast", () => {
    renderSettings();
    fireEvent.changeText(
      screen.getByPlaceholderText("New category name"),
      "Pets"
    );
    fireEvent.press(screen.getByText("Add Category"));
    expect(screen.getByText("Category added!")).toBeTruthy();
    expect(screen.getByText("Pets")).toBeTruthy();
  });

  it("shows an error toast for a duplicate category", () => {
    renderSettings();
    fireEvent.changeText(
      screen.getByPlaceholderText("New category name"),
      "Food"
    );
    fireEvent.press(screen.getByText("Add Category"));
    expect(screen.getByText("Category already exists.")).toBeTruthy();
  });

  it("shows an error toast for a name over 30 characters", () => {
    renderSettings();
    fireEvent.changeText(
      screen.getByPlaceholderText("New category name"),
      "A".repeat(31)
    );
    fireEvent.press(screen.getByText("Add Category"));
    expect(
      screen.getByText("Category name must be 30 characters or fewer.")
    ).toBeTruthy();
  });

  it("clears the input after a successful add", () => {
    renderSettings();
    fireEvent.changeText(
      screen.getByPlaceholderText("New category name"),
      "Pets"
    );
    fireEvent.press(screen.getByText("Add Category"));
    expect(
      screen.getByPlaceholderText("New category name").props.value
    ).toBe("");
  });

  it("does nothing when the input is empty", () => {
    renderSettings();
    const before = screen.getAllByText(/.*/).length;
    fireEvent.press(screen.getByText("Add Category"));
    // No toast appears — element count stays the same
    expect(screen.queryByText("Category added!")).toBeNull();
    expect(screen.queryByText("Category already exists.")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

describe("SettingsScreen — export", () => {
  it("shows an error toast when exporting CSV with no expenses", () => {
    renderSettings();
    fireEvent.press(screen.getByText("Export as CSV"));
    expect(screen.getByText("No expenses found.")).toBeTruthy();
  });

  it("calls exportBackup when the export backup button is pressed", async () => {
    const { exportBackup } = require("@/utils/backup");
    exportBackup.mockResolvedValue(undefined);
    renderSettings();
    fireEvent.press(screen.getByText("Export Backup (JSON)"));
    await screen.findByText("Backup file created.");
    expect(exportBackup).toHaveBeenCalledTimes(1);
  });
});
