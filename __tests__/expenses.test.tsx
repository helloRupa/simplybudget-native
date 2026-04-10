/**
 * Tests for app/(tabs)/expenses.tsx — filtering, sorting, and delete flow.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import { initDatabase, _setDatabase } from "@/utils/database";
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import { renderHook } from "@testing-library/react-native";
import ExpensesScreen from "@/app/(tabs)/expenses";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({}),
}));

function makeDb() {
  const db = openDatabaseSync("test.db");
  initDatabase(db);
  return db;
}

function Providers({ children }: { children: React.ReactNode }) {
  return <BudgetProvider>{children}</BudgetProvider>;
}

function renderExpenses() {
  return render(
    <Providers>
      <ExpensesScreen />
    </Providers>
  );
}

// Seed expenses via the context hook before rendering the screen
function seedExpenses() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Providers>{children}</Providers>
  );
  const { result } = renderHook(() => useBudget(), { wrapper });

  act(() => {
    result.current.addExpense({
      amount: 10,
      category: "Food",
      description: "Coffee",
      date: "2026-04-01",
    });
    result.current.addExpense({
      amount: 50,
      category: "Transportation",
      description: "Taxi",
      date: "2026-04-05",
    });
    result.current.addExpense({
      amount: 200,
      category: "Bills",
      description: "Electric",
      date: "2026-04-08",
    });
  });
}

beforeEach(() => {
  _setDatabase(makeDb());
  mockPush.mockClear();
});

afterEach(() => {
  _setDatabase(null);
});

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe("ExpensesScreen — rendering", () => {
  it("shows the empty state when there are no expenses", () => {
    renderExpenses();
    expect(screen.getByText("No expenses found.")).toBeTruthy();
  });

  it("renders the FAB", () => {
    renderExpenses();
    expect(screen.getByLabelText("Add Expense")).toBeTruthy();
  });

  it("navigates to the expense form on FAB press", () => {
    renderExpenses();
    fireEvent.press(screen.getByLabelText("Add Expense"));
    expect(mockPush).toHaveBeenCalledWith("/expense-form");
  });
});

// ---------------------------------------------------------------------------
// Search filter
// ---------------------------------------------------------------------------

describe("ExpensesScreen — search", () => {
  beforeEach(() => seedExpenses());

  it("filters by description text", () => {
    renderExpenses();
    fireEvent.changeText(
      screen.getByPlaceholderText("Search expenses..."),
      "Coffee"
    );
    expect(screen.getByText("Coffee")).toBeTruthy();
    expect(screen.queryByText("Taxi")).toBeNull();
  });

  it("is case-insensitive", () => {
    renderExpenses();
    fireEvent.changeText(
      screen.getByPlaceholderText("Search expenses..."),
      "coffee"
    );
    expect(screen.getByText("Coffee")).toBeTruthy();
  });

  it("shows the empty state when search matches nothing", () => {
    renderExpenses();
    fireEvent.changeText(
      screen.getByPlaceholderText("Search expenses..."),
      "zzznomatch"
    );
    expect(screen.getByText("No expenses found.")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------

describe("ExpensesScreen — delete", () => {
  beforeEach(() => seedExpenses());

  it("shows confirm/cancel buttons after pressing Delete", () => {
    renderExpenses();
    // Each card has a Delete button; press the first one
    fireEvent.press(screen.getAllByText("Delete")[0]);
    // Confirm and Cancel should now be visible
    expect(screen.getByText("Cancel")).toBeTruthy();
    // There's now a highlighted Delete confirm button
    expect(screen.getAllByText("Delete").length).toBeGreaterThanOrEqual(1);
  });

  it("removes the expense after confirming delete", () => {
    renderExpenses();
    // Seed renders 3 expenses — after delete, 2 remain
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.press(deleteButtons[0]); // enter delete-confirm mode
    // Now press the styled confirm button (still labeled "Delete")
    fireEvent.press(screen.getAllByText("Delete")[0]);
    // Should be back to 2 expenses
    expect(screen.getAllByText("Delete")).toHaveLength(2);
  });

  it("cancels delete and keeps the expense", () => {
    renderExpenses();
    fireEvent.press(screen.getAllByText("Delete")[0]);
    fireEvent.press(screen.getByText("Cancel"));
    // All 3 delete buttons should be back
    expect(screen.getAllByText("Delete")).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Edit navigation
// ---------------------------------------------------------------------------

describe("ExpensesScreen — edit", () => {
  beforeEach(() => seedExpenses());

  it("navigates to expense form with id when Edit is pressed", () => {
    renderExpenses();
    fireEvent.press(screen.getAllByText("Edit")[0]);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/expense-form",
        params: expect.objectContaining({ id: expect.any(String) }),
      })
    );
  });
});
