// ABOUTME: Clock component - displays current time and date with 12h/24h format support
// ABOUTME: Updates every second via setInterval; onToggleFormat enables format toggle; dailyScore shows momentum badge

import { useState, useEffect } from "react";
import { fonts, fontSizes, colors, radius } from "../theme";
import type { DailyScore } from "../lib/momentum";

// Returns the fraction of the calendar day elapsed (0.0 = midnight, 0.5 = noon, 1.0 = end of day).
// Clamped to [0, 1] so out-of-range inputs (e.g. negative or > 86400 total seconds) stay bounded.
// Exported for unit testing; accepts discrete h/m/s values for deterministic tests.
export function calcDayFraction(hours: number, minutes: number, seconds: number): number {
  return Math.min(1, Math.max(0, (hours * 3600 + minutes * 60 + seconds) / 86400));
}

// Returns the display hour string (zero-padded) and AM/PM period for 12h/24h modes.
// In 12h mode: midnight (0) and noon (12) both display as "12"; period is "AM" or "PM".
// In 24h mode: period is null.
// Exported for unit testing.
export function formatHour(rawHour: number, use12h: boolean): { h: string; period: string | null } {
  const h = use12h
    ? ((rawHour % 12) || 12).toString().padStart(2, "0")
    : rawHour.toString().padStart(2, "0");
  const period = use12h ? (rawHour >= 12 ? "PM" : "AM") : null;
  return { h, period };
}

// Maps ScoreTier to a display color — high uses accent, mid uses amber, low is dim
function scoreTierColor(tier: DailyScore["tier"], accent: string | undefined): string {
  if (tier === "high") return accent ?? colors.statusActive;
  if (tier === "mid") return colors.statusProgress;
  return colors.textLabel;
}

const mono = { fontFamily: fonts.mono };

interface ClockProps {
  use12h?: boolean;
  accent?: string;
  onToggleFormat?: () => void;
  /** Optional daily momentum score (0-100) with tier; shown as a subtle badge in the date row */
  dailyScore?: DailyScore;
}

export function Clock({ use12h = false, accent, onToggleFormat, dailyScore }: ClockProps) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rawHour = time.getHours();
  const { h, period } = formatHour(rawHour, use12h);
  const m = time.getMinutes().toString().padStart(2, "0");
  const sec = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const dayFraction = calcDayFraction(rawHour, time.getMinutes(), time.getSeconds());
  const dayPct = Math.round(dayFraction * 100);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...mono, fontSize: fontSizes.clock, fontWeight: 200, letterSpacing: 6, color: colors.textPrimary, lineHeight: 1 }}>
        {h}<span style={{ opacity: 0.4 }}>:</span>{m}
        {period && (
          <span style={{ opacity: 0.5, fontSize: fontSizes.xs, marginLeft: 6, letterSpacing: 1 }}>{period}</span>
        )}
        <span style={{ opacity: 0.2, fontSize: fontSizes.clockSec, marginLeft: 4 }}>{sec}</span>
      </div>
      {/* Date row: date string + optional daily momentum badge + optional format toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 6 }}>
        <div style={{ fontSize: fontSizes.base, color: colors.textFaint, fontWeight: 300, letterSpacing: 1 }}>
          {dateStr}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {dailyScore !== undefined && (
            <span
              title={`오늘 모멘텀 ${dailyScore.score}/100 (습관·집중·의도)`}
              style={{
                ...mono,
                fontSize: fontSizes.mini,
                color: scoreTierColor(dailyScore.tier, accent),
                opacity: 0.8,
                cursor: "default",
                userSelect: "none",
              }}
            >
              {dailyScore.score}
            </span>
          )}
          {onToggleFormat && (
            <button
              onClick={onToggleFormat}
              title={use12h ? "12시간 → 24시간 형식으로 전환" : "24시간 → 12시간 형식으로 전환"}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textPhantom, fontSize: fontSizes.mini,
                fontFamily: fonts.mono, padding: "0 2px", lineHeight: 1,
              }}
            >
              {use12h ? "24h" : "12h"}
            </button>
          )}
        </div>
      </div>
      {/* Day progress bar — shows how much of today has elapsed */}
      <div
        title={`하루의 ${dayPct}% 경과`}
        style={{ marginTop: 8, height: 2, borderRadius: radius.bar, background: colors.borderSubtle, overflow: "hidden" }}
      >
        <div style={{
          height: "100%",
          width: `${dayFraction * 100}%`,
          background: accent ?? colors.textSubtle,
          borderRadius: radius.bar,
          transition: "width 1s linear",
        }} />
      </div>
    </div>
  );
}
