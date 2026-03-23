// ABOUTME: Tests for useWindowSync hook — position restore on startup and move listener registration
// ABOUTME: Covers isTauri guard, settingsLoaded guard, one-time restore, move events, and cleanup

import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { useWindowSync } from "./useWindowSync";
import type { WidgetSettings } from "../types";

vi.mock("../lib/tauri", () => ({ isTauri: vi.fn() }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(),
  PhysicalPosition: vi.fn(),
}));

import { isTauri } from "../lib/tauri";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";

const mockIsTauri = isTauri as ReturnType<typeof vi.fn>;
const mockGetCurrentWindow = getCurrentWindow as ReturnType<typeof vi.fn>;
const MockPhysicalPosition = PhysicalPosition as ReturnType<typeof vi.fn>;

function makeSettings(x = 100, y = 200): WidgetSettings {
  const s: WidgetSettings = {
    position: { x, y },
    size: { width: 380, height: 600 },
    opacity: 1,
    theme: "void",
    clockFormat: "24h",
  };
  return s;
}

describe("useWindowSync", () => {
  let mockSetPosition: ReturnType<typeof vi.fn>;
  let mockOnMoved: ReturnType<typeof vi.fn>;
  let mockUnlisten: ReturnType<typeof vi.fn>;
  let capturedMovedCallback: ((event: { payload: { x: number; y: number } }) => void) | undefined;

  beforeEach(() => {
    mockIsTauri.mockReturnValue(true);
    mockUnlisten = vi.fn();
    mockSetPosition = vi.fn().mockResolvedValue(undefined);
    capturedMovedCallback = undefined;
    mockOnMoved = vi.fn((cb: (event: { payload: { x: number; y: number } }) => void) => {
      capturedMovedCallback = cb;
      return Promise.resolve(mockUnlisten);
    });
    mockGetCurrentWindow.mockReturnValue({
      setPosition: mockSetPosition,
      onMoved: mockOnMoved,
    });
  });

  afterEach(() => {
    vi.clearAllMocks(); // clears call history of vi.mock() module mocks
  });

  // ─── isTauri guard ───

  test("shouldDoNothingWhenNotInTauri", () => {
    mockIsTauri.mockReturnValue(false);
    const onPositionSave = vi.fn();
    renderHook(() =>
      useWindowSync({ settings: makeSettings(), settingsLoaded: true, onPositionSave })
    );
    // Both effects guard on isTauri() — neither should call getCurrentWindow
    expect(mockGetCurrentWindow).not.toHaveBeenCalled();
    expect(mockSetPosition).not.toHaveBeenCalled();
    expect(mockOnMoved).not.toHaveBeenCalled();
  });

  // ─── position restore ───

  test("shouldNotRestorePositionWhenSettingsNotLoaded", () => {
    const onPositionSave = vi.fn();
    renderHook(() =>
      useWindowSync({ settings: makeSettings(), settingsLoaded: false, onPositionSave })
    );
    expect(mockSetPosition).not.toHaveBeenCalled();
  });

  test("shouldRestorePositionOnceWhenSettingsLoaded", () => {
    const onPositionSave = vi.fn();
    renderHook(() =>
      useWindowSync({ settings: makeSettings(50, 75), settingsLoaded: true, onPositionSave })
    );
    expect(MockPhysicalPosition).toHaveBeenCalledWith(50, 75);
    expect(mockSetPosition).toHaveBeenCalledTimes(1);
  });

  test("shouldRestorePositionOnlyOnceEvenIfPositionChanges", () => {
    const onPositionSave = vi.fn();
    const { rerender } = renderHook(
      ({ x, y }: { x: number; y: number }) =>
        useWindowSync({ settings: makeSettings(x, y), settingsLoaded: true, onPositionSave }),
      { initialProps: { x: 100, y: 200 } }
    );

    expect(mockSetPosition).toHaveBeenCalledTimes(1);

    // Simulate position change (e.g. after a save round-trip) — restoredRef blocks second call
    rerender({ x: 300, y: 400 });
    expect(mockSetPosition).toHaveBeenCalledTimes(1);
  });

  test("shouldRestorePositionOnlyOnceEvenIfSettingsLoadedToggles", () => {
    const onPositionSave = vi.fn();
    const { rerender } = renderHook(
      ({ loaded }: { loaded: boolean }) =>
        useWindowSync({ settings: makeSettings(), settingsLoaded: loaded, onPositionSave }),
      { initialProps: { loaded: true } }
    );

    expect(mockSetPosition).toHaveBeenCalledTimes(1);

    rerender({ loaded: false });
    rerender({ loaded: true });
    expect(mockSetPosition).toHaveBeenCalledTimes(1);
  });

  // ─── move listener ───

  test("shouldRegisterMoveListenerOnMount", () => {
    const onPositionSave = vi.fn();
    renderHook(() =>
      useWindowSync({ settings: makeSettings(), settingsLoaded: false, onPositionSave })
    );
    expect(mockOnMoved).toHaveBeenCalledTimes(1);
  });

  test.each([
    { x: 500, y: 600 },
    { x: 0, y: 0 },
    { x: 1920, y: 1080 },
  ])("shouldCallOnPositionSaveWhenWindowMoves($x, $y)", async ({ x, y }) => {
    const onPositionSave = vi.fn();
    renderHook(() =>
      useWindowSync({ settings: makeSettings(), settingsLoaded: true, onPositionSave })
    );

    // Allow onMoved promise to resolve and set unlisten
    await act(async () => { await Promise.resolve(); });

    expect(capturedMovedCallback).toBeDefined();
    capturedMovedCallback!({ payload: { x, y } });
    expect(onPositionSave).toHaveBeenCalledWith(x, y);
  });

  test("shouldCleanupMoveListenerOnUnmount", async () => {
    const onPositionSave = vi.fn();
    const { unmount } = renderHook(() =>
      useWindowSync({ settings: makeSettings(), settingsLoaded: true, onPositionSave })
    );

    // Wait for onMoved promise to resolve so unlisten is set before cleanup runs
    await act(async () => { await Promise.resolve(); });

    unmount();
    expect(mockUnlisten).toHaveBeenCalledTimes(1);
  });

  test("shouldReRegisterMoveListenerWhenOnPositionSaveChanges", async () => {
    const onPositionSaveV1 = vi.fn();
    const onPositionSaveV2 = vi.fn();

    const { rerender } = renderHook(
      ({ fn }: { fn: typeof onPositionSaveV1 }) =>
        useWindowSync({ settings: makeSettings(), settingsLoaded: true, onPositionSave: fn }),
      { initialProps: { fn: onPositionSaveV1 } }
    );

    // Wait for first onMoved promise to resolve before triggering cleanup via rerender
    await act(async () => { await Promise.resolve(); });

    rerender({ fn: onPositionSaveV2 });
    await act(async () => { await Promise.resolve(); });

    expect(mockOnMoved).toHaveBeenCalledTimes(2);
    expect(mockUnlisten).toHaveBeenCalledTimes(1); // first listener cleaned up
  });
});
