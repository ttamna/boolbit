// ABOUTME: HabitStreak component - displays habit grid with streak counts
// ABOUTME: Click on any habit to increment its streak counter

import { CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";

const mono: CSSProperties = { fontFamily: fonts.mono };

export function HabitStreak({ habits, onIncrement }: { habits: Habit[]; onIncrement: (i: number) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
      {habits.map((h, i) => (
        <div
          key={h.name}
          onClick={() => onIncrement(i)}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}
          title="클릭하면 +1"
        >
          <span style={{ fontSize: fontSizes.lg }}>{h.icon}</span>
          <span style={{ fontSize: fontSizes.sm, color: colors.textLow, flex: 1 }}>{h.name}</span>
          <span style={{
            ...mono, fontSize: fontSizes.base, fontWeight: 700,
            color: h.streak >= 10 ? colors.statusActive : h.streak >= 5 ? colors.statusProgress : colors.textMid,
          }}>
            {h.streak}
            <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost, marginLeft: 2 }}>일</span>
          </span>
        </div>
      ))}
    </div>
  );
}
