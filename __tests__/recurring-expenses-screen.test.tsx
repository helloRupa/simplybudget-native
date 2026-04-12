/**
 * Tests for app/recurring-expenses.tsx
 *
 * Covers the behaviors that the #8 refactor (extracting RecurringExpenseForm)
 * could accidentally break: rendering, form open/close, validation, add flow,
 * edit pre-population, delete flow, and frequency-specific field visibility.
 *
 * Pattern mirrors expenses.test.tsx — a fresh in-memory DB per test via
 * _setDatabase; seeding via renderHook so the screen's BudgetProvider hydrates
 * from the shared DB on mount.
 */
import RecurringExpensesScreen from "@/app/recurring-expenses";
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import { _setDatabase, initDatabase } from "@/utils/database";
import { toISODate } from "@/utils/dates";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import React from "react";

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

function wrapper({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}

function renderScreen() {
  return render(
    <Providers>
      <RecurringExpensesScreen />
    </Providers>,
  );
}

/**
 * Seeds a recurring expense via the context hook so the rendered screen
 * hydrates it from the shared in-memory DB on mount.
 */
function seedRecurringExpense(
  overrides: Partial<
    Parameters<ReturnType<typeof useBudget>["addRecurringExpense"]>[0]
  > = {},
) {
  const { result } = renderHook(() => useBudget(), { wrapper });
  act(() => {
    result.current.addRecurringExpense({
      amount: 100,
      category: "Bills",
      description: "Internet",
      frequency: "monthly",
      dayOfMonth: 15,
      startDate: "2026-04-15",
      endDate: null,
      ...overrides,
    });
  });
}

/**
 * Opens the add form and fills in the minimum required fields (amount + category).
 * Does not press Save — lets each test assert its own outcome.
 */
function openFormAndFill(amount = "50", category = "Bills") {
  fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
  fireEvent.changeText(screen.getByPlaceholderText("0.00"), amount);
  // Open the category picker modal and select the given category
  fireEvent.press(screen.getByLabelText("Category"));
  fireEvent.press(screen.getByText(category));
}

beforeEach(() => {
  _setDatabase(makeDb());
});

afterEach(() => {
  _setDatabase(null);
});

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — list", () => {
  it("shows the empty state when there are no recurring expenses", () => {
    renderScreen();
    expect(screen.getByText("No recurring expenses set up.")).toBeTruthy();
  });

  it("renders the Add Recurring Expense button", () => {
    renderScreen();
    expect(screen.getByLabelText("Add Recurring Expense")).toBeTruthy();
  });

  it("renders a seeded recurring expense in the list", () => {
    seedRecurringExpense();
    renderScreen();
    // The card shows the formatted amount and the frequency label
    expect(screen.getByText(/monthly, on day 15/i)).toBeTruthy();
  });

  it("renders multiple seeded expenses", () => {
    seedRecurringExpense({ description: "Internet", startDate: "2026-05-01" });
    seedRecurringExpense({
      description: "Phone",
      amount: 30,
      startDate: "2026-05-01",
    });
    renderScreen();
    expect(screen.getByText("Internet")).toBeTruthy();
    expect(screen.getByText("Phone")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Form open / close
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — form open/close", () => {
  it("shows the form when Add Recurring Expense is pressed", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    expect(screen.getByText("Add Recurring Expense")).toBeTruthy();
    expect(screen.getByPlaceholderText("0.00")).toBeTruthy();
  });

  it("hides the Add button and list while the form is open", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    expect(screen.queryByText("No recurring expenses set up.")).toBeNull();
  });

  it("closes the form and returns to the list when Cancel is pressed", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Cancel"));
    expect(screen.queryByPlaceholderText("0.00")).toBeNull();
    expect(screen.getByLabelText("Add Recurring Expense")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — validation", () => {
  it("shows an error when amount is empty on submit", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Amount must be greater than zero.")).toBeTruthy();
  });

  it("shows an error when amount is zero", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "0");
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Amount must be greater than zero.")).toBeTruthy();
  });

  it("shows an error when amount is negative", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "-10");
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Amount must be greater than zero.")).toBeTruthy();
  });

  it("shows an error when category is not selected", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "50");
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Please select a category.")).toBeTruthy();
  });

  it("does not submit when both amount and category are missing", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Save"));
    // Form stays open — Save button still present
    expect(screen.getByLabelText("Save")).toBeTruthy();
  });

  it("shows an error when end date is today", () => {
    const today = toISODate(new Date());
    seedRecurringExpense({ endDate: today });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(screen.getByText("End date must be in the future.")).toBeTruthy();
  });

  it("shows an error when end date is in the past", () => {
    seedRecurringExpense({ endDate: "2025-01-01" });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(screen.getByText("End date must be in the future.")).toBeTruthy();
  });

  it("does not show an end date error when end date is in the future", () => {
    seedRecurringExpense({ endDate: "2099-12-31" });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(screen.queryByText("End date must be in the future.")).toBeNull();
    expect(screen.getByText("Recurring expense updated!")).toBeTruthy();
  });

  it("does not show an end date error when end date is absent", () => {
    seedRecurringExpense({ endDate: null });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(screen.queryByText("End date must be in the future.")).toBeNull();
  });

  it("shows an error when end date is the same as start date", () => {
    seedRecurringExpense({ startDate: "2099-06-01", endDate: "2099-06-01" });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(
      screen.getByText("End date must be after the start date.")
    ).toBeTruthy();
  });

  it("shows an error when end date is before start date", () => {
    seedRecurringExpense({ startDate: "2099-06-15", endDate: "2099-06-01" });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(
      screen.getByText("End date must be after the start date.")
    ).toBeTruthy();
  });

  it("does not show an end date error when end date is after start date", () => {
    seedRecurringExpense({ startDate: "2099-06-01", endDate: "2099-06-30" });
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));
    expect(
      screen.queryByText("End date must be after the start date.")
    ).toBeNull();
    expect(screen.getByText("Recurring expense updated!")).toBeTruthy();
  });

  it("clears validation errors after a successful submit", () => {
    renderScreen();
    // Trigger errors first
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Amount must be greater than zero.")).toBeTruthy();

    // Now fill and reopen — errors should be gone
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "50");
    fireEvent.press(screen.getByLabelText("Category"));
    fireEvent.press(screen.getByText("Bills"));
    fireEvent.press(screen.getByLabelText("Save"));

    // Form closed = errors gone
    expect(screen.queryByText("Amount must be greater than zero.")).toBeNull();
    expect(screen.queryByText("Please select a category.")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Add flow
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — add", () => {
  it("closes the form and shows the new entry after a valid submit", () => {
    renderScreen();
    openFormAndFill("75", "Food");
    fireEvent.press(screen.getByLabelText("Save"));

    // Form closed, list visible
    expect(screen.queryByPlaceholderText("0.00")).toBeNull();
    expect(screen.getByLabelText("Add Recurring Expense")).toBeTruthy();
  });

  it("shows the success toast after adding", () => {
    renderScreen();
    openFormAndFill("75", "Food");
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Recurring expense added!")).toBeTruthy();
  });

  it("the new entry appears in the list", () => {
    renderScreen();
    openFormAndFill("75", "Food");
    fireEvent.changeText(
      screen.getByPlaceholderText("What did you spend on? (optional)"),
      "Gym",
    );
    fireEvent.press(screen.getByLabelText("Save"));
    expect(screen.getByText("Gym")).toBeTruthy();
  });

  it("pressing Add again after a save starts a blank form", () => {
    renderScreen();
    openFormAndFill("75", "Food");
    fireEvent.press(screen.getByLabelText("Save"));

    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    // Amount field should be empty (blank, showing placeholder)
    const input = screen.getByPlaceholderText("0.00");
    expect(input.props.value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Edit flow
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — edit", () => {
  beforeEach(() => {
    seedRecurringExpense({
      amount: 99,
      category: "Bills",
      description: "Netflix",
      startDate: "2026-05-01",
    });
  });

  it("opens the form with the Edit title when Edit is pressed", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    expect(screen.getByText("Edit Recurring Expense")).toBeTruthy();
  });

  it("pre-populates the amount field with the existing value", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    expect(screen.getByPlaceholderText("0.00").props.value).toBe("99");
  });

  it("pre-populates the description field", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    expect(
      screen.getByPlaceholderText("What did you spend on? (optional)").props
        .value,
    ).toBe("Netflix");
  });

  it("shows the Update button (not Save) in edit mode", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    expect(screen.getByLabelText("Update")).toBeTruthy();
    expect(screen.queryByLabelText("Save")).toBeNull();
  });

  it("updates the entry and shows success toast after submitting", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "150");
    fireEvent.press(screen.getByLabelText("Update"));

    expect(screen.getByText("Recurring expense updated!")).toBeTruthy();
  });

  it("closes the form and returns to the list after update", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.press(screen.getByLabelText("Update"));

    expect(screen.queryByPlaceholderText("0.00")).toBeNull();
    expect(screen.getByLabelText("Add Recurring Expense")).toBeTruthy();
  });

  it("cancelling edit returns to the list without changes", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "999");
    fireEvent.press(screen.getByLabelText("Cancel"));

    // Original description still in list
    expect(screen.getByText("Netflix")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — delete", () => {
  beforeEach(() => {
    seedRecurringExpense({ startDate: "2026-05-01" });
  });

  it("shows confirm/cancel buttons after pressing Delete", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Delete"));
    // A styled confirm Delete and a Cancel should now be visible
    expect(screen.getAllByText("Delete").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("removes the entry after confirming delete", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Delete")); // enter confirm mode
    fireEvent.press(screen.getByText("Delete")); // confirm
    expect(screen.getByText("No recurring expenses set up.")).toBeTruthy();
  });

  it("shows the success toast after delete", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Delete"));
    fireEvent.press(screen.getByText("Delete"));
    expect(screen.getByText("Recurring expense deleted.")).toBeTruthy();
  });

  it("cancels delete and keeps the entry", () => {
    renderScreen();
    fireEvent.press(screen.getByText("Delete"));
    fireEvent.press(screen.getByText("Cancel"));
    // Still in list, no empty state
    expect(screen.queryByText("No recurring expenses set up.")).toBeNull();
    expect(screen.getByText("Edit")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Frequency-specific field visibility
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — frequency fields", () => {
  it("shows Day of Month picker by default (monthly)", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    expect(screen.getByLabelText("Day of Month")).toBeTruthy();
    expect(screen.queryByLabelText("Day of Week")).toBeNull();
    expect(screen.queryByLabelText("Month")).toBeNull();
  });

  it("shows Day of Week picker when weekly is selected, hides Day of Month", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Frequency"));
    fireEvent.press(screen.getByText("weekly"));
    expect(screen.getByLabelText("Day of Week")).toBeTruthy();
    expect(screen.queryByLabelText("Day of Month")).toBeNull();
  });

  it("shows Month and Day of Month pickers when annually is selected", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Frequency"));
    fireEvent.press(screen.getByText("annually"));
    expect(screen.getByLabelText("Month")).toBeTruthy();
    expect(screen.getByLabelText("Day of Month")).toBeTruthy();
    expect(screen.queryByLabelText("Day of Week")).toBeNull();
  });

  it("switching back from weekly to monthly restores Day of Month", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Add Recurring Expense"));
    fireEvent.press(screen.getByLabelText("Frequency"));
    fireEvent.press(screen.getByText("weekly"));
    fireEvent.press(screen.getByLabelText("Frequency"));
    fireEvent.press(screen.getByText("monthly"));
    expect(screen.getByLabelText("Day of Month")).toBeTruthy();
    expect(screen.queryByLabelText("Day of Week")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Expired styling
// ---------------------------------------------------------------------------

describe("RecurringExpensesScreen — expired styling", () => {
  it("shows the Expired badge for a recurring expense whose endDate has passed", () => {
    seedRecurringExpense({ endDate: "2025-01-01" });
    renderScreen();
    expect(screen.getByText("Expired")).toBeTruthy();
  });

  it("does not show the Expired badge when endDate is null", () => {
    seedRecurringExpense({ endDate: null });
    renderScreen();
    expect(screen.queryByText("Expired")).toBeNull();
  });

  it("does not show the Expired badge when endDate is in the future", () => {
    seedRecurringExpense({ endDate: "2099-12-31" });
    renderScreen();
    expect(screen.queryByText("Expired")).toBeNull();
  });

  it("shows Expired badge only on the expired card when both expired and active expenses exist", () => {
    seedRecurringExpense({ description: "Old Plan", endDate: "2025-01-01" });
    seedRecurringExpense({ description: "Current Plan", endDate: null });
    renderScreen();
    expect(screen.getByText("Expired")).toBeTruthy();
    expect(screen.getByText("Old Plan")).toBeTruthy();
    expect(screen.getByText("Current Plan")).toBeTruthy();
  });

  it("expired cards still show edit and delete actions", () => {
    seedRecurringExpense({ endDate: "2025-01-01" });
    renderScreen();
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });
});
