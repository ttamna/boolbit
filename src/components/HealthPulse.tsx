// ABOUTME: HealthPulse — compact vital-signs strip showing burnout risk, consistency grade, and growth trajectory
// ABOUTME: Pure rendering component; receives pre-computed analytics data as props, returns null when all metrics are null

import type { CSSProperties } from "react";
import type { BurnoutRisk, RiskLevel } from "../lib/burnoutRisk";
import type { ConsistencyScore, ConsistencyTrend } from "../lib/consistencyScore";
import type { GrowthTrajectory } from "../lib/growthTrajectory";
import { fonts, fontSizes, colors } from "../theme";

// Unicode minus sign for consistent display and tooltip rendering
const MINUS = "\u2212";

export interface HealthPulseProps {
  burnout: BurnoutRisk | null;
  consistency: ConsistencyScore | null;
  growth: GrowthTrajectory | null;
  accent?: string;
}

// Burnout level → color mapping (higher risk = warmer color)
const RISK_COLORS: Record<RiskLevel, string> = {
  low: colors.statusActive,      // green
  moderate: colors.statusProgress, // amber
  high: colors.statusWarning,     // orange (between amber and red)
  critical: colors.statusPaused,  // red
};

// Burnout level → Korean label
const RISK_LABELS: Record<RiskLevel, string> = {
  low: "양호",
  moderate: "주의",
  high: "경고",
  critical: "위험",
};

// Consistency trend → arrow glyph
const CONSISTENCY_TREND_ARROW: Record<ConsistencyTrend, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
};

// Consistency trend → color (Record for compile-time exhaustiveness)
const CONSISTENCY_TREND_COLORS: Record<ConsistencyTrend, (accent?: string) => string> = {
  improving: (a) => a ?? colors.statusActive,
  declining: () => colors.statusPaused,
  stable: () => colors.textDim,
};

// Consistency grade → value color (Record for compile-time exhaustiveness)
const CONSISTENCY_GRADE_COLORS: Record<ConsistencyScore["grade"], string> = {
  elite: colors.statusActive,
  strong: colors.statusActive,
  steady: colors.statusProgress,
  building: colors.textSubtle,
  inconsistent: colors.statusPaused,
};

const s = {
  container: {
    display: "flex",
    gap: 12,
    padding: "6px 0 10px",
    justifyContent: "center",
    flexWrap: "wrap",
  } as CSSProperties,
  metric: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    lineHeight: 1,
  } as CSSProperties,
  dot: (color: string) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  } as CSSProperties),
  label: {
    color: colors.textPhantom,
    fontSize: fontSizes.mini,
  } as CSSProperties,
};

// Formats growth overall score with consistent sign display (MINUS for negatives)
function formatGrowthScore(overall: number): string {
  if (overall > 0) return `+${overall}`;
  if (overall < 0) return `${MINUS}${Math.abs(overall)}`;
  return "0";
}

// Resolves growth overall score to a color
function growthColor(overall: number, accent?: string): string {
  if (overall > 0) return accent ?? colors.statusActive;
  if (overall < 0) return colors.statusPaused;
  return colors.textDim;
}

export function HealthPulse({ burnout, consistency, growth, accent }: HealthPulseProps) {
  // Skip rendering entirely when there's no data to show
  if (!burnout && !consistency && !growth) return null;

  return (
    <div style={s.container}>
      {/* ── Burnout Risk ── */}
      {burnout && (
        <span
          style={s.metric}
          title={`번아웃 위험: ${RISK_LABELS[burnout.level]} (${burnout.score}/100)${burnout.factors.length > 0 ? ` ${MINUS} ${burnout.factors.join(", ")}` : ""}`}
        >
          <span style={s.dot(RISK_COLORS[burnout.level])} />
          <span style={{ color: RISK_COLORS[burnout.level] }}>
            {burnout.score}
          </span>
          <span style={s.label}>{RISK_LABELS[burnout.level]}</span>
        </span>
      )}

      {/* ── Consistency Grade ── */}
      {consistency && (
        <span
          style={s.metric}
          title={`일관성: ${consistency.grade} (${consistency.overall}%)${consistency.weakestDomain ? ` ${MINUS} 약점: ${consistency.weakestDomain}` : ""}`}
        >
          <span style={s.dot(accent ?? colors.statusActive)} />
          <span style={{ color: CONSISTENCY_GRADE_COLORS[consistency.grade] }}>
            {consistency.overall}%
          </span>
          {consistency.trend && (
            <span style={{ color: CONSISTENCY_TREND_COLORS[consistency.trend](accent) }}>
              {CONSISTENCY_TREND_ARROW[consistency.trend]}
            </span>
          )}
          <span style={s.label}>일관</span>
        </span>
      )}

      {/* ── Growth Trajectory ── */}
      {growth && (
        <span
          style={s.metric}
          title={`성장 궤적: ${growth.grade} (${formatGrowthScore(growth.overall)})${growth.strongestDomain ? ` ${MINUS} 강점: ${growth.strongestDomain}` : ""}`}
        >
          <span style={s.dot(growthColor(growth.overall, accent))} />
          <span style={{ color: growthColor(growth.overall, accent) }}>
            {formatGrowthScore(growth.overall)}
          </span>
          <span style={s.label}>성장</span>
        </span>
      )}
    </div>
  );
}
