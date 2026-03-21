// ABOUTME: Formats lifetime achievement data from WidgetData into displayable stat items
// ABOUTME: Cross-domain stats — focus time, check-ins, completed projects, and 5 personal best streaks

import type { WidgetData } from "../types";
import { formatLifetime } from "./pomodoro";

export interface StatItem {
  /** Stable key for React rendering and test assertions. */
  key: string;
  /** Display emoji prefix. */
  emoji: string;
  /** Korean display label. */
  label: string;
  /** Pre-formatted display value (e.g., "2h 30m", "14일", "1,234회"). */
  value: string;
}

// Formats an integer with Korean locale thousands separators (e.g., 1234 → "1,234").
// Intentionally hardcoded to ko-KR — widget text is Korean regardless of system locale.
function formatCount(n: number): string {
  return n.toLocaleString("ko-KR");
}

// Returns true when n is a finite positive number; rejects undefined, null, NaN, 0, Infinity.
function isPositive(n: number | undefined | null): n is number {
  return Number.isFinite(n) && n! > 0;
}

/**
 * Extracts and formats lifetime achievement stats from WidgetData.
 * Returns an ordered array of displayable stat items.
 * Items with no data (undefined, null, 0) are suppressed.
 * Pure function with no side effects.
 */
export function calcLifetimeStats(data: WidgetData): StatItem[] {
  const items: StatItem[] = [];

  if (isPositive(data.pomodoroLifetimeMins)) {
    items.push({
      key: "focusTime",
      emoji: "🍅",
      label: "총 집중 시간",
      value: formatLifetime(data.pomodoroLifetimeMins),
    });
  }

  if (isPositive(data.habitLifetimeTotalCheckins)) {
    items.push({
      key: "totalCheckins",
      emoji: "✓",
      label: "총 습관 체크인",
      value: `${formatCount(data.habitLifetimeTotalCheckins)}회`,
    });
  }

  const completedCount = (data.projects ?? []).filter(p => p.status === "done").length;
  if (completedCount > 0) {
    items.push({
      key: "completedProjects",
      emoji: "🎉",
      label: "완료한 프로젝트",
      value: `${completedCount}개`,
    });
  }

  const streaks: Array<{ key: string; emoji: string; label: string; val: number | undefined }> = [
    { key: "perfectDayBest", emoji: "🌟", label: "완벽한 날 최고", val: data.perfectDayBestStreak },
    { key: "intentionBest", emoji: "✨", label: "의도 달성 최고", val: data.intentionDoneBestStreak },
    { key: "focusBest", emoji: "🔥", label: "집중 연속 최고", val: data.focusBestStreak },
    { key: "momentumBest", emoji: "⚡", label: "모멘텀 연속 최고", val: data.momentumBestStreak },
    { key: "pomodoroBest", emoji: "🎯", label: "포모도로 목표 최고", val: data.pomodoroGoalBestStreak },
  ];

  for (const s of streaks) {
    if (isPositive(s.val)) {
      items.push({
        key: s.key,
        emoji: s.emoji,
        label: s.label,
        value: `${s.val}일`,
      });
    }
  }

  return items;
}
