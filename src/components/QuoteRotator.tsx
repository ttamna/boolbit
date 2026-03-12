// ABOUTME: QuoteRotator component - cycles through motivational quotes with fade transition
// ABOUTME: Supports inline add, edit, and delete of quotes; manual prev/next navigation via ‹/› buttons

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { useEditMode } from "../hooks/useEditMode";

const navBtnStyle: CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  color: colors.textPhantom, fontSize: fontSizes.mini,
  padding: "0 2px", lineHeight: 1,
};

interface QuoteRotatorProps {
  quotes: string[];
  onUpdate: (quotes: string[]) => void;
}

export function QuoteRotator({ quotes, onUpdate }: QuoteRotatorProps) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [newDraft, setNewDraft] = useState("");
  // timerKey: increment to restart the auto-rotation interval after manual navigation
  const [timerKey, setTimerKey] = useState(0);

  // Keep a ref to always have fresh quotes.length inside setTimeout callbacks
  const quotesLengthRef = useRef(quotes.length);
  useEffect(() => { quotesLengthRef.current = quotes.length; }, [quotes.length]);

  // Track pending timeouts to cancel on unmount, double-click, or edit-mode entry
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cleanup both timeouts on unmount to avoid state updates on an unmounted component
  useEffect(() => () => {
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    if (autoFadeTimeoutRef.current) clearTimeout(autoFadeTimeoutRef.current);
  }, []);

  // Cancel all pending fade timeouts — stable (only refs + stable setter), safe as useCallback dep
  const cancelPendingFades = useCallback(() => {
    if (navTimeoutRef.current) { clearTimeout(navTimeoutRef.current); navTimeoutRef.current = null; }
    if (autoFadeTimeoutRef.current) { clearTimeout(autoFadeTimeoutRef.current); autoFadeTimeoutRef.current = null; }
    setOpacity(1);
  }, []);

  const { editing, openEditing, closeEditing } = useEditMode();

  useEffect(() => {
    if (editing || quotes.length === 0) return;
    const interval = setInterval(() => {
      setOpacity(0);
      autoFadeTimeoutRef.current = setTimeout(() => {
        setIdx(prev => (prev + 1) % quotesLengthRef.current);
        setOpacity(1);
        autoFadeTimeoutRef.current = null;
      }, 600);
    }, 8000);
    return () => {
      clearInterval(interval);
      if (autoFadeTimeoutRef.current) {
        clearTimeout(autoFadeTimeoutRef.current);
        autoFadeTimeoutRef.current = null;
      }
    };
  }, [quotes.length, editing, timerKey]);

  const navigate = (dir: 1 | -1) => {
    if (quotes.length <= 1) return;
    cancelPendingFades();
    setOpacity(0);
    // After fade-out: update idx, restore opacity, and restart auto-rotation.
    // React 18 automatic batching groups all three state updates into one render.
    navTimeoutRef.current = setTimeout(() => {
      const len = quotesLengthRef.current;
      if (len === 0) { navTimeoutRef.current = null; return; } // all quotes deleted during fade
      setIdx(prev => (prev + dir + len) % len);
      setOpacity(1);
      setTimerKey(k => k + 1);
      navTimeoutRef.current = null;
    }, 300);
  };

  const safeIdx = quotes.length > 0 ? idx % quotes.length : 0;

  const addQuote = () => {
    const trimmed = newDraft.trim();
    if (!trimmed) return;
    onUpdate([...quotes, trimmed]);
    setNewDraft("");
  };

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {quotes.map((q, i) => (
          <div key={q + '-' + i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
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
              background: colors.surfaceFaint,
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
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 6, flexShrink: 0 }}>
        {quotes.length > 1 && (
          <button onClick={() => navigate(-1)} title="이전 인용구" style={navBtnStyle}>‹</button>
        )}
        {quotes.length > 1 && (
          <button onClick={() => navigate(1)} title="다음 인용구" style={navBtnStyle}>›</button>
        )}
        <button onClick={() => { cancelPendingFades(); openEditing(); }} title="인용구 편집" style={navBtnStyle}>✏</button>
      </div>
    </div>
  );
}
