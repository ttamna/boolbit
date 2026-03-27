// ABOUTME: Tests for useEditMode hook — editing toggle with ESC-to-close shortcut
// ABOUTME: Covers initial state, openEditing/closeEditing, ESC handler, onClose callback, and ref-based callback freshness

import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { useEditMode } from "./useEditMode";

describe('useEditMode', () => {
  test('shouldReturnFalseEditingInitially', () => {
    const { result } = renderHook(() => useEditMode());
    expect(result.current.editing).toBe(false);
  });

  test('shouldSetEditingTrueWhenOpenEditingCalled', () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.openEditing());
    expect(result.current.editing).toBe(true);
  });

  test('shouldSetEditingFalseWhenCloseEditingCalled', () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.openEditing());
    act(() => result.current.closeEditing());
    expect(result.current.editing).toBe(false);
  });

  test('shouldCallOnCloseCallbackWhenCloseEditingCalled', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    act(() => result.current.openEditing());
    act(() => result.current.closeEditing());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shouldNotCallOnCloseWhenOpenEditingCalled', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    act(() => result.current.openEditing());
    expect(onClose).not.toHaveBeenCalled();
  });

  test('shouldCloseEditingOnEscapeKeyWhenEditing', () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.openEditing());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(result.current.editing).toBe(false);
  });

  test('shouldNotCloseEditingOnOtherKeysWhenEditing', () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.openEditing());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(result.current.editing).toBe(true);
  });

  test('shouldNotTriggerOnCloseWhenNotEditingAndEscPressed', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.editing).toBe(false);
  });

  test('shouldCallOnCloseCallbackOnEscapeKeyWhenEditing', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    act(() => result.current.openEditing());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shouldUseLatestOnCloseCallbackAfterRerender', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();
    let onClose = onClose1;
    const { result, rerender } = renderHook(() => useEditMode(onClose));
    act(() => result.current.openEditing());
    // Swap to a new callback and rerender
    onClose = onClose2;
    rerender();
    act(() => result.current.closeEditing());
    expect(onClose1).not.toHaveBeenCalled();
    expect(onClose2).toHaveBeenCalledTimes(1);
  });

  test('shouldRemoveEscListenerAfterClose', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    act(() => result.current.openEditing());
    act(() => result.current.closeEditing());
    // ESC after already closed — onClose should NOT be called again
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Unmount while editing — ESC listener must be removed to avoid memory leaks
  test('shouldRemoveEscListenerOnUnmount', () => {
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() => useEditMode(onClose));
    act(() => result.current.openEditing());
    unmount();
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    // onClose was NOT called (ESC fired after unmount, listener already removed)
    expect(onClose).not.toHaveBeenCalled();
  });

  // closeEditing has no editing-state guard — it always calls onClose unconditionally
  test('shouldCallOnCloseEvenWhenCloseEditingCalledWhileNotEditing', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    // Never opened — still calls onClose
    act(() => result.current.closeEditing());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // openEditing and closeEditing references must be stable (useCallback) across rerenders
  test('shouldReturnStableOpenAndCloseEditingReferencesAcrossRerenders', () => {
    const { result, rerender } = renderHook(() => useEditMode());
    const open1 = result.current.openEditing;
    const close1 = result.current.closeEditing;
    rerender();
    expect(result.current.openEditing).toBe(open1);
    expect(result.current.closeEditing).toBe(close1);
  });

  // Rapid open/close cycles must not accumulate ESC listeners — verified while editing=true
  test('shouldNotAccumulateEscListenersAfterRapidOpenCloseCycles', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useEditMode(onClose));
    // Two complete open/close cycles, then leave editing=true for the ESC test
    act(() => result.current.openEditing());
    act(() => result.current.closeEditing());
    act(() => result.current.openEditing());
    act(() => result.current.closeEditing());
    act(() => result.current.openEditing()); // leave editing=true — listener active
    // ESC fires once; if listeners accumulated, onClose would be called >1 times
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    // 2 explicit closeEditing calls + 1 ESC-triggered close = 3 total
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
