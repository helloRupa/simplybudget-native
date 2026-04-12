import { TextStyle, ViewStyle } from "react-native";
import { colors } from "./colors";
import { fonts, fontSize, radius } from "./typography";

/** Field label above inputs — shared by FieldPicker, DateField, expense-form, RecurringExpenseForm */
export const formLabel: TextStyle = {
  color: colors.textSecondary,
  fontSize: fontSize.md,
  fontFamily: fonts.semiBold,
  marginBottom: 6,
};

/** Standard text input — shared by expense-form and RecurringExpenseForm */
export const textInput: TextStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  paddingVertical: 11,
  color: colors.white,
  fontSize: fontSize.xl,
  fontFamily: fonts.regular,
};

/** Inline validation error below a field — shared by FieldPicker, DateField, expense-form, RecurringExpenseForm */
export const inlineError: TextStyle = {
  color: colors.dangerText,
  fontSize: fontSize.base,
  fontFamily: fonts.regular,
  marginTop: 4,
};

/** Surface section card — shared by the dashboard and settings screens */
export const surfaceCard: ViewStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.xxl,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
  gap: 12,
};
