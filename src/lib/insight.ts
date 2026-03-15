// ABOUTME: calcTodayInsight — context-aware daily insight engine for the Clock badge
// ABOUTME: Surfaces the single most actionable insight by priority: streak risk > milestone > perfect day > intention > pomodoro

import { getUpcomingMilestone } from "./habits";

export type InsightLevel = "success" | "warning" | "info";

export interface TodayInsight {
  text: string;
  level: InsightLevel;
}

interface InsightParams {
  habits: Array<{ name: string; streak: number; lastChecked?: string }>;
  todayStr: string;
  nowHour: number;
  todayIntentionDate: string | undefined;
  sessionsToday: number;
  sessionGoal: number | undefined;
  habitsAllDoneDate: string | undefined;
}

// Returns the single most relevant actionable insight for the user right now, or null if nothing notable.
// Priority order: streak_at_risk > milestone_near > perfect_day > intention_missing > pomodoro_last_one.
export function calcTodayInsight(params: InsightParams): TodayInsight | null {
  const { habits, todayStr, nowHour, todayIntentionDate, sessionsToday, sessionGoal, habitsAllDoneDate } = params;

  // 1. Streak at risk: evening (≥ 18h) + high streak (≥ 7) + not yet checked today
  if (nowHour >= 18) {
    const atRisk = habits
      .filter(h => h.streak >= 7 && h.lastChecked !== todayStr)
      .sort((a, b) => b.streak - a.streak)[0];
    if (atRisk) {
      return { text: `⚠️ ${atRisk.name} ${atRisk.streak}일 스트릭 위험`, level: "warning" };
    }
  }

  // 2. Milestone 1 day away: checking in today would reach the next milestone
  const milestoneCandidate = habits
    .filter(h => h.streak > 0 && h.lastChecked !== todayStr)
    .map(h => ({ habit: h, ms: getUpcomingMilestone(h.streak, 1) }))
    .find(({ ms }) => ms !== null);
  if (milestoneCandidate && milestoneCandidate.ms) {
    const { habit, ms } = milestoneCandidate;
    return { text: `🎯 ${habit.name} ${ms.badge} 1일 전!`, level: "info" };
  }

  // 3. Perfect day: all habits completed today
  if (habitsAllDoneDate === todayStr) {
    return { text: "✨ 오늘 완벽한 습관 달성!", level: "success" };
  }

  // 4. Intention missing: morning (< 12h) and today's intention not yet set
  if (nowHour < 12 && todayIntentionDate !== todayStr) {
    return { text: "✍️ 오늘의 의도를 설정해보세요", level: "info" };
  }

  // 5. Pomodoro: one session away from daily goal
  if (sessionGoal !== undefined && sessionsToday === sessionGoal - 1) {
    return { text: "🍅 포모도로 목표까지 1세션!", level: "info" };
  }

  return null;
}
