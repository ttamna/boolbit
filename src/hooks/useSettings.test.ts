// ABOUTME: Tests for useSettings hook — loading and saving WidgetSettings via Tauri invoke
// ABOUTME: Covers initial state, settings loading, default merging, updateSettings, and ref-based closure correctness

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { useSettings } from "./useSettings";

vi.mock("../lib/tauri", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "../lib/tauri";
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

const DEFAULT_SETTINGS = {
  position: { x: 20, y: 60 },
  size: { width: 380, height: 700 },
  opacity: 1.0,
  theme: "void",
  clockFormat: "24h",
  pinned: false,
};

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(null);
  });

  test("shouldReturnDefaultSettingsInitially", () => {
    // Use a never-resolving promise so the async load cannot complete before we assert
    mockInvoke.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  test("shouldReturnLoadedFalseInitially", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.loaded).toBe(false);
  });

  test("shouldSetLoadedTrueAfterBackendResponds", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
  });

  test("shouldCallLoadSettingsCommandOnMount", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("load_settings");
  });

  test("shouldApplySavedSettingsFromBackend", async () => {
    const saved = { ...DEFAULT_SETTINGS, opacity: 0.8, theme: "slate" };
    mockInvoke.mockResolvedValueOnce(saved);
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.settings.opacity).toBe(0.8);
    expect(result.current.settings.theme).toBe("slate");
  });

  test("shouldFillMissingFieldsWithDefaultsWhenSavedSettingsArePartial", async () => {
    // Simulate a settings file saved by an older version that lacks `pinned`
    const partial = {
      position: { x: 100, y: 200 },
      size: { width: 400, height: 800 },
      opacity: 0.9,
      theme: "void",
      clockFormat: "12h",
    };
    mockInvoke.mockResolvedValueOnce(partial);
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    // Missing field gets default fallback
    expect(result.current.settings.pinned).toBe(false);
    // Provided fields are preserved
    expect(result.current.settings.position).toEqual({ x: 100, y: 200 });
    expect(result.current.settings.clockFormat).toBe("12h");
  });

  test("shouldApplyPatchViaUpdateSettings", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.updateSettings({ opacity: 0.5 });
    });
    expect(result.current.settings.opacity).toBe(0.5);
    // Unpatched fields remain unchanged
    expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  test("shouldCallSaveSettingsCommandOnUpdateSettings", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.clearAllMocks();
    await act(async () => {
      await result.current.updateSettings({ pinned: true });
    });
    expect(mockInvoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({ pinned: true }),
    });
  });

  test("shouldReturnMergedSettingsFromUpdateSettings", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let returned: unknown;
    await act(async () => {
      returned = await result.current.updateSettings({ clockFormat: "12h" });
    });
    expect(returned).toEqual(
      expect.objectContaining({ clockFormat: "12h", opacity: DEFAULT_SETTINGS.opacity })
    );
  });

  test("shouldChainMultipleUpdatesWithoutStaleStateLoss", async () => {
    // Validates that settingsRef avoids stale closure: both patches must survive.
    // Using Promise.all so both calls enter before any await resolves — without settingsRef,
    // the second call would read stale useState (still default) and overwrite the first patch.
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await Promise.all([
        result.current.updateSettings({ opacity: 0.7 }),
        result.current.updateSettings({ pinned: true }),
      ]);
    });
    expect(result.current.settings.opacity).toBe(0.7);
    expect(result.current.settings.pinned).toBe(true);
  });

  test("shouldPreserveOptionalFieldsFromSavedSettings", async () => {
    const saved = { ...DEFAULT_SETTINGS, githubPat: "ghp_token123", githubRefreshInterval: 30 };
    mockInvoke.mockResolvedValueOnce(saved);
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.settings.githubPat).toBe("ghp_token123");
    expect(result.current.settings.githubRefreshInterval).toBe(30);
  });
});
