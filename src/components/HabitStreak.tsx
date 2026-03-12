// ABOUTME: HabitStreak component - displays habit grid with streak counts and icons
// ABOUTME: Click icon, name, or streak number to edit inline; all habit fields are editable

import { CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";

const mono: CSSProperties = { fontFamily: fonts.mono };

interface HabitStreakProps {
  habits: Habit[];
  onUpdate?: (i: number, patch: Partial<Habit>) => void;
}

export function HabitStreak({ habits, onUpdate }: HabitStreakProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
      {habits.map((h, i) => (
        <div
          key={i}
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
        </div>
      ))}
    </div>
  );
}
