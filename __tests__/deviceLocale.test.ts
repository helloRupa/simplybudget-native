/**
 * Tests for utils/deviceLocale.ts
 *
 * expo-localization is mocked (see __mocks__/expo-localization.ts).
 * Each test overrides getLocales to simulate a specific device configuration.
 */
import {
  getDeviceCurrencyCode,
  getDeviceLocaleKey,
} from "@/utils/deviceLocale";
import { getLocales } from "expo-localization";

const mockGetLocales = getLocales as jest.MockedFunction<typeof getLocales>;

function mockDevice(languageCode: string | null, currencyCode: string | null) {
  mockGetLocales.mockReturnValue([
    { languageCode, currencyCode } as ReturnType<typeof getLocales>[number],
  ]);
}

afterEach(() => {
  mockGetLocales.mockClear();
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
