/**
 * Tests for utils/deviceLocale.ts
 *
 * expo-localization is mocked (see __mocks__/expo-localization.ts).
 * Each test overrides getLocales to simulate a specific device configuration.
 */
import {
  getDeviceCurrencyCode,
  getDeviceLocaleKey,
  getDeviceWeekStartDay,
} from "@/utils/deviceLocale";
import { getCalendars, getLocales } from "expo-localization";

const mockGetLocales = getLocales as jest.MockedFunction<typeof getLocales>;
const mockGetCalendars = getCalendars as jest.MockedFunction<
  typeof getCalendars
>;

function mockFirstWeekday(firstWeekday: number | null | undefined) {
  mockGetCalendars.mockReturnValue([
    { firstWeekday } as ReturnType<typeof getCalendars>[number],
  ]);
}

function mockDevice(languageCode: string | null, currencyCode: string | null) {
  mockGetLocales.mockReturnValue([
    { languageCode, currencyCode } as ReturnType<typeof getLocales>[number],
  ]);
}

afterEach(() => {
  mockGetLocales.mockClear();
  mockGetCalendars.mockClear();
});

// ---------------------------------------------------------------------------
// getDeviceLocaleKey
// ---------------------------------------------------------------------------

describe("getDeviceLocaleKey", () => {
  it('returns "en" for English device', () => {
    mockDevice("en", "USD");
    expect(getDeviceLocaleKey()).toBe("en");
  });

  it('returns "es" for Spanish device', () => {
    mockDevice("es", "MXN");
    expect(getDeviceLocaleKey()).toBe("es");
  });

  it('returns "fr" for French device', () => {
    mockDevice("fr", "EUR");
    expect(getDeviceLocaleKey()).toBe("fr");
  });

  it('falls back to "en" for an unsupported language', () => {
    mockDevice("zh", "CNY");
    expect(getDeviceLocaleKey()).toBe("en");
  });

  it('falls back to "en" for an unsupported language (German)', () => {
    mockDevice("de", "EUR");
    expect(getDeviceLocaleKey()).toBe("en");
  });

  it('falls back to "en" when languageCode is null', () => {
    mockDevice(null, "USD");
    expect(getDeviceLocaleKey()).toBe("en");
  });

  it("handles empty locale list gracefully", () => {
    mockGetLocales.mockReturnValue([]);
    expect(getDeviceLocaleKey()).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// getDeviceCurrencyCode
// ---------------------------------------------------------------------------

describe("getDeviceCurrencyCode", () => {
  it("returns USD for a US device", () => {
    mockDevice("en", "USD");
    expect(getDeviceCurrencyCode()).toBe("USD");
  });

  it("returns GBP for a UK device", () => {
    mockDevice("en", "GBP");
    expect(getDeviceCurrencyCode()).toBe("GBP");
  });

  it("returns EUR for a French device", () => {
    mockDevice("fr", "EUR");
    expect(getDeviceCurrencyCode()).toBe("EUR");
  });

  it("returns INR for an Indian device", () => {
    mockDevice("hi", "INR");
    expect(getDeviceCurrencyCode()).toBe("INR");
  });

  it("returns JPY for a Japanese device", () => {
    mockDevice("ja", "JPY");
    expect(getDeviceCurrencyCode()).toBe("JPY");
  });

  it('falls back to "USD" for an unsupported currency', () => {
    mockDevice("zh", "CNY");
    expect(getDeviceCurrencyCode()).toBe("USD");
  });

  it('falls back to "USD" when currencyCode is null', () => {
    mockDevice("en", null);
    expect(getDeviceCurrencyCode()).toBe("USD");
  });

  it("handles empty locale list gracefully", () => {
    mockGetLocales.mockReturnValue([]);
    expect(getDeviceCurrencyCode()).toBe("USD");
  });
});

// ---------------------------------------------------------------------------
// getDeviceWeekStartDay
// ---------------------------------------------------------------------------

describe("getDeviceWeekStartDay", () => {
  it("converts CLDR Sunday (1) to date-fns Sunday (0)", () => {
    mockFirstWeekday(1);
    expect(getDeviceWeekStartDay()).toBe(0);
  });

  it("converts CLDR Monday (2) to date-fns Monday (1)", () => {
    mockFirstWeekday(2);
    expect(getDeviceWeekStartDay()).toBe(1);
  });

  it("converts CLDR Saturday (7) to date-fns Saturday (6)", () => {
    mockFirstWeekday(7);
    expect(getDeviceWeekStartDay()).toBe(6);
  });

  it("falls back to Monday (1) when firstWeekday is missing", () => {
    mockFirstWeekday(undefined);
    expect(getDeviceWeekStartDay()).toBe(1);
  });

  it("falls back to Monday (1) when the calendar list is empty", () => {
    mockGetCalendars.mockReturnValue([]);
    expect(getDeviceWeekStartDay()).toBe(1);
  });
});
