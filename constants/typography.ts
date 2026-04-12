export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
} as const;

export const fontSize = {
  xs: 10,
  sm: 11,
  base: 12,
  md: 13,
  lg: 14,
  xl: 15,
  xxl: 16,
  xxxl: 18,
  display: 20,
  hero: 24,
} as const;

export const radius = {
  sm: 8,   // small action buttons, confirm/cancel
  md: 10,  // inputs, pickers, triggers
  lg: 12,  // cards, primary buttons
  xl: 14,  // modal sheets, filter panels
  xxl: 16, // section cards, large modals
  full: 20, // pill badges
} as const;
