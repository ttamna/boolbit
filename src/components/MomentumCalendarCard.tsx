// ABOUTME: MomentumCalendarCard — 4-week momentum score heatmap (4 rows × 7 columns of colored dots)
// ABOUTME: Pure rendering component; receives MomentumCalendar from calcMomentumCalendar, returns null when null

import type { CSSProperties } from "react";
import type { MomentumCalendar, MomentumDay } from "../lib/momentumCalendar";
import { fonts, fontSizes, colors } from "../theme";

export interface MomentumCalendarCardProps {
  calendar: MomentumCalendar | null;
  accent?: string;
}

const DOT = 5;
const GAP = 2;
const WEEKS = 4;
const DAYS_PER_WEEK = 7;

// Tier → background color
function dotColor(day: MomentumDay, accent: string | undefined): string {
  if (day.tier === "high") return accent ?? colors.statusActive;
  if (day.tier === "mid") return colors.statusProgress;
  if (day.tier === "low") return colors.statusPaused;
  return colors.borderSubtle; // null = no data
}

// Tier → opacity
function dotOpacity(day: MomentumDay): number {
  if (day.tier === null) return 0.35;
  if (day.tier === "high") return 0.9;
  if (day.tier === "mid") return 0.75;
  return 0.6; // low
}

const s = {
  container: {
    padding: "4px 0 8px",
  } as CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  } as CSSProperties,
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    lineHeight: 1,
  } as CSSProperties,
  stat: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textLabel,
    lineHeight: 1,
  } as CSSProperties,
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: GAP,
  } as CSSProperties,
  row: {
    display: "flex",
    gap: GAP,
  } as CSSProperties,
};

export function MomentumCalendarCard({ calendar, accent }: MomentumCalendarCardProps) {
  if (!calendar) return null;

  const { days, activeDays, avgScore } = calendar;

  // Split flat 28-day array into 4 rows of 7
  const rows: MomentumDay[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    rows.push(days.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));
  }

  // avgScore is always a number when calendar is non-null (activeDays >= 7 guaranteed)
  const avgDisplay = Math.round(avgScore);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={s.label}>28일 모멘텀</span>
        <span
          style={s.stat}
          title={`활성 ${activeDays}일 · 평균 모멘텀 ${avgDisplay}`}
        >
          avg {avgDisplay}
        </span>
      </div>
      <div style={s.grid} role="img" aria-label={`28일 모멘텀 히스토리 · 활성 ${activeDays}일 · 평균 ${avgDisplay}`}>
        {rows.map((week, wi) => (
          <div key={wi} style={s.row}>
            {week.map(day => (
              <div
                key={day.date}
                title={day.score !== null ? `${day.date} · ${day.score}점` : day.date}
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: "50%",
                  background: dotColor(day, accent),
                  opacity: dotOpacity(day),
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
