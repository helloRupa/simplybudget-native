/**
 * Tests for components/Onboarding.tsx
 *
 * Covers:
 *  - Slide rendering (title/body text per slide)
 *  - Forward navigation via Next button
 *  - Backward navigation via Back button
 *  - Back button disabled on first slide
 *  - Set Budget action button appears only on the last slide
 *  - Skip calls onComplete (never onGoToSettings)
 *  - Set Budget calls both onComplete and onGoToSettings
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { openDatabaseSync } from "expo-sqlite";
import { initDatabase, _setDatabase } from "@/utils/database";
import { BudgetProvider } from "@/context/BudgetContext";
import Onboarding from "@/components/Onboarding";

function makeDb() {
  const db = openDatabaseSync("test.db");
  initDatabase(db);
  return db;
}

function renderOnboarding(
  onComplete = jest.fn(),
  onGoToSettings = jest.fn(),
) {
  render(
    <BudgetProvider>
      <Onboarding onComplete={onComplete} onGoToSettings={onGoToSettings} />
    </BudgetProvider>,
  );
  return { onComplete, onGoToSettings };
}

beforeEach(() => {
  _setDatabase(makeDb());
});

afterEach(() => {
  _setDatabase(null);
});

// ---------------------------------------------------------------------------
// Slide 1 — Welcome
// ---------------------------------------------------------------------------

describe("slide 1 (Welcome)", () => {
  it("renders the app name as the title", () => {
    renderOnboarding();
    expect(screen.getByText("SimplyBudget")).toBeTruthy();
  });

  it("shows the Skip button", () => {
    renderOnboarding();
    expect(screen.getByText("Skip")).toBeTruthy();
  });

  it("shows the Next button", () => {
    renderOnboarding();
    expect(screen.getByText("Next")).toBeTruthy();
  });

  it("does not show the Set Budget action button", () => {
    renderOnboarding();
    expect(screen.queryByText("Set Budget")).toBeNull();
  });

  it("Back is present in the tree but disabled so pressing it has no effect", () => {
    renderOnboarding();
    // Back exists (for layout symmetry) but is disabled on slide 1
    const back = screen.getByText("Back");
    expect(back).toBeTruthy();
    fireEvent.press(back); // no-op — slide stays at 1
    expect(screen.getByText("SimplyBudget")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Forward navigation
// ---------------------------------------------------------------------------

describe("forward navigation via Next", () => {
  it("advances to slide 2 (Dashboard)", () => {
    renderOnboarding();
    fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Your finances at a glance")).toBeTruthy();
  });

  it("advances to slide 3 (Expenses)", () => {
    renderOnboarding();
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Log what you spend")).toBeTruthy();
  });

  it("advances to slide 4 (Recurring)", () => {
    renderOnboarding();
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Set it and forget it")).toBeTruthy();
  });

  it("advances to slide 5 (Budget)", () => {
    renderOnboarding();
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Start with a number")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Backward navigation
// ---------------------------------------------------------------------------

describe("backward navigation via Back", () => {
  it("returns to slide 1 from slide 2", () => {
    renderOnboarding();
    fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Your finances at a glance")).toBeTruthy();
    fireEvent.press(screen.getByText("Back"));
    expect(screen.getByText("SimplyBudget")).toBeTruthy();
  });

  it("returns to slide 4 from slide 5", () => {
    renderOnboarding();
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByText("Next"));
    expect(screen.getByText("Start with a number")).toBeTruthy();
    fireEvent.press(screen.getByText("Back"));
    expect(screen.getByText("Set it and forget it")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Last slide
// ---------------------------------------------------------------------------

describe("last slide (Set Your Budget)", () => {
  function navigateToLastSlide() {
    renderOnboarding();
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByText("Next"));
  }

  it("shows the Set Budget action button", () => {
    navigateToLastSlide();
    expect(screen.getByText("Set Budget")).toBeTruthy();
  });

  it("does not show the Next button", () => {
    navigateToLastSlide();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("shows the Back button", () => {
    navigateToLastSlide();
    expect(screen.getByText("Back")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Skip
// ---------------------------------------------------------------------------

describe("Skip", () => {
  it("calls onComplete when Skip is pressed on slide 1", () => {
    const { onComplete, onGoToSettings } = renderOnboarding();
    fireEvent.press(screen.getByText("Skip"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onGoToSettings).not.toHaveBeenCalled();
  });

  it("calls onComplete when Skip is pressed mid-flow (slide 3)", () => {
    const { onComplete, onGoToSettings } = renderOnboarding();
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Skip"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onGoToSettings).not.toHaveBeenCalled();
  });

  it("calls onComplete when Skip is pressed on the last slide", () => {
    const { onComplete, onGoToSettings } = renderOnboarding();
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Skip"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onGoToSettings).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Set Budget action
// ---------------------------------------------------------------------------

describe("Set Budget action", () => {
  it("calls both onComplete and onGoToSettings when pressed", () => {
    const { onComplete, onGoToSettings } = renderOnboarding();
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Set Budget"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onGoToSettings).toHaveBeenCalledTimes(1);
  });
});
