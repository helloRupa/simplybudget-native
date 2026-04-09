import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import AppName from "@/components/AppName";
import { colors } from "@/constants/colors";

describe("AppName", () => {
  it("renders Simply and Budget text", () => {
    render(<AppName />);
    expect(screen.getByText("Simply")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
  });

  it("applies teal color to Budget", () => {
    render(<AppName />);
    const budget = screen.getByText("Budget");
    expect(budget.props.style).toMatchObject({ color: colors.teal });
  });

  it("applies white color to Simply", () => {
    render(<AppName />);
    const simply = screen.getByText("Simply");
    expect(simply.props.style).toMatchObject({ color: colors.white });
  });

  it("uses large font size by default", () => {
    render(<AppName />);
    const text = screen.getByTestId("appname-text");
    const flatStyle = StyleSheet.flatten(text.props.style);
    expect(flatStyle?.fontSize).toBe(24);
  });

  it("uses small font size when size='small'", () => {
    render(<AppName size="small" />);
    const text = screen.getByTestId("appname-text");
    const flatStyle = StyleSheet.flatten(text.props.style);
    expect(flatStyle?.fontSize).toBe(18);
  });
});
