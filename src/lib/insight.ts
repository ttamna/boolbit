// ABOUTME: calcTodayInsight — context-aware daily insight engine for the Clock badge
// ABOUTME: Priority chain: streak risk > deadline critical > milestone > perfect day > intention > pomodoro > deadline soon > project stale

import { getUpcomingMilestone } from "./habits";
import type { Project } from "../types";

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
  /** Active/in-progress projects to surface deadline warnings and stale-focus alerts; absent = no project context */
  projects?: Pick<Project, "name" | "deadline" | "status" | "lastFocusDate">[];
}

// Returns days from todayStr until deadline (0 = today, positive = future). Uses injected todayStr for testability.
function daysUntil(deadline: string, todayStr: string): number | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const d = new Date(deadline + "T00:00:00").getTime();
  const t = new Date(todayStr + "T00:00:00").getTime();
  if (isNaN(d) || isNaN(t)) return null;
  return Math.floor((d - t) / 86400000);
}

// Returns the single most relevant actionable insight for the user right now, or null if nothing notable.
// Priority order: streak_at_risk > deadline_critical > milestone_near > perfect_day > intention_missing > pomodoro_last_one > deadline_soon > project_stale.
export function calcTodayInsight(params: InsightParams): TodayInsight | null {
  const { habits, todayStr, nowHour, todayIntentionDate, sessionsToday, sessionGoal, habitsAllDoneDate, projects } = params;

  // 1. Streak at risk: evening (≥ 18h) + high streak (≥ 7) + not yet checked today
  if (nowHour >= 18) {
    const atRisk = habits
      .filter(h => h.streak >= 7 && h.lastChecked !== todayStr)
      .sort((a, b) => b.streak - a.streak)[0];
    if (atRisk) {
      return { text: `⚠️ ${atRisk.name} ${atRisk.streak}일 스트릭 위험`, level: "warning" };
    }
  }

  // 2. Deadline critical: active/in-progress project deadline within 0–3 days
  if (projects && projects.length > 0) {
    const critical = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.deadline)
      .map(p => ({ name: p.name, days: daysUntil(p.deadline!, todayStr) }))
      .filter((p): p is { name: string; days: number } => p.days !== null && p.days >= 0 && p.days <= 3)
      .sort((a, b) => a.days - b.days)[0];
    if (critical) {
      const label = critical.days === 0 ? "D-Day" : `D-${critical.days}`;
      return { text: `⚡ ${critical.name} ${label}`, level: "warning" };
    }
  }

  // 3. Milestone 1 day away: checking in today would reach the next milestone
  const milestoneCandidate = habits
    .filter(h => h.streak > 0 && h.lastChecked !== todayStr)
    .map(h => ({ habit: h, ms: getUpcomingMilestone(h.streak, 1) }))
    .find(({ ms }) => ms !== null);
  if (milestoneCandidate && milestoneCandidate.ms) {
    const { habit, ms } = milestoneCandidate;
    return { text: `🎯 ${habit.name} ${ms.badge} 1일 전!`, level: "info" };
  }

  // 4. Perfect day: all habits completed today
  if (habitsAllDoneDate === todayStr) {
    return { text: "✨ 오늘 완벽한 습관 달성!", level: "success" };
  }

  // 5. Intention missing: morning (< 12h) and today's intention not yet set
  if (nowHour < 12 && todayIntentionDate !== todayStr) {
    return { text: "✍️ 오늘의 의도를 설정해보세요", level: "info" };
  }

  // 6. Pomodoro: one session away from daily goal
  if (sessionGoal !== undefined && sessionsToday === sessionGoal - 1) {
    return { text: "🍅 포모도로 목표까지 1세션!", level: "info" };
  }

  // 7. Deadline soon: active/in-progress project deadline within 4–7 days
  if (projects && projects.length > 0) {
    const soon = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.deadline)
      .map(p => ({ name: p.name, days: daysUntil(p.deadline!, todayStr) }))
      .filter((p): p is { name: string; days: number } => p.days !== null && p.days >= 4 && p.days <= 7)
      .sort((a, b) => a.days - b.days)[0];
    if (soon) {
      return { text: `📅 ${soon.name} D-${soon.days}`, level: "info" };
    }
  }

  // 8. Project stale: active/in-progress project not focused via pomodoro in 7+ days
  if (projects && projects.length > 0) {
    const todayMs = new Date(todayStr + "T00:00:00").getTime();
    const stale = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.lastFocusDate && /^\d{4}-\d{2}-\d{2}$/.test(p.lastFocusDate))
      .map(p => {
        const lastMs = new Date(p.lastFocusDate! + "T00:00:00").getTime();
        return isNaN(lastMs) ? null : { name: p.name, days: Math.floor((todayMs - lastMs) / 86400000) };
      })
      .filter((p): p is { name: string; days: number } => p !== null && p.days >= 7)
      .sort((a, b) => b.days - a.days)[0]; // most neglected first
    if (stale) {
      return { text: `⊖ ${stale.name} ${stale.days}일째 미집중`, level: "info" };
    }
  }

  return null;
}
