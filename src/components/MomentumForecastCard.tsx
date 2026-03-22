// ABOUTME: MomentumForecastCard — 7-day momentum forecast "weather strip" showing predicted scores per weekday
// ABOUTME: Pure rendering component; receives MomentumForecast from calcMomentumForecast, returns null when null

import type { CSSProperties } from "react";
import type { MomentumForecast, DayForecast, ForecastTrend } from "../lib/momentumForecast";
import { fonts, fontSizes, colors } from "../theme";

export interface MomentumForecastCardProps {
  forecast: MomentumForecast | null;
  accent?: string;
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const CONFIDENCE_LABELS: Record<DayForecast["confidence"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const CONFIDENCE_OPACITY: Record<DayForecast["confidence"], number> = {
  high: 1,
  medium: 0.75,
  low: 0.55,
};

const TREND_ARROWS: Record<ForecastTrend, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
};

const TREND_COLORS: Record<ForecastTrend, (accent?: string) => string> = {
  improving: (a) => a ?? colors.statusActive,
  declining: () => colors.statusPaused,
  stable: () => colors.textDim,
};

// Score → color using status tokens for readability on dark backgrounds
function scoreColor(score: number, accent?: string): string {
  if (score >= 75) return accent ?? colors.statusActive;
  if (score >= 60) return colors.statusProgress;
  if (score >= 45) return colors.statusProgress;
  if (score >= 30) return colors.statusWarning;
  return colors.statusPaused;
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
  strip: {
    display: "flex",
    gap: 2,
    justifyContent: "center",
  } as CSSProperties,
  daySlot: (opacity: number) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    padding: "2px 4px",
    borderRadius: 3,
    background: colors.surfaceFaint,
    minWidth: 28,
    opacity,
    cursor: "default",
  } as CSSProperties),
  weekday: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    lineHeight: 1,
  } as CSSProperties,
  emoji: {
    fontSize: fontSizes.sm,
    lineHeight: 1.2,
  } as CSSProperties,
  score: (color: string) => ({
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color,
    lineHeight: 1,
    fontWeight: 600,
  } as CSSProperties),
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  } as CSSProperties,
  avgLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    display: "flex",
    alignItems: "center",
    gap: 2,
  } as CSSProperties,
  summary: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 2,
  } as CSSProperties,
};

export function MomentumForecastCard({ forecast, accent }: MomentumForecastCardProps) {
  if (!forecast) return null;

  return (
    <div style={s.container}>
      <div style={s.label}>주간 예보</div>
      <div style={s.strip}>
        {forecast.days.map(day => {
          const confLabel = CONFIDENCE_LABELS[day.confidence];
          const title = `${WEEKDAY_NAMES[day.weekday]} ${day.predicted}점 (신뢰도: ${confLabel})`;
          return (
            <div
              key={day.date}
              style={s.daySlot(CONFIDENCE_OPACITY[day.confidence])}
              title={title}
            >
              <span style={s.weekday}>{WEEKDAY_NAMES[day.weekday]}</span>
              <span style={s.emoji}>{day.emoji}</span>
              <span style={s.score(scoreColor(day.predicted, accent))}>
                {day.predicted}
              </span>
            </div>
          );
        })}
      </div>
      <div style={s.footer}>
        <span style={s.avgLabel}>
          <span style={{ color: colors.textPhantom }}>주평균</span>
          <span>{forecast.weekAvg}</span>
          <span style={{ color: TREND_COLORS[forecast.trend](accent) }}>
            {TREND_ARROWS[forecast.trend]}
          </span>
        </span>
      </div>
      <div style={s.summary}>{forecast.summary}</div>
    </div>
  );
}
