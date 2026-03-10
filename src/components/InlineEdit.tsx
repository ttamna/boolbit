// ABOUTME: InlineEdit component - click-to-edit text field with blur/Enter to save
// ABOUTME: Shows plain text by default; switches to input on click, saves on blur or Enter

import { useState, useRef, useEffect, CSSProperties } from "react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
}

export function InlineEdit({ value, onSave, style, inputStyle }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Sync external value changes when not editing
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 4,
          color: "inherit",
          font: "inherit",
          outline: "none",
          padding: "1px 4px",
          width: "100%",
          ...inputStyle,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
      style={{ cursor: "text", ...style }}
    >
      {value}
    </span>
  );
}
