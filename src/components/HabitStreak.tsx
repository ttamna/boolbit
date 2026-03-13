// ABOUTME: HabitStreak component - displays habit grid with streak counts and icons
// ABOUTME: Click ✓ to check/uncheck today (toggles streak +1/-1); edit mode enables add/delete/reorder

import { useState, useEffect, CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { useEditMode } from "../hooks/useEditMode";

const mono: CSSProperties = { fontFamily: fonts.mono };

// Reorder button style — disabled state uses textLabel, enabled uses textSubtle
const moveBtnStyle = (disabled: boolean): CSSProperties => ({
  background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
  color: disabled ? colors.textLabel : colors.textSubtle,
  fontSize: fontSizes.mini, padding: "1px 2px", lineHeight: 1,
});

const getToday = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date

// Returns milestone badge emoji for notable streak lengths; null otherwise
function getMilestone(streak: number): string | null {
  if (streak >= 100) return "💎";
  if (streak >= 30)  return "⭐";
  if (streak >= 7)   return "🔥";
  return null;
}

// Returns next unreached milestone if within threshold days away; null otherwise.
// Note: a non-null result can coexist with a non-null getMilestone result (e.g. streak=27
// has milestone 🔥 and upcoming ⭐ in 3 days). Callers must decide which to display.
function getUpcomingMilestone(streak: number, threshold = 3): { days: number; badge: string } | null {
  if (streak <= 0) return null;
  const MILESTONES = [
    { at: 7, badge: "🔥" },
    { at: 30, badge: "⭐" },
    { at: 100, badge: "💎" },
  ];
  for (const { at, badge } of MILESTONES) {
    const days = at - streak;
    if (days > 0 && days <= threshold) return { days, badge };
  }
  return null;
}

interface HabitStreakProps {
  habits: Habit[];
  onUpdate?: (i: number, patch: Partial<Habit>) => void;
  onHabitsChange?: (habits: Habit[]) => void;
  accent?: string;
}

export function HabitStreak({ habits, onUpdate, onHabitsChange, accent }: HabitStreakProps) {
  const [newIcon, setNewIcon] = useState("⭐");
  const [newName, setNewName] = useState("");
  const { editing, openEditing, closeEditing } = useEditMode();
  // Refresh todayStr every minute so the ✓ button state updates correctly around midnight
  const [todayStr, setTodayStr] = useState(getToday);
  useEffect(() => {
    const id = setInterval(() => setTodayStr(getToday()), 60_000);
    return () => clearInterval(id);
  }, []);

  const addHabit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onHabitsChange?.([...habits, { id: crypto.randomUUID(), name: trimmed, streak: 0, icon: newIcon || "⭐" }]);
    setNewName("");
    setNewIcon("⭐");
  };

  const patchHabit = (i: number, patch: Partial<Habit>) =>
    onHabitsChange?.(habits.map((h, j) => j === i ? { ...h, ...patch } : h));

  const moveHabit = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= habits.length) return;
    const next = [...habits];
    [next[from], next[to]] = [next[to], next[from]];
    onHabitsChange?.(next);
  };

  const checkHabit = (i: number) => {
    const h = habits[i];
    if (h.lastChecked === todayStr) {
      // Undo today's check-in: decrement streak and clear lastChecked.
      // `lastChecked: undefined` is intentional — JSON.stringify omits undefined keys,
      // so Tauri receives no `lastChecked` field, Rust's #[serde(default)] yields None.
      // This mirrors the existing streak-expiry reset pattern in App.tsx.
      onUpdate?.(i, { streak: Math.max(0, h.streak - 1), lastChecked: undefined });
    } else {
      onUpdate?.(i, { streak: h.streak + 1, lastChecked: todayStr });
    }
  };

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {habits.map((h, i) => {
          const milestone = getMilestone(h.streak);
          const upcoming = getUpcomingMilestone(h.streak);
          return (
          <div key={h.id ?? `h-${i}`} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <button onClick={() => moveHabit(i, -1)} disabled={i === 0} title="위로 이동" style={moveBtnStyle(i === 0)}>↑</button>
              <button onClick={() => moveHabit(i, 1)} disabled={i === habits.length - 1} title="아래로 이동" style={moveBtnStyle(i === habits.length - 1)}>↓</button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <InlineEdit
                value={h.icon}
                onSave={icon => patchHabit(i, { icon })}
                style={{ fontSize: fontSizes.lg }}
                inputStyle={{ fontSize: fontSizes.lg, width: 36, textAlign: "center" }}
              />
              <span style={{ flex: 1, minWidth: 0, fontSize: fontSizes.sm, color: colors.textLow }}>
                <InlineEdit
                  value={h.name}
                  onSave={name => patchHabit(i, { name })}
                  style={{ color: colors.textLow }}
                />
              </span>
              <span style={{ ...mono, display: "flex", alignItems: "baseline", gap: 2 }}>
                <InlineEdit
                  value={String(h.streak)}
                  onSave={v => {
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 0) patchHabit(i, { streak: n });
                  }}
                  style={{
                    fontSize: fontSizes.base, fontWeight: 700,
                    color: h.streak >= 10 ? (accent ?? colors.statusActive) : h.streak >= 5 ? colors.statusProgress : colors.textMid,
                  }}
                  inputStyle={{ ...mono, fontSize: fontSizes.base, width: 36, textAlign: "right" }}
                />
                <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost }}>일</span>
              </span>
              {milestone ? (
                <span
                  title={h.streak >= 100 ? "💎 100일 달성!" : h.streak >= 30 ? "⭐ 30일 달성!" : "🔥 7일 달성!"}
                  style={{ fontSize: fontSizes.mini, lineHeight: 1 }}
                >
                  {milestone}
                </span>
              ) : upcoming ? (
                <span
                  title={`${upcoming.days}일 더 하면 ${upcoming.badge} 달성!`}
                  style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom }}
                >
                  +{upcoming.days}{upcoming.badge}
                </span>
              ) : null}
              <button
                onClick={() => onHabitsChange?.(habits.filter((_, j) => j !== i))}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: colors.textSubtle, fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>
          );
        })}

        {/* Add new habit */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <input
            value={newIcon}
            onChange={e => setNewIcon(e.target.value)}
            placeholder="⭐"
            style={{
              width: 36,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 4, color: colors.textDim,
              fontSize: fontSizes.lg, outline: "none",
              padding: "2px 4px", textAlign: "center",
            }}
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
            placeholder="새 습관 추가..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 4, color: colors.textDim,
              fontSize: fontSizes.sm, outline: "none",
              padding: "2px 6px",
            }}
          />
          <button
            onClick={addHabit}
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
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
        {habits.map((h, i) => {
          const doneToday = h.lastChecked === todayStr;
          const milestone = getMilestone(h.streak);
          const upcoming = getUpcomingMilestone(h.streak);
          return (
            <div
              key={h.id ?? `h-${i}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
            >
              <InlineEdit
                value={h.icon}
                onSave={icon => onUpdate?.(i, { icon })}
                style={{ fontSize: fontSizes.lg }}
                inputStyle={{ fontSize: fontSizes.lg, width: 36, textAlign: "center" }}
              />
              <span style={{ fontSize: fontSizes.sm, color: colors.textLow, flex: 1, minWidth: 0 }}>
                <InlineEdit
                  value={h.name}
                  onSave={name => onUpdate?.(i, { name })}
                  style={{ color: colors.textLow }}
                />
              </span>
              <span style={{ ...mono, display: "flex", alignItems: "baseline", gap: 2 }}>
                <InlineEdit
                  value={String(h.streak)}
                  onSave={v => {
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 0) onUpdate?.(i, { streak: n });
                  }}
                  style={{
                    fontSize: fontSizes.base, fontWeight: 700,
                    color: h.streak >= 10 ? (accent ?? colors.statusActive) : h.streak >= 5 ? colors.statusProgress : colors.textMid,
                  }}
                  inputStyle={{ ...mono, fontSize: fontSizes.base, width: 36, textAlign: "right" }}
                />
                <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost }}>일</span>
              </span>
              {milestone ? (
                <span
                  title={h.streak >= 100 ? "💎 100일 달성!" : h.streak >= 30 ? "⭐ 30일 달성!" : "🔥 7일 달성!"}
                  style={{ fontSize: fontSizes.mini, lineHeight: 1 }}
                >
                  {milestone}
                </span>
              ) : upcoming ? (
                <span
                  title={`${upcoming.days}일 더 하면 ${upcoming.badge} 달성!`}
                  style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom }}
                >
                  +{upcoming.days}{upcoming.badge}
                </span>
              ) : null}
              {/* Daily check-in button — click to check, click again to undo */}
              <button
                onClick={() => checkHabit(i)}
                title={doneToday ? "오늘 완료됨 — 클릭하여 취소" : "오늘 완료 체크"}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: doneToday ? (accent ?? colors.statusActive) : colors.textPhantom,
                  fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
                  transition: "color 0.2s",
                }}
              >
                ✓
              </button>
            </div>
          );
        })}
      </div>
      {onHabitsChange && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button
            onClick={openEditing}
            title="습관 추가/삭제"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: colors.textPhantom, fontSize: fontSizes.mini,
              padding: "0 2px", lineHeight: 1,
            }}
          >
            ✏
          </button>
        </div>
      )}
    </div>
  );
}
