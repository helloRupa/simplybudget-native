import type { LocaleKey } from "@/i18n/locales";
import { SUPPORTED_CURRENCIES } from "@/utils/constants";
import type { CurrencyCode } from "@/utils/constants";
import { getLocales } from "expo-localization";

/**
 * Returns the closest supported LocaleKey for the device's preferred language,
 * falling back to "en" if the language is unsupported.
 */
export function getDeviceLocaleKey(): LocaleKey {
  const lang = getLocales()[0]?.languageCode ?? "";
  if (lang === "es") return "es";
  if (lang === "fr") return "fr";
  return "en";
}

/**
 * Returns the device's currency code if it is in SUPPORTED_CURRENCIES,
 * falling back to "USD" otherwise.
 */
export function getDeviceCurrencyCode(): CurrencyCode {
  const code = getLocales()[0]?.currencyCode ?? "";
  return code in SUPPORTED_CURRENCIES ? (code as CurrencyCode) : "USD";
}
