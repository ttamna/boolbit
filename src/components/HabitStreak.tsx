// ABOUTME: HabitStreak component - displays habit grid with streak counts
// ABOUTME: Click streak number to increment; click habit name to rename

import { CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";

const mono: CSSProperties = { fontFamily: fonts.mono };

interface HabitStreakProps {
  habits: Habit[];
  onIncrement: (i: number) => void;
  onRename?: (i: number, name: string) => void;
}

export function HabitStreak({ habits, onIncrement, onRename }: HabitStreakProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
      {habits.map((h, i) => (
        <div
          key={h.name}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
        >
          <span style={{ fontSize: fontSizes.lg }}>{h.icon}</span>
          <span style={{ fontSize: fontSizes.sm, color: colors.textLow, flex: 1, minWidth: 0 }}>
            <InlineEdit
              value={h.name}
              onSave={name => onRename?.(i, name)}
              style={{ color: colors.textLow }}
            />
          </span>
          <span
            onClick={() => onIncrement(i)}
            title="클릭하면 +1"
            style={{
              ...mono, fontSize: fontSizes.base, fontWeight: 700, cursor: "pointer",
              color: h.streak >= 10 ? colors.statusActive : h.streak >= 5 ? colors.statusProgress : colors.textMid,
            }}
          >
            {h.streak}
            <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost, marginLeft: 2 }}>일</span>
          </span>
        </div>
      ))}
    </div>
  );
}
