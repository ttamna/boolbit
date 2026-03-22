// ABOUTME: Compact card visualizing per-habit recovery resilience (elastic/moderate/slow/fragile grades)
// ABOUTME: Pure rendering component; receives HabitResilienceResult from calcHabitResilience, returns null when null or empty

import type { CSSProperties } from "react";
import type { HabitResilienceResult, ResilienceGrade } from "../lib/habitResilience";
import { GRADE_EMOJI } from "../lib/habitResilience";
import { fonts, fontSizes, colors } from "../theme";

export interface HabitResilienceCardProps {
  resilience: HabitResilienceResult | null;
}

const GRADE_COLORS: Record<ResilienceGrade, string> = {
  elastic: colors.statusActive,
  moderate: colors.statusProgress,
  slow: colors.statusWarning,
  fragile: colors.statusPaused,
};

const s = {
  container: {
    padding: "4px 0 6px",
  } as CSSProperties,
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    marginBottom: 4,
    textAlign: "center",
  } as CSSProperties,
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 2,
    justifyContent: "center",
  } as CSSProperties,
  habitRow: (gradeColor: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "1px 5px",
    borderRadius: 3,
    background: colors.surfaceFaint,
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    lineHeight: 1.4,
    color: gradeColor,
  } as CSSProperties),
  emoji: {
    fontSize: fontSizes.mini,
    lineHeight: 1,
  } as CSSProperties,
  name: {
    fontSize: fontSizes.mini,
    maxWidth: 48,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as CSSProperties,
  breakCount: {
    fontSize: fontSizes.mini,
    opacity: 0.7,
  } as CSSProperties,
  summary: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 4,
  } as CSSProperties,
};

function buildTooltip(name: string, grade: ResilienceGrade, medianGapDays: number, maxGapDays: number, breakCount: number): string {
  if (breakCount === 0) return `${name}: ${grade} (끊김 없음)`;
  return `${name}: ${grade} (중앙값 ${medianGapDays}일, 최대 ${maxGapDays}일, ${breakCount}회 끊김)`;
}

export function HabitResilienceCard({ resilience }: HabitResilienceCardProps) {
  if (!resilience || resilience.habits.length === 0) return null;

  return (
    <div style={s.container}>
      <div style={s.label}>회복탄력성</div>
      <div style={s.grid}>
        {resilience.habits.map(h => {
          const gradeColor = GRADE_COLORS[h.grade];
          return (
            <span
              key={h.name}
              style={s.habitRow(gradeColor)}
              title={buildTooltip(h.name, h.grade, h.medianGapDays, h.maxGapDays, h.breakCount)}
            >
              <span style={s.emoji}>{GRADE_EMOJI[h.grade]}</span>
              <span style={s.name}>{h.name}</span>
              {h.breakCount > 0 && <span style={s.breakCount}>{h.breakCount}회</span>}
            </span>
          );
        })}
      </div>
      {resilience.summary && (
        <div style={s.summary}>{resilience.summary}</div>
      )}
    </div>
  );
}
