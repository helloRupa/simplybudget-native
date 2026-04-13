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
