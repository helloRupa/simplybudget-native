import { render, screen } from "@testing-library/react-native";

import DashboardScreen from "@/app/(tabs)/index";
import SettingsScreen from "@/app/(tabs)/settings";

describe("Placeholder screens", () => {
  it("DashboardScreen renders without crashing", () => {
    render(<DashboardScreen />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("SettingsScreen renders without crashing", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });
});
