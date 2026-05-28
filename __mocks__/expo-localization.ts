/**
 * Jest mock for expo-localization.
 * Returns English/USD by default so tests that don't override this still pass.
 * Individual tests can call mockReturnValue on getLocales to simulate other devices.
 */
export const getLocales = jest.fn(() => [
  {
    languageCode: "en",
    languageTag: "en-US",
    regionCode: "US",
    currencyCode: "USD",
    currencySymbol: "$",
    decimalSeparator: ".",
    digitGroupingSeparator: ",",
    measurementSystem: "us",
    temperatureUnit: "fahrenheit",
    textDirection: "ltr",
    uses24HourClock: false,
  },
]);

/**
 * Returns a single calendar with firstWeekday in CLDR convention (1=Sunday ..
 * 7=Saturday). Defaults to 2 (Monday) so the date-fns conversion lands on 1
 * (Monday), matching the app's historical hardcoded week start. Individual
 * tests can override with mockReturnValue to simulate other devices.
 */
export const getCalendars = jest.fn(() => [
  {
    calendar: "gregory",
    timeZone: "America/New_York",
    uses24hourClock: false,
    firstWeekday: 2,
  },
]);
