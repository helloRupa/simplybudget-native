export const DEFAULT_CATEGORY_NAMES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type CurrencyCode =
  | "USD"
  | "GBP"
  | "EUR"
  | "CAD"
  | "AUD"
  | "JPY"
  | "INR"
  | "MXN"
  | "BRL"
  | "CHF";

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, string> = {
  USD: "US Dollar ($)",
  GBP: "British Pound (£)",
  EUR: "Euro (€)",
  CAD: "Canadian Dollar (CA$)",
  AUD: "Australian Dollar (A$)",
  JPY: "Japanese Yen (¥)",
  INR: "Indian Rupee (₹)",
  MXN: "Mexican Peso (MX$)",
  BRL: "Brazilian Real (R$)",
  CHF: "Swiss Franc (CHF)",
};
