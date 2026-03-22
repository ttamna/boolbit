// ABOUTME: Compact visual matrix showing per-habit portfolio state (record/milestone_near/risk/growing/recovering/dormant)
// ABOUTME: Pure rendering component; receives HabitPortfolio from calcHabitPortfolio, returns null when null or empty

import type { CSSProperties } from "react";
import type { HabitPortfolio, HabitState } from "../lib/habitPortfolio";
import { fonts, fontSizes, colors } from "../theme";

export interface HabitPortfolioCardProps {
  portfolio: HabitPortfolio | null;
}

// State → emoji mapping (aligned with habitPortfolio.ts STATE_EMOJI)
const STATE_EMOJI: Record<HabitState, string> = {
  record: "🏆",
  milestone_near: "🎯",
  risk: "⚠️",
  growing: "📈",
  recovering: "🔄",
  dormant: "💤",
};

// State → color using existing theme tokens
const STATE_COLORS: Record<HabitState, string> = {
  record: colors.statusDone,
  milestone_near: colors.statusProgress,
  risk: colors.statusWarning,
  growing: colors.statusActive,
  recovering: colors.textMid,
  dormant: colors.textPhantom,
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
  habitRow: (stateColor: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "1px 5px",
    borderRadius: 3,
    background: colors.surfaceFaint,
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    lineHeight: 1.4,
    color: stateColor,
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
  streak: {
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

export function HabitPortfolioCard({ portfolio }: HabitPortfolioCardProps) {
  if (!portfolio || portfolio.habits.length === 0) return null;

  return (
    <div style={s.container}>
      <div style={s.label}>포트폴리오</div>
      <div style={s.grid}>
        {portfolio.habits.map(h => {
          const stateColor = STATE_COLORS[h.state];
          return (
            <span
              key={h.name}
              style={s.habitRow(stateColor)}
              title={`${h.name}: ${h.state} (${h.streak}일)`}
            >
              <span style={s.emoji}>{STATE_EMOJI[h.state]}</span>
              <span style={s.name}>{h.name}</span>
              {h.streak > 0 && <span style={s.streak}>{h.streak}d</span>}
            </span>
          );
        })}
      </div>
      {portfolio.summary && (
        <div style={s.summary}>{portfolio.summary}</div>
      )}
    </div>
  );
}
