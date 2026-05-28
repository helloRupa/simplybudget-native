import type { LocaleKey } from "@/i18n/locales";
import { SUPPORTED_CURRENCIES } from "@/utils/constants";
import type { CurrencyCode } from "@/utils/constants";
import { getCalendars, getLocales } from "expo-localization";
import type { Day } from "date-fns";

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

/**
 * Returns the device's preferred first day of the week as a date-fns Day (0=Sun
 * .. 6=Sat). expo-localization reports CLDR firstWeekday (1=Sun .. 7=Sat), so we
 * convert with (firstWeekday - 1) % 7. Falls back to 1 (Monday) if unavailable.
 */
export function getDeviceWeekStartDay(): Day {
  const firstWeekday = getCalendars()[0]?.firstWeekday;
  if (typeof firstWeekday !== "number") return 1;
  return ((firstWeekday - 1) % 7) as Day;
}
