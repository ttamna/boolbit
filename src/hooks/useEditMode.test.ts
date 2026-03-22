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
});
