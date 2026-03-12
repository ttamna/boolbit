// ABOUTME: QuoteRotator component - cycles through motivational quotes with fade transition
// ABOUTME: Supports inline add, edit, and delete of quotes via toggle edit mode

import { useState, useEffect, useRef, useCallback } from "react";
import { fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";

interface QuoteRotatorProps {
  quotes: string[];
  onUpdate: (quotes: string[]) => void;
}

export function QuoteRotator({ quotes, onUpdate }: QuoteRotatorProps) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [editing, setEditing] = useState(false);
  const [newDraft, setNewDraft] = useState("");

  // Keep a ref to always have fresh quotes.length inside setTimeout callbacks
  const quotesLengthRef = useRef(quotes.length);
  useEffect(() => { quotesLengthRef.current = quotes.length; }, [quotes.length]);

  useEffect(() => {
    if (editing || quotes.length === 0) return;
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIdx(prev => (prev + 1) % quotesLengthRef.current);
        setOpacity(1);
      }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, [quotes.length, editing]);

  const safeIdx = quotes.length > 0 ? idx % quotes.length : 0;

  const addQuote = () => {
    const trimmed = newDraft.trim();
    if (!trimmed) return;
    onUpdate([...quotes, trimmed]);
    setNewDraft("");
  };

  const closeEditing = useCallback(() => {
    setEditing(false);
    setOpacity(1); // Prevent opacity stuck at 0 if fade was mid-way
  }, []);

  useEffect(() => {
    if (!editing) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeEditing(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editing, closeEditing]);

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {quotes.map((q, i) => (
          <div key={q} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <InlineEdit
              value={q}
              onSave={val => onUpdate(quotes.map((x, j) => j === i ? val : x))}
              style={{ fontSize: fontSizes.sm, color: colors.textDim, fontStyle: "italic", flex: 1 }}
            />
            <button
              onClick={() => onUpdate(quotes.filter((_, j) => j !== i))}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textSubtle, fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add new quote */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <input
            value={newDraft}
            onChange={e => setNewDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addQuote(); }}
            placeholder="새 인용구 추가..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 4,
              color: colors.textDim,
              fontSize: fontSizes.sm,
              fontStyle: "italic",
              outline: "none",
              padding: "2px 6px",
            }}
          />
          <button
            onClick={addQuote}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: colors.textMid, fontSize: fontSizes.base, padding: "0 2px", lineHeight: 1,
            }}
          >
            +
          </button>
        </div>

        {/* Done */}
        <button
          onClick={closeEditing}
          style={{
            marginTop: 8, background: "transparent",
            border: `1px solid ${colors.borderFaint}`,
            borderRadius: 4, cursor: "pointer",
            color: colors.textSubtle, fontSize: fontSizes.xs, padding: "2px 8px",
          }}
        >
          완료
        </button>
      </div>
    );
  }

  return (
    <div style={{
      fontSize: fontSizes.sm, color: colors.textDim, fontStyle: "italic", lineHeight: 1.6,
      minHeight: 36, display: "flex", alignItems: "center",
      borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12,
    }}>
      <div style={{ opacity, transition: "opacity 0.6s ease", flex: 1 }}>
        {quotes[safeIdx] ?? "—"}
      </div>
      <button
        onClick={() => setEditing(true)}
        title="인용구 편집"
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: colors.textPhantom, fontSize: fontSizes.mini,
          padding: "0 2px", lineHeight: 1, marginLeft: 8,
        }}
      >
        ✏
      </button>
    </div>
  );
}
