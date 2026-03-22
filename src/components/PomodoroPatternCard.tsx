// ABOUTME: PomodoroPatternCard — 28-day pomodoro usage pattern analysis UI card
// ABOUTME: Pure rendering component; receives PomodoroPattern from calcPomodoroPattern, returns null when null

import type { CSSProperties } from "react";
import type { PomodoroPattern, PomodoroGrade, PomodoroConsistency, PomodoroTrend } from "../lib/pomodoroPattern";
import { fonts, fontSizes, colors } from "../theme";

export interface PomodoroPatternCardProps {
  pattern: PomodoroPattern | null;
  accent?: string;
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const GRADE_EMOJI: Record<PomodoroGrade, string> = {
  elite: "🔥",
  strong: "💪",
  moderate: "📊",
  building: "🌱",
  inactive: "💤",
};

const GRADE_LABELS: Record<PomodoroGrade, string> = {
  elite: "엘리트",
  strong: "우수",
  moderate: "보통",
  building: "시작",
  inactive: "비활성",
};

const CONSISTENCY_LABELS: Record<PomodoroConsistency, string> = {
  steady: "꾸준",
  sporadic: "산발적",
  bursty: "몰아서",
};

const CONSISTENCY_EMOJI: Record<PomodoroConsistency, string> = {
  steady: "📏",
  sporadic: "🎲",
  bursty: "⚡",
};

const TREND_ARROWS: Record<PomodoroTrend, string> = {
  increasing: "↑",
  stable: "→",
  decreasing: "↓",
};

// Grade → status color mapping (4 distinct colors for visual differentiation)
function gradeColor(grade: PomodoroGrade, accent?: string): string {
  if (accent) return accent;
  switch (grade) {
    case "elite": return colors.statusActive;
    case "strong": return colors.statusProgress;
    case "moderate": return colors.statusWarning;
    case "building": return colors.statusWarning;
    case "inactive": return colors.statusPaused;
  }
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
  row: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  } as CSSProperties,
  metric: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    padding: "2px 6px",
    borderRadius: 3,
    background: colors.surfaceFaint,
    minWidth: 48,
  } as CSSProperties,
  metricLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    lineHeight: 1,
  } as CSSProperties,
  metricValue: (color: string) => ({
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color,
    lineHeight: 1,
    fontWeight: 600,
  } as CSSProperties),
  summary: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 4,
  } as CSSProperties,
};

export function PomodoroPatternCard({ pattern, accent }: PomodoroPatternCardProps) {
  if (!pattern) return null;

  const badgeColor = gradeColor(pattern.grade, accent);

  return (
    <div style={s.container}>
      <div style={s.label}>포모도로 패턴</div>

      {/* Grade + Activity row */}
      <div style={s.row}>
        <div style={s.metric}>
          <span style={s.metricLabel}>등급</span>
          <span
            data-testid="grade-badge"
            style={s.metricValue(badgeColor)}
          >
            {GRADE_EMOJI[pattern.grade]} {GRADE_LABELS[pattern.grade]}
          </span>
        </div>

        <div style={s.metric}>
          <span style={s.metricLabel}>활동률</span>
          <span style={s.metricValue(colors.textMid)}>
            {pattern.activityRate}% ({pattern.activeDays}/{pattern.totalDays}일)
          </span>
        </div>

        <div style={s.metric}>
          <span style={s.metricLabel}>일평균</span>
          <span style={s.metricValue(colors.textMid)}>
            {pattern.avgPerActiveDay}회 {TREND_ARROWS[pattern.trend]}
          </span>
        </div>
      </div>

      {/* Consistency + Goal + Weekday pattern row */}
      <div style={{ ...s.row, marginTop: 4 }}>
        <div
          style={s.metric}
          title={`${CONSISTENCY_LABELS[pattern.consistency]} (${pattern.consistency})`}
        >
          <span style={s.metricLabel}>일관성</span>
          <span style={s.metricValue(colors.textMid)}>
            {CONSISTENCY_EMOJI[pattern.consistency]} {CONSISTENCY_LABELS[pattern.consistency]}
          </span>
        </div>

        {pattern.goalHitRate !== null && (
          <div style={s.metric}>
            <span style={s.metricLabel}>목표 달성</span>
            <span style={s.metricValue(colors.textMid)}>
              {pattern.goalHitRate}% ({pattern.goalHitDays}일)
            </span>
          </div>
        )}

        <div style={s.metric}>
          <span style={s.metricLabel}>주중/주말</span>
          <span style={s.metricValue(colors.textMid)}>
            {pattern.weekdayAvg}/{pattern.weekendAvg}
          </span>
        </div>
      </div>

      {/* Peak/Valley + Summary */}
      {(pattern.peakDay !== null || pattern.valleyDay !== null) && (
        <div style={s.summary}>
          {pattern.peakDay !== null && `최고 ${WEEKDAY_NAMES[pattern.peakDay]}`}
          {pattern.peakDay !== null && pattern.valleyDay !== null && pattern.peakDay !== pattern.valleyDay && " · "}
          {pattern.valleyDay !== null && pattern.peakDay !== pattern.valleyDay && `최저 ${WEEKDAY_NAMES[pattern.valleyDay]}`}
        </div>
      )}
      <div data-testid="pattern-summary" style={s.summary}>{pattern.summary}</div>
    </div>
  );
}
