// ABOUTME: Compact card visualizing keystone habit synergy (conditional completion lift)
// ABOUTME: Shows which habit, when done, most increases completion of other habits; returns null when no data

import type { CSSProperties } from "react";
import type { HabitSynergyResult } from "../lib/habitSynergy";
import { fonts, fontSizes, colors } from "../theme";

export interface HabitSynergyCardProps {
  synergy: HabitSynergyResult | null;
}

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
  keystoneRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
  } as CSSProperties,
  habitName: {
    color: colors.textHigh,
    fontWeight: 600,
  } as CSSProperties,
  liftBadge: {
    color: colors.statusActive,
    fontWeight: 600,
  } as CSSProperties,
  ratesDone: {
    color: colors.statusActive,
    opacity: 0.8,
  } as CSSProperties,
  ratesNotDone: {
    color: colors.textDim,
  } as CSSProperties,
  separator: {
    color: colors.textPhantom,
    fontSize: fontSizes.mini,
  } as CSSProperties,
  summary: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 2,
  } as CSSProperties,
};

export function HabitSynergyCard({ synergy }: HabitSynergyCardProps) {
  if (!synergy) return null;

  const { keystone, summary } = synergy;

  return (
    <div style={s.container}>
      <div style={s.label}>시너지</div>
      {keystone ? (
        <div
          style={s.keystoneRow}
          title={`'${keystone.habitName}' 할 때 다른 습관 ${Math.round(keystone.avgOthersWhenDone)}% vs 안 할 때 ${Math.round(keystone.avgOthersWhenNotDone)}%`}
        >
          <span style={s.habitName}>{keystone.habitName}</span>
          <span style={s.liftBadge}>+{Math.round(keystone.liftPct)}%p</span>
          <span style={s.ratesDone}>{Math.round(keystone.avgOthersWhenDone)}%</span>
          <span style={s.separator}>vs</span>
          <span style={s.ratesNotDone}>{Math.round(keystone.avgOthersWhenNotDone)}%</span>
        </div>
      ) : (
        <div style={s.summary}>{summary}</div>
      )}
    </div>
  );
}
