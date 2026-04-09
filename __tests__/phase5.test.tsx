/**
 * Tests for Phase 5 components and screens.
 * expo-router is mocked so screens that call useRouter/useLocalSearchParams work.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import { initDatabase, _setDatabase } from "@/utils/database";
import { BudgetProvider } from "@/context/BudgetContext";

import FieldPicker from "@/components/FieldPicker";
import ExpenseFilters from "@/components/ExpenseFilters";
import ExpensesScreen from "@/app/(tabs)/expenses";
import ExpenseFormScreen from "@/app/expense-form";
import RecurringExpensesScreen from "@/app/recurring-expenses";

// ---------------------------------------------------------------------------
// Router mock
// ---------------------------------------------------------------------------
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  mockBack.mockClear();
  mockPush.mockClear();
});

afterEach(() => {
  _setDatabase(null);
});

// ---------------------------------------------------------------------------
// FieldPicker
// ---------------------------------------------------------------------------

describe("FieldPicker", () => {
  const options = [
    { label: "Food", value: "Food" },
    { label: "Bills", value: "Bills" },
  ];

  it("renders the label", () => {
    render(
      <FieldPicker
        label="Category"
        value=""
        options={options}
        onChange={() => {}}
        placeholder="Select..."
      />
    );
    expect(screen.getByText("Category")).toBeTruthy();
  });

  it("shows placeholder when no value selected", () => {
    render(
      <FieldPicker
        label="Category"
        value=""
        options={options}
        onChange={() => {}}
        placeholder="Select..."
      />
    );
    expect(screen.getByText("Select...")).toBeTruthy();
  });

  it("shows selected option label", () => {
    render(
      <FieldPicker
        label="Category"
        value="Food"
        options={options}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Food")).toBeTruthy();
  });

  it("opens modal and shows options on press", () => {
    render(
      <FieldPicker
        label="Category"
        value=""
        options={options}
        onChange={() => {}}
        placeholder="Select..."
      />
    );
    fireEvent.press(screen.getByLabelText("Category"));
    expect(screen.getByText("Bills")).toBeTruthy();
  });

  it("calls onChange when an option is selected", () => {
    const onChange = jest.fn();
    render(
      <FieldPicker
        label="Category"
        value=""
        options={options}
        onChange={onChange}
        placeholder="Select..."
      />
    );
    fireEvent.press(screen.getByLabelText("Category"));
    fireEvent.press(screen.getByText("Bills"));
    expect(onChange).toHaveBeenCalledWith("Bills");
  });

  it("shows error text when provided", () => {
    render(
      <FieldPicker
        label="Category"
        value=""
        options={options}
        onChange={() => {}}
        error="Required"
      />
    );
    expect(screen.getByText("Required")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ExpenseFilters
// ---------------------------------------------------------------------------

describe("ExpenseFilters", () => {
  const defaultFilters = {
    dateFrom: "2026-03-09",
    dateTo: "2026-04-08",
    category: "",
    searchQuery: "",
  };

  it("renders filter controls", () => {
    render(
      <Providers>
        <ExpenseFilters
          filters={defaultFilters}
          defaultFilters={defaultFilters}
          onFilterChange={() => {}}
        />
      </Providers>
    );
    expect(screen.getByText("Filters")).toBeTruthy();
  });

  it("shows reset button when filters differ from defaults", () => {
    const activeFilters = { ...defaultFilters, searchQuery: "coffee" };
    render(
      <Providers>
        <ExpenseFilters
          filters={activeFilters}
          defaultFilters={defaultFilters}
          onFilterChange={() => {}}
        />
      </Providers>
    );
    expect(screen.getByText("Reset Filters")).toBeTruthy();
  });

  it("hides reset button when filters match defaults", () => {
    render(
      <Providers>
        <ExpenseFilters
          filters={defaultFilters}
          defaultFilters={defaultFilters}
          onFilterChange={() => {}}
        />
      </Providers>
    );
    expect(screen.queryByText("Reset Filters")).toBeNull();
  });

  it("calls onFilterChange with defaults when reset is pressed", () => {
    const onFilterChange = jest.fn();
    const activeFilters = { ...defaultFilters, searchQuery: "coffee" };
    render(
      <Providers>
        <ExpenseFilters
          filters={activeFilters}
          defaultFilters={defaultFilters}
          onFilterChange={onFilterChange}
        />
      </Providers>
    );
    fireEvent.press(screen.getByText("Reset Filters"));
    expect(onFilterChange).toHaveBeenCalledWith(defaultFilters);
  });

  it("updates search query on text change", () => {
    const onFilterChange = jest.fn();
    render(
      <Providers>
        <ExpenseFilters
          filters={defaultFilters}
          defaultFilters={defaultFilters}
          onFilterChange={onFilterChange}
        />
      </Providers>
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Search expenses..."),
      "lunch"
    );
    expect(onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchQuery: "lunch",
    });
  });
});

// ---------------------------------------------------------------------------
// ExpensesScreen
// ---------------------------------------------------------------------------

describe("ExpensesScreen", () => {
  it("renders without crashing", () => {
    render(
      <Providers>
        <ExpensesScreen />
      </Providers>
    );
    expect(screen.getByText("No expenses found.")).toBeTruthy();
  });

  it("renders the add expense FAB", () => {
    render(
      <Providers>
        <ExpensesScreen />
      </Providers>
    );
    expect(screen.getByLabelText("Add Expense")).toBeTruthy();
  });

  it("navigates to expense form on FAB press", () => {
    render(
      <Providers>
        <ExpensesScreen />
      </Providers>
    );
    fireEvent.press(screen.getByLabelText("Add Expense"));
    expect(mockPush).toHaveBeenCalledWith("/expense-form");
  });
});

// ---------------------------------------------------------------------------
// ExpenseFormScreen
// ---------------------------------------------------------------------------

describe("ExpenseFormScreen", () => {
  it("renders the form fields", () => {
    render(
      <Providers>
        <ExpenseFormScreen />
      </Providers>
    );
    expect(screen.getByText("Amount")).toBeTruthy();
    expect(screen.getByText("Category")).toBeTruthy();
    expect(screen.getByText("Date")).toBeTruthy();
    expect(screen.getByText("Description")).toBeTruthy();
  });

  it("shows validation errors on empty submit", () => {
    render(
      <Providers>
        <ExpenseFormScreen />
      </Providers>
    );
    fireEvent.press(screen.getByText("Add Expense"));
    expect(screen.getByText("Amount cannot be zero.")).toBeTruthy();
    expect(screen.getByText("Please select a category.")).toBeTruthy();
  });

  it("navigates back on successful submit", () => {
    render(
      <Providers>
        <ExpenseFormScreen />
      </Providers>
    );
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "25");
    fireEvent.press(screen.getByLabelText("Category"));
    fireEvent.press(screen.getByText("Food"));
    fireEvent.press(screen.getByText("Add Expense"));
    expect(mockBack).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RecurringExpensesScreen
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen", () => {
  it("renders empty state", () => {
    render(
      <Providers>
        <RecurringExpensesScreen />
      </Providers>
    );
    expect(screen.getByText("No recurring expenses set up.")).toBeTruthy();
  });

  it("shows the add button", () => {
    render(
      <Providers>
        <RecurringExpensesScreen />
      </Providers>
    );
    expect(screen.getByText("Add Recurring Expense")).toBeTruthy();
  });

  it("opens the form on add button press", () => {
    render(
      <Providers>
        <RecurringExpensesScreen />
      </Providers>
    );
    fireEvent.press(screen.getByText("Add Recurring Expense"));
    expect(screen.getByText("Amount")).toBeTruthy();
    expect(screen.getByText("Frequency")).toBeTruthy();
  });

  it("shows validation errors on empty form submit", () => {
    render(
      <Providers>
        <RecurringExpensesScreen />
      </Providers>
    );
    fireEvent.press(screen.getByText("Add Recurring Expense"));
    fireEvent.press(screen.getByText("Save"));
    expect(screen.getByText("Amount must be greater than zero.")).toBeTruthy();
    expect(screen.getByText("Please select a category.")).toBeTruthy();
  });

  it("cancels form and returns to list", () => {
    render(
      <Providers>
        <RecurringExpensesScreen />
      </Providers>
    );
    fireEvent.press(screen.getByText("Add Recurring Expense"));
    fireEvent.press(screen.getByText("Cancel"));
    expect(screen.getByText("No recurring expenses set up.")).toBeTruthy();
  });
});
