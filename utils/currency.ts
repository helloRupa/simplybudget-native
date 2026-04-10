export function formatCurrency(
  amount: number,
  locale = "en-US",
  currency = "USD"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function getCurrencySymbol(currency: string, locale = "en-US"): string {
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(0);
    // Strip digits, decimal separators, and whitespace to isolate the symbol
    return formatted.replace(/[\d,.\s]/g, "").trim() || currency;
  } catch {
    return currency;
  }
}
