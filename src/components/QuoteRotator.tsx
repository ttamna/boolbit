// ABOUTME: QuoteRotator component - cycles through motivational quotes with fade transition
// ABOUTME: Supports inline add, edit, delete, reorder (↑↓), rotation interval (5/8/15/30s), and prev/next navigation via ‹/› buttons

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { useEditMode } from "../hooks/useEditMode";

const navBtnStyle: CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  color: colors.textPhantom, fontSize: fontSizes.mini,
  padding: "0 2px", lineHeight: 1,
};

// Reorder button style — disabled state uses textLabel, enabled uses textSubtle
const moveBtnStyle = (disabled: boolean): CSSProperties => ({
  background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
  color: disabled ? colors.textLabel : colors.textSubtle,
  fontSize: fontSizes.mini, padding: "1px 2px", lineHeight: 1,
});

const INTERVAL_PRESETS = [5, 8, 15, 30] as const;
const DEFAULT_INTERVAL = 8; // seconds

interface QuoteRotatorProps {
  quotes: string[];
  onUpdate: (quotes: string[]) => void;
  rotationInterval?: number;          // auto-rotation interval in seconds (default 8)
  onIntervalChange?: (secs: number) => void;
  accent?: string;
}

export function QuoteRotator({ quotes, onUpdate, rotationInterval, onIntervalChange, accent }: QuoteRotatorProps) {
  const borderColor = accent ? `${accent}40` : colors.borderAccent;
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [newDraft, setNewDraft] = useState("");
  // timerKey: increment to restart the auto-rotation interval after manual navigation
  const [timerKey, setTimerKey] = useState(0);
  // customIntervalMode: true while user is typing a custom interval value
  const [customIntervalMode, setCustomIntervalMode] = useState(false);
  const [customIntervalValue, setCustomIntervalValue] = useState("");
  // escapedIntervalRef: true when Escape was pressed — prevents blur from committing the cancelled value
  const escapedIntervalRef = useRef(false);
  // editKeysRef: stable React keys per quote during edit mode — prevents InlineEdit state loss on reorder
  const editKeysRef = useRef<string[]>([]);

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

  // Assign stable UUIDs per quote on edit entry so reorder doesn't remount InlineEdits
  const openEditingWithKeys = () => {
    editKeysRef.current = quotes.map(() => crypto.randomUUID());
    setCustomIntervalMode(false);
    cancelPendingFades();
    openEditing();
  };

  const commitCustomInterval = () => {
    // Guard: keydown (Escape) sets escapedIntervalRef before React schedules re-render,
    // so blur fires while escapedIntervalRef is true — skip commit to honour cancellation.
    if (escapedIntervalRef.current) { escapedIntervalRef.current = false; return; }
    const parsed = parseInt(customIntervalValue, 10);
    const secs = Math.max(1, Math.min(3600, isNaN(parsed) ? (rotationInterval ?? DEFAULT_INTERVAL) : parsed));
    onIntervalChange?.(secs);
    setCustomIntervalMode(false);
  };

  const intervalMs = (rotationInterval ?? DEFAULT_INTERVAL) * 1000;

  useEffect(() => {
    if (editing || quotes.length === 0) return;
    const id = setInterval(() => {
      setOpacity(0);
      autoFadeTimeoutRef.current = setTimeout(() => {
        setIdx(prev => (prev + 1) % quotesLengthRef.current);
        setOpacity(1);
        autoFadeTimeoutRef.current = null;
      }, 600);
    }, intervalMs);
    return () => {
      clearInterval(id);
      if (autoFadeTimeoutRef.current) {
        clearTimeout(autoFadeTimeoutRef.current);
        autoFadeTimeoutRef.current = null;
      }
    };
  }, [quotes.length, editing, timerKey, intervalMs]);

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

  const moveQuote = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= quotes.length) return;
    const next = [...quotes];
    [next[from], next[to]] = [next[to], next[from]];
    // Swap stable edit keys to match new order
    const keys = editKeysRef.current;
    [keys[from], keys[to]] = [keys[to], keys[from]];
    onUpdate(next);
    // Adjust idx so the same quote stays visible after editing exits
    if (from === safeIdx) setIdx(to);
    else if (to === safeIdx) setIdx(from);
  };

  const addQuote = () => {
    const trimmed = newDraft.trim();
    if (!trimmed) return;
    onUpdate([...quotes, trimmed]);
    editKeysRef.current.push(crypto.randomUUID());
    setNewDraft("");
  };

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${borderColor}`, paddingLeft: 12 }}>
        {quotes.map((q, i) => (
          <div key={editKeysRef.current[i] ?? String(i)} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <button onClick={() => moveQuote(i, -1)} disabled={i === 0} title="위로 이동" style={moveBtnStyle(i === 0)}>↑</button>
              <button onClick={() => moveQuote(i, 1)} disabled={i === quotes.length - 1} title="아래로 이동" style={moveBtnStyle(i === quotes.length - 1)}>↓</button>
            </div>
            <InlineEdit
              value={q}
              onSave={val => onUpdate(quotes.map((x, j) => j === i ? val : x))}
              style={{ fontSize: fontSizes.sm, color: colors.textDim, fontStyle: "italic", flex: 1 }}
            />
            <button
              onClick={() => {
                onUpdate(quotes.filter((_, j) => j !== i));
                editKeysRef.current.splice(i, 1);
                // Keep the same quote visible after editing exits:
                // deleted item before display position → shift idx left; deleted the current item → retreat one
                if (i < safeIdx) setIdx(safeIdx - 1);
                else if (i === safeIdx) setIdx(Math.max(0, safeIdx - 1));
              }}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textSubtle, fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Rotation interval presets */}
        {onIntervalChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0 }}>전환</span>
            {INTERVAL_PRESETS.map(s => {
              const active = !customIntervalMode && (rotationInterval ?? DEFAULT_INTERVAL) === s;
              return (
                <button
                  key={s}
                  onClick={() => { onIntervalChange(s); setCustomIntervalMode(false); }}
                  style={{
                    padding: "1px 5px", borderRadius: 3,
                    background: "transparent",
                    border: `1px solid ${active ? colors.borderAccent : colors.borderFaint}`,
                    color: active ? colors.textDim : colors.textPhantom,
                    fontSize: fontSizes.mini, cursor: "pointer",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {s}s
                </button>
              );
            })}
            {customIntervalMode ? (
              <input
                type="number"
                value={customIntervalValue}
                min={1}
                max={3600}
                onChange={e => setCustomIntervalValue(e.target.value)}
                onBlur={commitCustomInterval}
                onKeyDown={e => {
                  if (e.key === "Enter") commitCustomInterval();
                  if (e.key === "Escape") { escapedIntervalRef.current = true; setCustomIntervalMode(false); }
                }}
                autoFocus
                style={{
                  width: 44, padding: "1px 4px", borderRadius: 3,
                  background: "transparent",
                  border: `1px solid ${colors.borderAccent}`,
                  color: colors.textDim,
                  fontSize: fontSizes.mini,
                  fontFamily: "inherit", textAlign: "center",
                  outline: "none",
                }}
              />
            ) : (
              <button
                onClick={() => { setCustomIntervalMode(true); setCustomIntervalValue(String(rotationInterval ?? DEFAULT_INTERVAL)); }}
                style={{
                  padding: "1px 5px", borderRadius: 3,
                  background: "transparent",
                  border: `1px solid ${colors.borderFaint}`,
                  color: colors.textPhantom,
                  fontSize: fontSizes.mini, cursor: "pointer",
                }}
              >
                직접
              </button>
            )}
          </div>
        )}

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
      borderLeft: `2px solid ${borderColor}`, paddingLeft: 12,
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
        <button onClick={openEditingWithKeys} title="인용구 편집" style={navBtnStyle}>✏</button>
      </div>
    </div>
  );
}
