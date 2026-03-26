// ABOUTME: Tests for useWindowResize hook — ResizeObserver + RAF batching + screen height cap
// ABOUTME: Covers isTauri guard, null ref guard, immediate sizing, height cap, RAF batching, and cleanup

import { renderHook } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { useWindowResize } from "./useWindowResize";

vi.mock("../lib/tauri", () => ({ isTauri: vi.fn() }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(),
  LogicalSize: vi.fn(),
}));

import { isTauri } from "../lib/tauri";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

const mockIsTauri = isTauri as ReturnType<typeof vi.fn>;
const mockGetCurrentWindow = getCurrentWindow as ReturnType<typeof vi.fn>;
const MockLogicalSize = LogicalSize as ReturnType<typeof vi.fn>;

function makeEl(height: number): HTMLElement {
  const el = document.createElement("div");
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ height } as DOMRect);
  return el;
}

describe("useWindowResize", () => {
  let mockSetSize: ReturnType<typeof vi.fn>;
  let observerCallback!: ResizeObserverCallback; // non-null assertion: always set by ResizeObserver mock before use
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafIdCounter: number;

  beforeEach(() => {
    mockSetSize = vi.fn().mockResolvedValue(undefined);
    mockGetCurrentWindow.mockReturnValue({ setSize: mockSetSize });
    mockIsTauri.mockReturnValue(true);

    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    rafCallbacks = new Map();
    rafIdCounter = 0;

    // Regular function required — arrow functions cannot be used as constructors with `new`
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(function (this: { observe: typeof mockObserve; disconnect: typeof mockDisconnect }, cb: ResizeObserverCallback) {
        observerCallback = cb;
        this.observe = mockObserve;
        this.disconnect = mockDisconnect;
      })
    );

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = ++rafIdCounter;
      rafCallbacks.set(id, cb);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id);
    });

    vi.stubGlobal("screen", { availHeight: 1000 });
  });

  afterEach(() => {
    vi.unstubAllGlobals(); // restore stubbed globals before restoring spies
    vi.restoreAllMocks();
  });

  function flushRAF() {
    // Snapshot before iterating — prevents issues if a callback schedules a new RAF
    const pending = new Map(rafCallbacks);
    rafCallbacks.clear();
    pending.forEach((cb) => cb(0));
  }

  test("shouldDoNothingWhenNotInTauri", () => {
    mockIsTauri.mockReturnValue(false);
    const ref = { current: makeEl(200) };
    renderHook(() => useWindowResize(ref));
    expect(mockSetSize).not.toHaveBeenCalled();
    expect(mockObserve).not.toHaveBeenCalled();
    // ResizeObserver constructor itself should not be called
    expect(ResizeObserver).not.toHaveBeenCalled();
  });

  test("shouldDoNothingWhenRefCurrentIsNull", () => {
    const ref = { current: null };
    renderHook(() => useWindowResize(ref));
    expect(mockSetSize).not.toHaveBeenCalled();
  });

  test("shouldCallSetSizeImmediatelyOnMountWithoutRAF", () => {
    const ref = { current: makeEl(500) };
    renderHook(() => useWindowResize(ref));
    // setSize called once immediately with correct dimensions — no RAF flush needed
    expect(mockSetSize).toHaveBeenCalledTimes(1);
    expect(MockLogicalSize).toHaveBeenCalledWith(380, 500);
    expect(rafCallbacks.size).toBe(0);
  });

  test("shouldUseDefaultWidth380", () => {
    const ref = { current: makeEl(300) };
    renderHook(() => useWindowResize(ref));
    expect(MockLogicalSize).toHaveBeenCalledWith(380, 300);
  });

  test("shouldUseCustomWidthWhenProvided", () => {
    const ref = { current: makeEl(300) };
    renderHook(() => useWindowResize(ref, 500));
    expect(MockLogicalSize).toHaveBeenCalledWith(500, 300);
  });

  test("shouldCapHeightAtScreenAvailHeight", () => {
    const ref = { current: makeEl(1500) };
    renderHook(() => useWindowResize(ref));
    // 1500 exceeds availHeight=1000, so capped to 1000
    expect(MockLogicalSize).toHaveBeenCalledWith(380, 1000);
  });

  test("shouldCeilFractionalHeight", () => {
    const ref = { current: makeEl(299.3) };
    renderHook(() => useWindowResize(ref));
    expect(MockLogicalSize).toHaveBeenCalledWith(380, 300);
  });

  test("shouldObserveElementWithResizeObserver", () => {
    const el = makeEl(100);
    const ref = { current: el };
    renderHook(() => useWindowResize(ref));
    expect(mockObserve).toHaveBeenCalledWith(el);
  });

  test("shouldApplyOnlyLastHeightAfterMultipleResizeCallbacks", () => {
    const ref = { current: makeEl(100) };
    renderHook(() => useWindowResize(ref));

    // Two rapid resize callbacks — RAF from first is cancelled by second
    observerCallback(
      [{ borderBoxSize: [{ blockSize: 200 }], contentRect: { height: 200 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );
    observerCallback(
      [{ borderBoxSize: [{ blockSize: 300 }], contentRect: { height: 300 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );

    // Only the immediate setSize has fired so far
    expect(mockSetSize).toHaveBeenCalledTimes(1);

    flushRAF();

    // After RAF: only the second callback's height (300) is applied
    expect(mockSetSize).toHaveBeenCalledTimes(2);
    expect(MockLogicalSize).toHaveBeenLastCalledWith(380, 300);
  });

  test("shouldUseBorderBoxSizeBlockSizeWhenAvailable", () => {
    const ref = { current: makeEl(100) };
    renderHook(() => useWindowResize(ref));

    observerCallback(
      [{ borderBoxSize: [{ blockSize: 400 }], contentRect: { height: 200 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );
    flushRAF();

    expect(MockLogicalSize).toHaveBeenLastCalledWith(380, 400);
  });

  test("shouldFallbackToContentRectHeightWhenBorderBoxSizeUnavailable", () => {
    const ref = { current: makeEl(100) };
    renderHook(() => useWindowResize(ref));

    observerCallback(
      [{ borderBoxSize: null, contentRect: { height: 350 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );
    flushRAF();

    expect(MockLogicalSize).toHaveBeenLastCalledWith(380, 350);
  });

  test("shouldDisconnectObserverOnUnmount", () => {
    const ref = { current: makeEl(100) };
    const { unmount } = renderHook(() => useWindowResize(ref));
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  test("shouldCancelPendingRAFOnUnmount", () => {
    const ref = { current: makeEl(100) };
    const { unmount } = renderHook(() => useWindowResize(ref));

    // Create a pending RAF
    observerCallback(
      [{ borderBoxSize: [{ blockSize: 500 }], contentRect: { height: 500 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );
    expect(rafCallbacks.size).toBe(1);

    unmount();

    // Cleanup should have cancelled the RAF
    expect(rafCallbacks.size).toBe(0);
    // Flushing now yields no additional setSize calls
    flushRAF();
    expect(mockSetSize).toHaveBeenCalledTimes(1); // only the initial immediate call
  });

  test("shouldReapplySizeWithNewWidthOnWidthChange", () => {
    const el = makeEl(200);
    const ref = { current: el };
    const { rerender } = renderHook(({ w }) => useWindowResize(ref, w), {
      initialProps: { w: 380 },
    });

    expect(MockLogicalSize).toHaveBeenCalledWith(380, 200);

    rerender({ w: 500 });

    // Previous observer disconnected and new one created+observed
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockObserve).toHaveBeenCalledTimes(2); // initial mount + after width change
    expect(MockLogicalSize).toHaveBeenCalledWith(500, 200);
  });

  test("shouldFallbackToContentRectHeightWhenBorderBoxSizeIsEmptyArray", () => {
    // borderBoxSize=[] → [0] is undefined → ?? falls back to contentRect.height
    const ref = { current: makeEl(100) };
    renderHook(() => useWindowResize(ref));

    observerCallback(
      [{ borderBoxSize: [], contentRect: { height: 275 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );
    flushRAF();

    expect(MockLogicalSize).toHaveBeenLastCalledWith(380, 275);
  });

  test("shouldCapToAvailHeightWhenCeilPushesHeightOverLimit", () => {
    // h=999.4: Math.ceil(999.4)=1000, which exceeds availHeight=999 → capped to 999
    // Tests the ceil+min interaction at the exact boundary where ceil causes overflow
    vi.stubGlobal("screen", { availHeight: 999 });
    const ref = { current: makeEl(999.4) };
    renderHook(() => useWindowResize(ref));

    expect(MockLogicalSize).toHaveBeenCalledWith(380, 999);
  });

  test("shouldUseLastEntryWhenMultipleEntriesInSingleCallback", () => {
    // ResizeObserver can batch multiple entries; code uses entries[entries.length - 1]
    const ref = { current: makeEl(100) };
    renderHook(() => useWindowResize(ref));

    observerCallback(
      [
        { borderBoxSize: [{ blockSize: 200 }], contentRect: { height: 200 } } as unknown as ResizeObserverEntry,
        { borderBoxSize: [{ blockSize: 450 }], contentRect: { height: 450 } } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver
    );
    flushRAF();

    // Exactly 2 calls: 1 immediate on mount + 1 from RAF (not 3 — only last entry is applied)
    expect(mockSetSize).toHaveBeenCalledTimes(2);
    expect(MockLogicalSize).toHaveBeenLastCalledWith(380, 450);
  });

  test("shouldTreatBlockSizeZeroAsValidHeightNotFallbackToContentRect", () => {
    // ?? only falls back on null/undefined — blockSize=0 is a valid value and must NOT
    // trigger the contentRect fallback
    const ref = { current: makeEl(100) };
    renderHook(() => useWindowResize(ref));

    observerCallback(
      [{ borderBoxSize: [{ blockSize: 0 }], contentRect: { height: 300 } } as unknown as ResizeObserverEntry],
      {} as ResizeObserver
    );
    flushRAF();

    expect(MockLogicalSize).toHaveBeenLastCalledWith(380, 0);
  });
});
