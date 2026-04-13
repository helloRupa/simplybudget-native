/**
 * Tests for hooks/useLockAuth.ts
 *
 * expo-local-authentication is mocked via moduleNameMapper
 * (see __mocks__/expo-local-authentication.ts). Each test controls the return
 * value of getEnrolledLevelAsync / authenticateAsync with mockResolvedValueOnce
 * or mockReturnValueOnce. waitFor is used to let the async useEffect settle
 * without triggering act() warnings.
 */
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  authenticateAsync,
  getEnrolledLevelAsync,
  SecurityLevel,
} from "expo-local-authentication";
import {
  authenticate,
  useLockAuthAvailability,
} from "@/hooks/useLockAuth";

const mockGetEnrolledLevelAsync = getEnrolledLevelAsync as jest.MockedFunction<
  typeof getEnrolledLevelAsync
>;
const mockAuthenticateAsync = authenticateAsync as jest.MockedFunction<
  typeof authenticateAsync
>;

afterEach(() => {
  mockGetEnrolledLevelAsync.mockReset();
  mockAuthenticateAsync.mockReset();
  mockGetEnrolledLevelAsync.mockResolvedValue(SecurityLevel.NONE);
  mockAuthenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" });
});

// ---------------------------------------------------------------------------
// useLockAuthAvailability
// ---------------------------------------------------------------------------

describe("useLockAuthAvailability — initial state", () => {
  it("starts with isReady: false and isAvailable: false before the check resolves", () => {
    // Never-resolving promise lets us observe the initial synchronous state
    mockGetEnrolledLevelAsync.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLockAuthAvailability());
    expect(result.current.isReady).toBe(false);
    expect(result.current.isAvailable).toBe(false);
  });
});

describe("useLockAuthAvailability — after check resolves", () => {
  it("sets isAvailable: false and isReady: true when no lock screen is enrolled (NONE)", async () => {
    mockGetEnrolledLevelAsync.mockResolvedValue(SecurityLevel.NONE);
    const { result } = renderHook(() => useLockAuthAvailability());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isAvailable).toBe(false);
  });

  it("sets isAvailable: true when a PIN/password is enrolled (SECRET)", async () => {
    mockGetEnrolledLevelAsync.mockResolvedValue(SecurityLevel.SECRET);
    const { result } = renderHook(() => useLockAuthAvailability());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isAvailable).toBe(true);
  });

  it("sets isAvailable: true when weak biometrics are enrolled (BIOMETRIC_WEAK)", async () => {
    mockGetEnrolledLevelAsync.mockResolvedValue(SecurityLevel.BIOMETRIC_WEAK);
    const { result } = renderHook(() => useLockAuthAvailability());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isAvailable).toBe(true);
  });

  it("sets isAvailable: true when strong biometrics are enrolled (BIOMETRIC_STRONG)", async () => {
    mockGetEnrolledLevelAsync.mockResolvedValue(SecurityLevel.BIOMETRIC_STRONG);
    const { result } = renderHook(() => useLockAuthAvailability());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isAvailable).toBe(true);
  });
});

describe("useLockAuthAvailability — cancellation", () => {
  it("does not call setState after unmount (cancellation guard)", async () => {
    let resolveLevel!: (level: number) => void;
    mockGetEnrolledLevelAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveLevel = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useLockAuthAvailability());
    unmount();

    // Resolve after unmount — the cancelled flag should block the setState
    await act(async () => {
      resolveLevel(SecurityLevel.SECRET);
    });

    // State must remain at the initial values
    expect(result.current.isReady).toBe(false);
    expect(result.current.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------

describe("authenticate", () => {
  it("returns true when authenticateAsync succeeds", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    expect(await authenticate("Confirm identity")).toBe(true);
  });

  it("returns false when authenticateAsync is cancelled or fails", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" });
    expect(await authenticate("Confirm identity")).toBe(false);
  });

  it("passes the prompt message and correct options to authenticateAsync", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    await authenticate("Verify your identity");
    expect(mockAuthenticateAsync).toHaveBeenCalledWith({
      promptMessage: "Verify your identity",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
  });
});
