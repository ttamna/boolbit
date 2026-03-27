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

  test("shouldPreserveOptionalFieldsThroughSubsequentUpdateSettingsCalls", async () => {
    // When backend returns settings with optional fields (e.g. githubPat) and the
    // user then calls updateSettings with an unrelated patch, the optional field must
    // survive in both the local state and the next save_settings payload.
    // This tests the settingsRef round-trip: load → ref includes optional → update spreads ref.
    const saved = { ...DEFAULT_SETTINGS, githubPat: "ghp_round_trip_test" };
    mockInvoke.mockResolvedValueOnce(saved);
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.clearAllMocks();
    await act(async () => {
      await result.current.updateSettings({ opacity: 0.4 });
    });
    // Optional field from initial load must survive the patch round-trip
    expect(result.current.settings.githubPat).toBe("ghp_round_trip_test");
    expect(result.current.settings.opacity).toBe(0.4);
    // Save must include the optional field alongside the patched field
    expect(mockInvoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({ githubPat: "ghp_round_trip_test", opacity: 0.4 }),
    });
  });

  test("shouldPreservePreLoadUpdateWhenLoadReturnsNull", async () => {
    // Contract: callers are NOT required to await loaded before calling updateSettings.
    // The hook accepts updates at any lifecycle stage — settingsRef is initialised to
    // DEFAULT_SETTINGS at construction, so pre-load patches use defaults as a base.
    // When load subsequently returns null (if(saved) skipped), settingsRef is NOT
    // overwritten and the pre-load patch survives intact.
    let resolveLoad!: (v: null) => void;
    mockInvoke.mockImplementationOnce(() => new Promise((res) => { resolveLoad = res; }));
    mockInvoke.mockResolvedValue(null); // subsequent save_settings calls

    const { result } = renderHook(() => useSettings());
    // Call update while load is still pending (ref starts at DEFAULT_SETTINGS)
    await act(async () => {
      await result.current.updateSettings({ opacity: 0.2 });
    });
    expect(result.current.settings.opacity).toBe(0.2);

    // Resolve load with null → no merge, pre-load update is preserved
    await act(async () => { resolveLoad(null); });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.settings.opacity).toBe(0.2);
  });

  test("shouldNotReloadSettingsAfterStateChangingUpdate", async () => {
    // Guard against `useEffect([..., settings])` mis-configuration: if settings or
    // settingsRef were accidentally added to the effect deps, every updateSettings
    // call would re-run load_settings. This test triggers a state-changing re-render
    // via updateSettings and verifies load_settings is NOT called again.
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.clearAllMocks(); // only track calls made after initial load
    await act(async () => {
      await result.current.updateSettings({ opacity: 0.7 });
    });
    const loadCallsAfterUpdate = mockInvoke.mock.calls.filter((c) => c[0] === "load_settings");
    expect(loadCallsAfterUpdate).toHaveLength(0);
  });

  test("shouldSaveAllCurrentFieldsNotJustThePatch", async () => {
    // The backend needs the full merged state on every save, not a sparse patch.
    // If the impl sent only `{ settings: patch }`, none of the default fields below
    // would be present — this assertion fails in that case.
    // Uses objectContaining so optional fields added by load don't cause false failures.
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.clearAllMocks();
    await act(async () => {
      await result.current.updateSettings({ pinned: true });
    });
    expect(mockInvoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({
        pinned: true,
        opacity: DEFAULT_SETTINGS.opacity,
        theme: DEFAULT_SETTINGS.theme,
        position: DEFAULT_SETTINGS.position,
        size: DEFAULT_SETTINGS.size,
        clockFormat: DEFAULT_SETTINGS.clockFormat,
      }),
    });
  });
});
