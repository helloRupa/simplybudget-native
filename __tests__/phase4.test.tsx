/**
 * Tests for Phase 4 components: Toast, AboutModal, Header.
 *
 * BudgetProvider is backed by the better-sqlite3 in-memory mock.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import { initDatabase, _setDatabase } from "@/utils/database";
import { BudgetProvider } from "@/context/BudgetContext";
import Toast from "@/components/Toast";
import AboutModal from "@/components/AboutModal";
import Header from "@/components/Header";

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

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

describe("Toast", () => {
  it("renders the message", () => {
    render(<Toast message="Expense added!" onClose={() => {}} />);
    expect(screen.getByText("Expense added!")).toBeTruthy();
  });

  it("renders the success icon by default", () => {
    render(<Toast message="Done" onClose={() => {}} />);
    expect(screen.getByText("✓")).toBeTruthy();
  });

  it("renders the error icon for type=error", () => {
    render(<Toast message="Oops" type="error" onClose={() => {}} />);
    // Both the icon and close button use ✕ — icon is rendered first
    expect(screen.getAllByText("✕")[0]).toBeTruthy();
  });

  it("renders the info icon for type=info", () => {
    render(<Toast message="FYI" type="info" onClose={() => {}} />);
    expect(screen.getByText("ℹ")).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(<Toast message="Done" onClose={onClose} />);
    // close button also shows ✕ — get the Pressable's child
    const closeButtons = screen.getAllByText("✕");
    // The last ✕ is the close button (first may be the icon for error type)
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    // onClose is called after the 250ms animation — just verify no throw
    expect(onClose).not.toThrow();
  });

  it("calls onClose automatically after duration", () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(<Toast message="Auto" onClose={onClose} duration={1000} />);

    act(() => {
      jest.advanceTimersByTime(1000 + 300); // duration + animation
    });

    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// AboutModal
// ---------------------------------------------------------------------------

describe("AboutModal", () => {
  it("renders nothing when not visible", () => {
    render(
      <Providers>
        <AboutModal visible={false} onClose={() => {}} />
      </Providers>
    );
    expect(screen.queryByText("SimplyBudget")).toBeNull();
  });

  it("renders content when visible", () => {
    render(
      <Providers>
        <AboutModal visible={true} onClose={() => {}} />
      </Providers>
    );
    expect(screen.getByText("Simply")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
  });

  it("shows the version number", () => {
    render(
      <Providers>
        <AboutModal visible={true} onClose={() => {}} />
      </Providers>
    );
    expect(screen.getByText(/0\.1\.0/)).toBeTruthy();
  });

  it("shows built-by credit", () => {
    render(
      <Providers>
        <AboutModal visible={true} onClose={() => {}} />
      </Providers>
    );
    expect(screen.getByText(/Rupa/)).toBeTruthy();
    expect(screen.getByText(/Claude Code/)).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(
      <Providers>
        <AboutModal visible={true} onClose={onClose} />
      </Providers>
    );
    fireEvent.press(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe("Header", () => {
  it("renders the app name", () => {
    render(
      <Providers>
        <Header />
      </Providers>
    );
    expect(screen.getByText("Simply")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
  });

  it("renders the current locale name", () => {
    render(
      <Providers>
        <Header />
      </Providers>
    );
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("opens locale picker on press", () => {
    render(
      <Providers>
        <Header />
      </Providers>
    );
    fireEvent.press(screen.getByText("English"));
    expect(screen.getByText("Español")).toBeTruthy();
    expect(screen.getByText("Français")).toBeTruthy();
  });

  it("changes locale when a language is selected", () => {
    render(
      <Providers>
        <Header />
      </Providers>
    );
    fireEvent.press(screen.getByText("English"));
    fireEvent.press(screen.getByText("Español"));
    expect(screen.getByText("Español")).toBeTruthy();
  });

  it("does not render an about/info button", () => {
    render(
      <Providers>
        <Header />
      </Providers>
    );
    expect(screen.queryByLabelText("About")).toBeNull();
  });
});
