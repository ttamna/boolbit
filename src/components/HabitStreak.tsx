// ABOUTME: HabitStreak component - displays habit grid with streak counts and icons
// ABOUTME: Click ✓ to check habit for today (auto-increments streak); edit mode enables add/delete

import { useState, useEffect, CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { useEditMode } from "../hooks/useEditMode";

const mono: CSSProperties = { fontFamily: fonts.mono };

const getToday = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date

interface HabitStreakProps {
  habits: Habit[];
  onUpdate?: (i: number, patch: Partial<Habit>) => void;
  onHabitsChange?: (habits: Habit[]) => void;
}

export function HabitStreak({ habits, onUpdate, onHabitsChange }: HabitStreakProps) {
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
    onHabitsChange?.([...habits, { name: trimmed, streak: 0, icon: newIcon || "⭐" }]);
    setNewName("");
    setNewIcon("⭐");
  };

  const patchHabit = (i: number, patch: Partial<Habit>) =>
    onHabitsChange?.(habits.map((h, j) => j === i ? { ...h, ...patch } : h));

  const checkHabit = (i: number) => {
    const h = habits[i];
    if (h.lastChecked === todayStr) return; // already checked today
    onUpdate?.(i, { streak: h.streak + 1, lastChecked: todayStr });
  };

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {habits.map((h, i) => (
          <div key={h.icon + h.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
                  color: h.streak >= 10 ? colors.statusActive : h.streak >= 5 ? colors.statusProgress : colors.textMid,
                }}
                inputStyle={{ ...mono, fontSize: fontSizes.base, width: 36, textAlign: "right" }}
              />
              <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost }}>일</span>
            </span>
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
        ))}

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
          return (
            <div
              key={h.icon + h.name}
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
                    color: h.streak >= 10 ? colors.statusActive : h.streak >= 5 ? colors.statusProgress : colors.textMid,
                  }}
                  inputStyle={{ ...mono, fontSize: fontSizes.base, width: 36, textAlign: "right" }}
                />
                <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost }}>일</span>
              </span>
              {/* Daily check-in button */}
              <button
                onClick={() => checkHabit(i)}
                title={doneToday ? "오늘 완료됨" : "오늘 완료 체크"}
                style={{
                  background: "transparent", border: "none", cursor: doneToday ? "default" : "pointer",
                  color: doneToday ? colors.statusActive : colors.textPhantom,
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
