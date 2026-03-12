// ABOUTME: useEditMode hook - shared editing state with ESC key close
// ABOUTME: Returns { editing, openEditing, closeEditing }; accepts optional onClose callback

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Manages an editing toggle with ESC-to-close keyboard shortcut.
 * onClose runs before setting editing=false (use it for cleanup like resetting drafts).
 */
export function useEditMode(onClose?: () => void): {
  editing: boolean;
  openEditing: () => void;
  closeEditing: () => void;
} {
  const [editing, setEditing] = useState(false);
  // Assign during render (not useEffect) to avoid a stale window before commit
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeEditing = useCallback(() => {
    onCloseRef.current?.();
    setEditing(false);
  }, []);

  const openEditing = useCallback(() => setEditing(true), []);

  useEffect(() => {
    if (!editing) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeEditing(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editing, closeEditing]);

  return { editing, openEditing, closeEditing };
}
