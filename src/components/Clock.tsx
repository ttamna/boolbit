// ABOUTME: Clock component - displays current time and date with 12h/24h format support
// ABOUTME: Updates every second via setInterval; dailyScore badge + 7-day momentum sparkline + 3-day trend arrow (↑/↓/→) + active streaks ticker + next action with completion confidence below date row

import { useState, useEffect, useMemo } from "react";
import { fonts, fontSizes, colors, radius } from "../theme";
import type { DailyScore, MomentumTrend } from "../lib/momentum";
import type { TodayInsight } from "../lib/insight";
import type { MomentumEntry } from "../types";
import type { ActiveStreak } from "../lib/streaks";
import type { NextAction } from "../lib/nextAction";

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
  /** Rolling 7-day momentum score history; newest last; absent = no sparkline */
  momentumHistory?: MomentumEntry[];
  /** Optional context-aware insight shown below the sparkline */
  insight?: TodayInsight;
  /** Consecutive days with momentum score ≥ 40; shown as 🔥Nd when ≥ 2 */
  momentumStreak?: number;
  /** Rounded average momentum score over the 7-day history window; shown as "7d·N" badge
   *  inside the sparkline row — only visible when sparkline is rendered (momentumHistory ≥ 2 entries). */
  weekAvg?: number;
  /** 3-day monotone trend direction; shown as ↑/↓/→ arrow beside the weekAvg badge.
   *  Only rendered when weekAvg is also defined (both live inside the sparkline row). */
  trend?: MomentumTrend;
  /** Non-momentum active streaks (days ≥ 2); shown as a compact ticker below the H/P/I breakdown. */
  activeStreaks?: ActiveStreak[];
  /** Prescriptive next-action recommendation based on daily completion state. */
  nextAction?: NextAction;
  /** Predicted probability (0–100) of completing all daily routines; null when insufficient history. */
  completionConfidence?: number | null;
}

// Maps MomentumTrend to arrow glyph, tooltip label, and display color
const TREND_DISPLAY: Record<MomentumTrend, { arrow: string; label: string; color: (accent?: string) => string }> = {
  rising:    { arrow: "↑", label: "상승", color: (a) => a ?? colors.statusActive },
  declining: { arrow: "↓", label: "하락", color: () => colors.statusPaused },
  stable:    { arrow: "→", label: "유지", color: () => colors.textDim },
};

export function Clock({ use12h = false, accent, onToggleFormat, dailyScore, momentumHistory, insight, momentumStreak, weekAvg, trend, activeStreaks, nextAction, completionConfidence }: ClockProps) {
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

  // todayLocal: YYYY-MM-DD string for the current calendar day; recomputed only when the date string changes
  // (i.e. at midnight), not every second — avoids creating new string objects on each tick.
  const todayLocal = time.toLocaleDateString("sv");
  // sparklineDays: past 6 days (excluding today) in YYYY-MM-DD for slot alignment.
  // Derived from the stable date string, not from `time`, so it updates only at midnight.
  const sparklineDays = useMemo(() => {
    const days: string[] = [];
    const base = new Date(todayLocal + "T00:00:00");
    for (let i = 6; i >= 1; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(d.toLocaleDateString("sv"));
    }
    return days;
  }, [todayLocal]);
  const histMap = useMemo(() => {
    const map = new Map<string, MomentumEntry>();
    (momentumHistory ?? []).forEach(e => map.set(e.date, e));
    return map;
  }, [momentumHistory]);
  // Show sparkline only when there are ≥2 history entries (including today) so the trend is meaningful.
  const showSparkline = (momentumHistory?.length ?? 0) >= 2;

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
          {momentumStreak !== undefined && momentumStreak >= 2 && (
            <span
              title={`${momentumStreak}일 연속 모멘텀 40점 이상`}
              style={{
                ...mono,
                fontSize: fontSizes.mini,
                color: accent ?? colors.statusActive,
                opacity: 0.7,
                cursor: "default",
                userSelect: "none",
              }}
            >
              🔥{momentumStreak}d
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
      {/* 7-day momentum sparkline — past 6 days as colored dots; shown when ≥2 history entries */}
      {showSparkline && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 5 }}>
          {weekAvg !== undefined && (
            <span
              title={`최근 7일 모멘텀 평균 ${weekAvg}/100${trend ? ` (${TREND_DISPLAY[trend].label})` : ""}`}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginRight: 2, opacity: 0.7 }}
            >
              7d·{weekAvg}
              {trend && (
                <span style={{ color: TREND_DISPLAY[trend].color(accent), marginLeft: 1 }}>
                  {TREND_DISPLAY[trend].arrow}
                </span>
              )}
            </span>
          )}
          {sparklineDays.map((day, di) => {
            const entry = histMap.get(day);
            const daysAgo = 6 - di;
            const labelDay = daysAgo === 1 ? "어제" : `${daysAgo}일 전`;
            const label = entry
              ? `${labelDay} 모멘텀 ${entry.score}/100`
              : `${labelDay} 기록 없음`;
            const dotColor = entry
              ? entry.tier === "high" ? (accent ?? colors.statusActive)
              : entry.tier === "mid" ? colors.statusProgress
              : colors.textLabel
              : colors.borderSubtle;
            const opacity = entry ? (entry.score >= 75 ? 0.9 : entry.score >= 40 ? 0.65 : 0.4) : 0.25;
            return (
              <div
                key={day}
                title={label}
                style={{
                  width: 3, height: 3, borderRadius: "50%", flexShrink: 0,
                  background: dotColor, opacity,
                }}
              />
            );
          })}
        </div>
      )}
      {/* H/P/I breakdown bars — shows each component's contribution when breakdown is available */}
      {dailyScore?.breakdown && (
        <div
          title={`모멘텀 세부: 습관 ${Math.round(dailyScore.breakdown.habits)}/50 · 집중 ${Math.round(dailyScore.breakdown.pomodoro)}/30 · 의도 ${dailyScore.breakdown.intention}/20`}
          style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginTop: 4 }}
        >
          {([
            { key: "H", val: dailyScore.breakdown.habits, max: 50 },
            { key: "P", val: dailyScore.breakdown.pomodoro, max: 30 },
            { key: "I", val: dailyScore.breakdown.intention, max: 20 },
          ] as const).map(({ key, val, max }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ ...mono, fontSize: fontSizes.mini, color: colors.textLabel, opacity: 0.4, lineHeight: 1, userSelect: "none" }}>
                {key}
              </span>
              <div style={{ width: 20, height: 2, borderRadius: radius.bar, background: colors.borderSubtle, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.max(0, Math.min(100, val / max * 100))}%`,
                  background: scoreTierColor(dailyScore.tier, accent),
                  borderRadius: radius.bar,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Active streaks ticker — non-momentum domain streaks (perfectDay, intention, focus, pomodoro goal) */}
      {activeStreaks && activeStreaks.length > 0 && (
        <div
          title={activeStreaks.map(s => `${s.label} ${s.days}일 연속`).join(" · ")}
          style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 4 }}
        >
          {activeStreaks.map(s => (
            <span
              key={s.key}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom, opacity: 0.65, userSelect: "none" }}
            >
              {s.emoji}{s.days}d
            </span>
          ))}
        </div>
      )}
      {/* Today's insight — context-aware one-liner: streak risk, milestone, intention, pomodoro */}
      {insight && (
        <div style={{
          marginTop: showSparkline ? 4 : 6,
          fontSize: fontSizes.mini,
          color: insight.level === "warning" ? colors.statusPaused
            : insight.level === "success" ? (accent ?? colors.statusActive)
            : colors.textLabel,
          opacity: 0.75,
          letterSpacing: 0.3,
          userSelect: "none",
        }}>
          {insight.text}
        </div>
      )}
      {/* Next action — prescriptive one-liner: what to do next, with completion confidence % when available */}
      {nextAction && (
        <div style={{
          marginTop: 3,
          fontSize: fontSizes.mini,
          color: nextAction.key === "allDone" ? (accent ?? colors.statusActive) : colors.textLabel,
          opacity: 0.6,
          letterSpacing: 0.3,
          userSelect: "none",
        }}>
          {nextAction.key === "allDone" ? nextAction.emoji : "→"} {nextAction.text}
          {/* Hide confidence when allDone — the celebration emoji is the reward, not a redundant "100%" */}
          {completionConfidence != null && nextAction.key !== "allDone" && (
            <span style={{ color: colors.textDim, marginLeft: 4 }}>· {completionConfidence}%</span>
          )}
        </div>
      )}
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
