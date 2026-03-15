// ABOUTME: InlineEdit component - click-to-edit text field with blur/Enter to save
// ABOUTME: multiline=true uses textarea with auto-resize; Ctrl/Cmd+Enter or blur saves, Enter inserts newline

import { useState, useRef, useEffect, CSSProperties } from "react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  multiline?: boolean; // when true: textarea with auto-resize; Enter = newline, Ctrl+Enter = save
}

// Returns the value to save, or null if the draft should be discarded (no change or invalid).
// multiline: trimEnd only — empty string is a valid save (field cleared; commit() forwards to onSave).
// single-line: trim both ends — empty string is NOT saved (clearing is disallowed).
export function resolveCommit(draft: string, original: string, multiline: boolean): string | null {
  if (multiline) {
    const cleaned = draft.trimEnd();
    return cleaned !== original ? cleaned : null;
  } else {
    const trimmed = draft.trim();
    return trimmed && trimmed !== original ? trimmed : null;
  }
}

// Shrink to 0 then expand to scrollHeight so textarea fits its content exactly
function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0";
  el.style.height = el.scrollHeight + "px";
}

export function InlineEdit({ value, onSave, placeholder, style, inputStyle, multiline }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    if (multiline) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        // Place cursor at end (focus() alone is browser-dependent on cursor position)
        el.setSelectionRange(el.value.length, el.value.length);
        autoResize(el);
      }
    } else {
      inputRef.current?.select();
    }
  }, [editing, multiline]);

  // Auto-resize whenever draft changes while editing
  useEffect(() => {
    if (editing && multiline) autoResize(textareaRef.current);
  }, [draft, editing, multiline]);

  // Sync external value changes when not editing
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const newValue = resolveCommit(draft, value, multiline ?? false);
    if (newValue !== null) onSave(newValue);
    else setDraft(value);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.stopPropagation(); cancel(); }
          }}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 4,
            color: "rgba(255,255,255,0.88)",
            font: "inherit",
            outline: "none",
            padding: "1px 4px",
            width: "100%",
            resize: "none",
            overflow: "hidden",
            lineHeight: "inherit",
            ...inputStyle,
          }}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { e.stopPropagation(); cancel(); }
        }}
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.35)",
          borderRadius: 4,
          color: "rgba(255,255,255,0.88)",
          font: "inherit",
          outline: "none",
          padding: "1px 4px",
          width: "100%",
          ...inputStyle,
        }}
      />
    );
  }

  const isEmpty = value === "";
  return (
    <span
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
      style={{
        cursor: "text",
        ...(multiline ? { whiteSpace: "pre-wrap", display: "block" } : {}),
        ...style,
        // Placeholder overrides parent color to ensure visibility
        ...(isEmpty && placeholder ? { color: "rgba(255,255,255,0.3)" } : {}),
      }}
    >
      {isEmpty && placeholder ? placeholder : value}
    </span>
  );
}
