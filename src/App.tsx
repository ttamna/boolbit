// ABOUTME: Vision Widget root component - composes all widget sections
// ABOUTME: Handles data loading/saving, inline patch updates, and section reorder via sectionOrder field

import { useState, useEffect, useCallback, useRef, CSSProperties, Fragment } from "react";
import type { WidgetData, Habit, Project, SectionKey, GitHubData, IntentionEntry } from "./types";
import { colors, fonts, fontSizes, radius, shadows, THEMES, PROJECT_STATUS_COLORS } from "./theme";
import { invoke, isTauri } from "./lib/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { useSettings } from "./hooks/useSettings";
import { useWindowSync } from "./hooks/useWindowSync";
import { useWindowResize } from "./hooks/useWindowResize";
import { useGitHubSync } from "./hooks/useGitHubSync";
import { fetchRepoData } from "./lib/github";
import { totalDaysInMonth, totalDaysInQuarter, totalDaysInYear, periodElapsedFraction, daysLeftInWeek, daysLeftInMonth, daysLeftInQuarter, daysLeftInYear, calcLastNDays } from "./lib/datePeriods";
import { calcIntentionStreak, calcIntentionWeek, calcIntentionWeekTrend, calcIntentionDoneNotify, calcMorningIntentionReminder, calcIntentionEveningReminder, calcIntentionDoneStreak, calcWeeklyIntentionReport, calcMonthlyIntentionReport, calcQuarterlyIntentionReport, calcYearlyIntentionReport, calcDayOfWeekIntentionDoneRate, calcWeakIntentionDay, calcBestIntentionDay, calcIntentionMonthDoneRate, calcIntentionMomentumCorrelation, calcIntentionConsecutiveMiss } from "./lib/intention";
import { calcHabitsWeekRate, calcHabitsWeekTrend, calcHabitsBadge, calcPerfectDayStreak, calcEveningHabitReminder, calcHabitMilestoneApproachNotify, calcWeeklyReviewReminder, calcPerfectDayMilestoneNotify, calcWeeklyHabitReport, calcMonthlyHabitReport, calcQuarterlyHabitReport, calcQuarterlyPerfectDayReport, calcYearlyHabitReport, calcYearlyPerfectDayReport, calcWeeklyPerfectDayReport, calcMonthlyPerfectDayReport, calcDayOfWeekHabitRates, calcWeakDayOfWeek, calcBestDayOfWeek, calcHabitMorningReminder, calcHabitMomentumCorrelation } from "./lib/habits";
import { isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, calcGoalSuccessRate, calcLastNWeeks, calcWeekGoalHeatmap, calcLastNMonths, calcMonthGoalHeatmap, calcLastNQuarters, calcQuarterGoalHeatmap, calcLastNYears, calcYearGoalHeatmap, calcMonthlyGoalReminder, calcQuarterlyGoalReminder, calcYearlyGoalReminder, calcGoalCompletionNotify, calcWeeklyGoalMorningReminder, calcMonthlyGoalMorningReminder, calcQuarterlyGoalMorningReminder, calcYearlyGoalMorningReminder, calcWeeklyGoalReport, calcMonthlyGoalReport, calcQuarterlyGoalReport, calcYearlyGoalReport } from "./lib/goalPeriods";
import { calcGoalExpiry } from "./lib/goalExpiry";
import { calcDirectionBadge } from "./lib/direction";
import { calcProjectsBadge, calcProjectMilestone, calcProjectCompletionNotify, calcProjectPomodoroMilestone } from "./lib/projects";
import { calcTodaySessionCount, updatePomodoroHistory, calcPomodoroMorningReminder, calcPomodoroEveningReminder, calcPomodoroLifetimeMilestone, calcWeeklyPomodoroReport, calcMonthlyPomodoroReport, calcQuarterlyPomodoroReport, calcYearlyPomodoroReport, calcPomodoroGoalStreak, calcFocusStreak, calcPomodoroRecentAvg, calcPomodoroWeekRecord, calcDayOfWeekPomodoroAvg, calcWeakPomodoroDay, calcBestPomodoroDay, calcPomodoroWeekGoalDays, calcPomodoroMomentumCorrelation, calcFocusDroughtDays } from "./lib/pomodoro";
import { calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumEveningDigest, calcMomentumMorningReminder, calcWeeklyMomentumReport, calcMonthlyMomentumReport, calcQuarterlyMomentumReport, calcYearlyMomentumReport, calcDayOfWeekMomentumAvg, calcWeakMomentumDay, calcBestMomentumDay } from "./lib/momentum";
import { calcTodayInsight } from "./lib/insight";
import { Clock } from "./components/Clock";
import { DragBar } from "./components/DragBar";
import { SectionLabel } from "./components/SectionLabel";
import { ProjectList } from "./components/ProjectList";
import { HabitStreak } from "./components/HabitStreak";
import { QuoteRotator } from "./components/QuoteRotator";
import { InlineEdit } from "./components/InlineEdit";
import { SettingsPanel } from "./components/SettingsPanel";
import { PomodoroTimer } from "./components/PomodoroTimer";

// ─── Default Data ───────────────────────────────────────
const DEFAULT_DATA: WidgetData = {
  projects: [
    { id: 1, name: "PolicyVote", status: "active", goal: "SEO 100페이지 인덱싱", progress: 35, metric: "월간 방문자", metric_value: "42", metric_target: "100" },
    { id: 2, name: "TacGear", status: "active", goal: "플래시라이트 비교 페이지 완성", progress: 20, metric: "월 수익", metric_value: "₩0", metric_target: "₩300K" },
    { id: 3, name: "CLMS", status: "in-progress", goal: "Figma 문서 시스템 완성", progress: 60, metric: "스크린", metric_value: "24", metric_target: "40" },
  ],
  habits: [
    { id: crypto.randomUUID(), name: "푸시업", streak: 12, icon: "💪" },
    { id: crypto.randomUUID(), name: "풀업", streak: 8, icon: "🏋️" },
    { id: crypto.randomUUID(), name: "폰 사용↓", streak: 5, icon: "📵" },
    { id: crypto.randomUUID(), name: "포모도로", streak: 3, icon: "🍅" },
  ],
  quotes: [
    "Design so it cannot fail fatally, then execute.",
    "시스템이 행동을 만든다. 의지력이 아니라.",
    "Ship small, get feedback, adjust.",
    "완벽보다 실행. 실행보다 피드백.",
    "What do we lose by waiting?",
  ],
  // Pomodoro panel starts collapsed by default to keep the widget compact
  collapsedSections: ["pomodoro"],
};

const DEFAULT_SECTION_ORDER: SectionKey[] = ["projects", "streaks", "pomodoro", "direction"];

// ─── Styles ─────────────────────────────────────────────
const s = {
  container: {
    width: "100%",
    // overflow:hidden clips child backgrounds to border-radius corners.
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    borderRadius: radius.container,
    border: `1px solid ${colors.borderSubtle}`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: shadows.container,
  } as CSSProperties,

  content: {
    padding: "0 24px 28px",
  } as CSSProperties,

  mono: { fontFamily: fonts.mono } as CSSProperties,
};

// ─── App ────────────────────────────────────────────────
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WidgetData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWeekGoalHistory, setShowWeekGoalHistory] = useState(false);
  const [showMonthGoalHistory, setShowMonthGoalHistory] = useState(false);
  const [showQuarterGoalHistory, setShowQuarterGoalHistory] = useState(false);
  const [showYearGoalHistory, setShowYearGoalHistory] = useState(false);
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings();
  const [hiddenSections, setHiddenSections] = useState<SectionKey[]>([]);

  useWindowSync({
    settings,
    settingsLoaded,
    onPositionSave: (x, y) => updateSettings({ position: { x, y } }),
  });
  useWindowResize(containerRef, settings.size.width ?? 380);

  // Restore always-on-top once after settings load
  useEffect(() => {
    if (!settingsLoaded || !isTauri()) return;
    getCurrentWindow().setAlwaysOnTop(settings.pinned ?? false).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]); // intentionally runs once — DragBar togglePin handles live changes

  useEffect(() => {
    (async () => {
      try {
        const saved = await invoke<WidgetData>("load_data");
        if (saved) {
          const now = new Date();
          const todayStr = now.toLocaleDateString("sv"); // YYYY-MM-DD local
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString("sv");
          // Reset streaks for habits checked before yesterday (user missed at least one full day)
          const savedHabits = saved.habits ?? [];
          let hadExpired = false;
          let needsIdMigration = false;
          const reset = savedHabits.map(h => {
            // Assign stable UUID to habits saved before the id field was introduced
            const withId = h.id ? h : { ...h, id: crypto.randomUUID() };
            if (!h.id) needsIdMigration = true;
            if (withId.lastChecked && withId.lastChecked < yesterdayStr) {
              hadExpired = true;
              return { ...withId, streak: 0, lastChecked: undefined };
            }
            return withId;
          });
          // Detect stale goals and build log-before-clear history patches.
          // calcGoalExpiry encapsulates all five period checks + history-patch logic (see src/lib/goalExpiry.ts).
          const { intentionStale, weekGoalStale, monthGoalStale, quarterGoalStale, yearGoalStale, historyPatch: goalHistoryPatch } = calcGoalExpiry(saved, now);
          const needsSave = hadExpired || needsIdMigration || intentionStale || weekGoalStale || monthGoalStale || quarterGoalStale || yearGoalStale;
          const resolvedData = needsSave ? {
            ...saved,
            habits: reset,
            ...goalHistoryPatch,
            ...(intentionStale ? { todayIntention: undefined, todayIntentionDate: undefined, todayIntentionDone: undefined } : {}),
            ...(weekGoalStale ? { weekGoal: undefined, weekGoalDate: undefined, weekGoalDone: undefined } : {}),
            ...(monthGoalStale ? { monthGoal: undefined, monthGoalDate: undefined, monthGoalDone: undefined } : {}),
            ...(quarterGoalStale ? { quarterGoal: undefined, quarterGoalDate: undefined, quarterGoalDone: undefined } : {}),
            ...(yearGoalStale ? { yearGoal: undefined, yearGoalDate: undefined, yearGoalDone: undefined } : {}),
          } : saved;
          setData(resolvedData);
          if (resolvedData.hiddenSections !== undefined) setHiddenSections(resolvedData.hiddenSections);
          if (needsSave) await invoke("save_data", { data: resolvedData });
        }
      } finally {
        setTimeout(() => setLoaded(true), 100);
      }
    })();
  }, []);

  // Mirror current data in a ref so interval callbacks always see the latest state (avoids stale closure)
  const dataRef = useRef(data);
  dataRef.current = data;
  const hiddenSectionsRef = useRef(hiddenSections);
  hiddenSectionsRef.current = hiddenSections;

  const persist = useCallback(async (next: WidgetData) => {
    const withHidden: WidgetData = next.hiddenSections !== undefined
      ? next
      : { ...next, hiddenSections: hiddenSectionsRef.current };
    setData(withHidden);
    await invoke("save_data", { data: withHidden });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateHabit = useCallback((i: number, patch: Partial<Habit>) => {
    const snapshot = dataRef.current;
    const today = new Date().toLocaleDateString("sv");
    const oldHabit = snapshot.habits[i];
    // Detect new check-in (lastChecked set to today) vs undo (lastChecked cleared from today).
    const isNewCheckIn = patch.lastChecked !== undefined && patch.lastChecked === today && oldHabit.lastChecked !== today;
    const isUndoCheckIn = "lastChecked" in patch && patch.lastChecked === undefined && oldHabit.lastChecked === today;
    const lifetimeDelta = isNewCheckIn ? 1 : isUndoCheckIn ? -1 : 0;
    const next = {
      ...snapshot,
      habits: snapshot.habits.map((h, idx) => idx === i ? { ...h, ...patch } : h),
      ...(lifetimeDelta !== 0 ? { habitLifetimeTotalCheckins: Math.max(0, (snapshot.habitLifetimeTotalCheckins ?? 0) + lifetimeDelta) } : {}),
    };
    persist(next);
  }, [persist]);

  const updateProject = useCallback((id: number, patch: Partial<Project>) => {
    const snapshot = dataRef.current;
    const prev = snapshot.projects.find(p => p.id === id);
    const next = { ...snapshot, projects: snapshot.projects.map(p =>
      p.id === id ? { ...p, ...patch } : p
    )};
    persist(next);
    // Notify on progress milestone and/or project completion in a single permission-check block.
    // Both can fire in the same update (e.g. progress=100 + status="done" simultaneously) — this is
    // intentional: milestone celebrates the numerical achievement; completion celebrates the deliberate decision.
    if (prev !== undefined) {
      const ms = (typeof prev.progress === "number" && patch.progress !== undefined)
        ? calcProjectMilestone(prev.progress, patch.progress)
        : null;
      const completionMsg = patch.status !== undefined
        ? calcProjectCompletionNotify(prev.status, patch.status, prev.name)
        : null;
      if (ms || completionMsg) {
        (async () => {
          try {
            let ok = await isPermissionGranted();
            if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
            if (!ok) return;
            if (ms) sendNotification({ title: "Vision Widget", body: `${ms.label} ${prev.name}` });
            if (completionMsg) sendNotification({ title: "Vision Widget", body: completionMsg });
          } catch { /* not available in browser dev mode */ }
        })();
      }
    }
  }, [persist]);

  // Atomic batch update for GitHub polling — applies all results in one persist
  // to avoid the stale-closure overwrite race when multiple projects complete in parallel.
  // Also detects new commits/PRs/issues vs previous snapshot and sends desktop notifications.
  const batchUpdateProjects = useCallback((updates: Array<{ id: number; patch: Partial<Project> }>) => {
    if (updates.length === 0) return;
    const snapshot = dataRef.current;
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        for (const update of updates) {
          if (!update.patch.githubData) continue;
          const old = snapshot.projects.find(p => p.id === update.id);
          if (!old?.githubData) continue;
          const prev = old.githubData;
          const fresh = update.patch.githubData;
          const name = old.name ?? `#${update.id}`;
          if (fresh.lastCommitAt && prev.lastCommitAt && fresh.lastCommitAt > prev.lastCommitAt) {
            sendNotification({ title: "Vision Widget", body: `${name}: 새 커밋이 추가됐습니다.` });
          }
          if (typeof fresh.openPrs === "number" && typeof prev.openPrs === "number" && fresh.openPrs > prev.openPrs) {
            sendNotification({ title: "Vision Widget", body: `${name}: PR ${fresh.openPrs - prev.openPrs}개 추가됐습니다.` });
          }
          if (typeof fresh.openIssues === "number" && typeof prev.openIssues === "number" && fresh.openIssues > prev.openIssues) {
            sendNotification({ title: "Vision Widget", body: `${name}: 이슈 ${fresh.openIssues - prev.openIssues}개 추가됐습니다.` });
          }
        }
      } catch { /* not available in browser dev mode */ }
    })();
    const next = {
      ...snapshot,
      projects: snapshot.projects.map(p => {
        const hit = updates.find(u => u.id === p.id);
        return hit ? { ...p, ...hit.patch } : p;
      }),
    };
    persist(next);
  }, [persist]);

  useGitHubSync(
    data.projects,
    settings.githubPat,
    settings.githubRefreshInterval ?? 10,
    batchUpdateProjects,
  );

  // Resets streaks for habits whose lastChecked has fallen behind yesterday.
  // Also clears todayIntention when the date advances past the day it was set.
  // Runs every minute so a long-running widget corrects expiry without requiring restart.
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("sv");
      const current = dataRef.current;
      const habits = current.habits ?? [];
      let hadExpired = false;
      const reset = habits.map(h => {
        if (h.lastChecked && h.lastChecked < yesterdayStr) {
          hadExpired = true;
          return { ...h, streak: 0, lastChecked: undefined };
        }
        return h;
      });
      // Detect stale goals and build log-before-clear history patches (same pure function as initial load).
      const { intentionStale, weekGoalStale, monthGoalStale, quarterGoalStale, yearGoalStale, historyPatch: goalHistoryPatch } = calcGoalExpiry(current, now);
      if (!hadExpired && !intentionStale && !weekGoalStale && !monthGoalStale && !quarterGoalStale && !yearGoalStale) return;
      await persist({
        ...current,
        habits: reset,
        ...goalHistoryPatch,
        ...(intentionStale ? { todayIntention: undefined, todayIntentionDate: undefined, todayIntentionDone: undefined } : {}),
        ...(weekGoalStale ? { weekGoal: undefined, weekGoalDate: undefined, weekGoalDone: undefined } : {}),
        ...(monthGoalStale ? { monthGoal: undefined, monthGoalDate: undefined, monthGoalDone: undefined } : {}),
        ...(quarterGoalStale ? { quarterGoal: undefined, quarterGoalDate: undefined, quarterGoalDone: undefined } : {}),
        ...(yearGoalStale ? { yearGoal: undefined, yearGoalDate: undefined, yearGoalDone: undefined } : {}),
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [loaded, persist]);

  // Deadline notification — fires once per app startup session when projects with deadline today or overdue exist.
  // sessionStorage guard prevents Strict Mode double-invoke from sending duplicate notifications;
  // setItem is synchronous so it's set before the async IIFE starts, making the guard race-free.
  // Design: [loaded] dependency means this runs once per app launch only — apps running past midnight
  // will not re-notify until restarted (intentional: notification is a startup alert, not a polling alarm).
  useEffect(() => {
    if (!loaded) return;
    if (sessionStorage.getItem("vw_deadline_notified")) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const urgentWithDays = (dataRef.current.projects ?? []).flatMap(p => {
      if (p.status === "done" || !p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return [];
      const ts = new Date(p.deadline + "T00:00:00").getTime();
      if (isNaN(ts)) return []; // guard against invalid dates that pass the regex (e.g. 2024-02-30)
      const days = Math.floor((ts - todayMs) / 86400000);
      return days <= 0 ? [{ name: p.name, days }] : [];
    });
    if (urgentWithDays.length === 0) return;
    sessionStorage.setItem("vw_deadline_notified", "1");
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        const dueToday = urgentWithDays.filter(({ days }) => days === 0).map(({ name }) => name);
        const overdue  = urgentWithDays.filter(({ days }) => days < 0).map(({ name }) => name);
        const lines: string[] = [];
        if (dueToday.length > 0) lines.push(`오늘 마감: ${dueToday.join(", ")}`);
        if (overdue.length > 0)  lines.push(`기한 초과: ${overdue.join(", ")}`);
        sendNotification({ title: "Vision Widget", body: lines.join("\n") });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [loaded]); // only triggers once: loaded transitions false→true once at startup

  const updateHabits = useCallback((habits: Habit[]) => {
    const snapshot = dataRef.current;
    const today = new Date().toLocaleDateString("sv");
    // Count net new check-ins in this batch (positive = check-in, negative = unlikely but safe).
    const prevDoneCount = (snapshot.habits ?? []).filter(h => h.lastChecked === today).length;
    const newDoneCount = habits.filter(h => h.lastChecked === today).length;
    const delta = newDoneCount - prevDoneCount;
    // Only increment — never decrement. Habit deletion may produce delta < 0 (a checked habit was
    // removed), but a lifetime achievement counter must not be reduced by removing a habit.
    const patch = delta > 0
      ? { habitLifetimeTotalCheckins: (snapshot.habitLifetimeTotalCheckins ?? 0) + delta }
      : {};
    persist({ ...snapshot, habits, ...patch });
  }, [persist]);

  // Sends a desktop notification when a habit streak crosses a milestone (7, 30, 100 days).
  // Uses the same permission-request pattern as the deadline notification.
  // Empty deps: no external state referenced — function is pure aside from async Tauri calls.
  const handleHabitMilestone = useCallback(async (habitName: string, streak: number, badge: string) => {
    try {
      let ok = await isPermissionGranted();
      if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
      if (!ok) return;
      sendNotification({ title: "Vision Widget", body: `${badge} ${habitName} ${streak}일 달성!` });
    } catch { /* not available in browser dev mode */ }
  }, []);

  // Sends a desktop notification when all habits are checked in for the day.
  // habitsAllDoneDate persists the notification date so it fires once per day regardless of
  // app restarts. The guard `data.habitsAllDoneDate === today` prevents re-firing: persist()
  // calls setData() as its first statement, scheduling a re-render before the async invoke;
  // by the next render cycle when this effect re-fires, data.habitsAllDoneDate is today.
  // habitsAllDoneDate is NOT cleared in the midnight reset interval because it auto-expires:
  // the date comparison `=== today` naturally fails on the next day without explicit clearing.
  useEffect(() => {
    if (!loaded) return;
    const today = new Date().toLocaleDateString("sv");
    const habits = data.habits ?? [];
    if (habits.length === 0) return;
    if (data.habitsAllDoneDate === today) return; // already notified today
    const allDone = habits.every(h => h.lastChecked === today);
    if (!allDone) return;
    // Recompute perfect-day streak from data.habits (same source as render-scope habitsPerfectStreak).
    // calcCheckInPatch always updates checkHistory alongside lastChecked, so the allDone guard above
    // implies today is present in every habit's checkHistory — perfectStreak reflects the full streak.
    // Uses 101-day window (same as render-scope habitsPerfectStreak) so that 30/50/100-day milestones fire.
    const last101 = calcLastNDays(today, 101);
    const perfectStreak = calcPerfectDayStreak(habits, last101);
    // Update all-time best alongside habitsAllDoneDate in one persist call to avoid a second write.
    const bestStreak = Math.max(perfectStreak, dataRef.current.perfectDayBestStreak ?? 0);
    persist({ ...dataRef.current, habitsAllDoneDate: today, perfectDayBestStreak: bestStreak });
    const milestoneMsg = calcPerfectDayMilestoneNotify(perfectStreak);
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: `✓ 오늘의 습관 ${habits.length}개 모두 완료!` });
        // Separate milestone notification when the perfect-day streak hits 7/14/30/50/100 days.
        if (milestoneMsg) sendNotification({ title: "Vision Widget", body: milestoneMsg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.habitsAllDoneDate, loaded, persist]);

  // Evening habit reminder — fires once per calendar day after 18:00 whenever habit state changes or the app loads.
  // Covers habits with no streak yet (not caught by at-risk which requires lastChecked === yesterday).
  // habitEveningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as habitsAllDoneDate) — if permission is
  // denied, the reminder is skipped for the day, which is preferable to spamming on every reload.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.habitEveningRemindDate === today) return;
    if (now.getHours() < 18) return;
    const habits = data.habits ?? [];
    const reminder = calcEveningHabitReminder(habits, today);
    if (!reminder) return;
    persist({ ...dataRef.current, habitEveningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: `🌙 미완료 습관 ${reminder.uncheckedCount}개: ${reminder.uncheckedNames.join(", ")}` });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.habitEveningRemindDate, loaded, persist]);

  // Morning habit activation nudge — fires once per calendar day at 9:00+ when habits are present and none checked today.
  // habitMorningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as habitEveningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.habitMorningRemindDate === today) return;
    if (now.getHours() < 9) return;
    const habits = data.habits ?? [];
    const msg = calcHabitMorningReminder(habits, today);
    if (!msg) return;
    persist({ ...dataRef.current, habitMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.habitMorningRemindDate, loaded, persist]);

  // Morning intention reminder — fires once per calendar day at 09:00+ when today's intention is not yet set.
  // intentionMorningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as habitEveningRemindDate) to prevent duplicates
  // even when permission is denied.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.intentionMorningRemindDate === today) return;
    if (now.getHours() < 9) return;
    const msg = calcMorningIntentionReminder(data.todayIntention);
    if (!msg) return;
    persist({ ...dataRef.current, intentionMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.todayIntention, data.intentionMorningRemindDate, loaded, persist]);

  // Evening intention done-check reminder — fires once per calendar day at 18:00+ when intention is set today but not yet done.
  // intentionEveningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Once-per-day is intentional: if user marks done after the notification fires, that is fine (done→null path).
  // If user does done→undone cycle after 18:00 the guard is already spent — same deliberate design as habitEveningRemindDate.
  // Design: date is persisted before the async send (same pattern as habitEveningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.intentionEveningRemindDate === today) return;
    if (now.getHours() < 18) return;
    const msg = calcIntentionEveningReminder(data.todayIntention, data.todayIntentionDone, data.todayIntentionDate, today);
    if (!msg) return;
    persist({ ...dataRef.current, intentionEveningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.todayIntention, data.todayIntentionDone, data.todayIntentionDate, data.intentionEveningRemindDate, loaded, persist]);

  // Morning pomodoro start nudge — fires once per calendar day at 10:00+ when no sessions completed today.
  // pomodoroMorningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as intentionMorningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.pomodoroMorningRemindDate === today) return;
    if (now.getHours() < 10) return;
    const sessionsToday = data.pomodoroSessionsDate === today ? (data.pomodoroSessions ?? 0) : 0;
    const msg = calcPomodoroMorningReminder(sessionsToday);
    if (!msg) return;
    persist({ ...dataRef.current, pomodoroMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.pomodoroSessionsDate, data.pomodoroSessions, data.pomodoroMorningRemindDate, loaded, persist]);

  // pomodoroEveningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Fires after 17:00 when the user has not yet met their daily session goal (or has 0 sessions when no goal set).
  // Design: date is persisted before the async send (same pattern as pomodoroMorningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.pomodoroEveningRemindDate === today) return;
    if (now.getHours() < 17) return;
    const sessionsToday = data.pomodoroSessionsDate === today ? (data.pomodoroSessions ?? 0) : 0;
    const msg = calcPomodoroEveningReminder(sessionsToday, data.pomodoroSessionGoal);
    if (!msg) return;
    persist({ ...dataRef.current, pomodoroEveningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.pomodoroSessionsDate, data.pomodoroSessions, data.pomodoroSessionGoal, data.pomodoroEveningRemindDate, loaded, persist]);

  // Habit milestone approach nudge — fires once per calendar day at 09:00+ (same window as intention reminder)
  // when any habit is within 3 days of its next streak milestone (7🔥/30⭐/100💎).
  // habitMilestoneApproachDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as intentionMorningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.habitMilestoneApproachDate === today) return;
    if (now.getHours() < 9) return;
    const approaching = calcHabitMilestoneApproachNotify(data.habits ?? []);
    if (approaching.length === 0) return;
    persist({ ...dataRef.current, habitMilestoneApproachDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        for (const { name, daysLeft, badge } of approaching) {
          sendNotification({ title: "Vision Widget", body: `${badge} ${name} — 마일스톤까지 ${daysLeft}일!` });
        }
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.habitMilestoneApproachDate, loaded, persist]);

  // Weekly review nudge — fires on Sunday after 18:00, once per Sunday calendar day.
  // weeklyReviewRemindDate persists the guard so it fires only once per Sunday even after restart.
  // Design: date is persisted before the async send (same pattern as habitMilestoneApproachDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyReviewRemindDate === today) return;
    if (now.getDay() !== 0) return;       // only Sunday (0 = Sunday in JS)
    if (now.getHours() < 18) return;      // after 18:00
    persist({ ...dataRef.current, weeklyReviewRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        const msg = calcWeeklyReviewReminder(data.weekGoal, data.weekGoalDone);
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.weekGoal, data.weekGoalDone, data.weeklyReviewRemindDate, loaded, persist]);

  // Monday morning weekly goal-setting nudge — fires once per Monday at 9:00+ when weekly goal is not yet set.
  // Triggers only when weekGoalDate ≠ currentWeekStr (goal stale or absent); null return = already set, no nudge.
  // weeklyGoalMorningRemindDate persists the guard so it fires only once per Monday even after restart.
  // Design: date is persisted before the async send (same pattern as weeklyReviewRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyGoalMorningRemindDate === today) return;
    if (now.getDay() !== 1) return;       // only Monday (1 = Monday in JS)
    if (now.getHours() < 9) return;       // after 09:00
    const msg = calcWeeklyGoalMorningReminder(data.weekGoalDate, isoWeekStr(now));
    if (!msg) return;
    persist({ ...dataRef.current, weeklyGoalMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.weekGoalDate, data.weeklyGoalMorningRemindDate, loaded, persist]);

  // 1st-of-month morning monthly goal-setting nudge — fires once per month-1st at 9:00+ when monthly goal is not yet set.
  // Triggers only when monthGoalDate ≠ currentMonthStr (goal stale or absent); null return = already set, no nudge needed.
  // monthlyGoalMorningRemindDate persists the guard so it fires only once per month-1st even after restart.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyGoalMorningRemindDate === today) return;
    if (now.getDate() !== 1) return;      // only 1st of month
    if (now.getHours() < 9) return;       // after 09:00
    const currentMonthStr = today.slice(0, 7); // "YYYY-MM"
    const msg = calcMonthlyGoalMorningReminder(data.monthGoalDate, currentMonthStr);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyGoalMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.monthGoalDate, data.monthlyGoalMorningRemindDate, loaded, persist]);

  // Quarter-start morning quarterly goal-setting nudge — fires once per quarter-start at 9:00+ when quarterly goal is not yet set.
  // Triggers only when quarterGoalDate ≠ currentQuarterStr (goal stale or absent); null return = already set, no nudge needed.
  // quarterlyGoalMorningRemindDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyGoalMorningRemindDate === today) return;
    if (now.getHours() < 9) return;       // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const currentQuarterStr = quarterStr(now);
    const msg = calcQuarterlyGoalMorningReminder(data.quarterGoalDate, currentQuarterStr);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyGoalMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.quarterGoalDate, data.quarterlyGoalMorningRemindDate, loaded, persist]);

  // New Year's Day morning yearly goal-setting nudge — fires once per Jan 1 at 9:00+ when yearly goal is not yet set.
  // Triggers only when yearGoalDate ≠ currentYearStr (goal stale or absent); null return = already set, no nudge needed.
  // yearlyGoalMorningRemindDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyGoalMorningRemindDate === today) return;
    if (now.getHours() < 9) return;       // after 09:00
    // Year starts on Jan 1
    if (!(now.getMonth() === 0 && now.getDate() === 1)) return;
    const currentYearStr = String(now.getFullYear());
    const msg = calcYearlyGoalMorningReminder(data.yearGoalDate, currentYearStr);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyGoalMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.yearGoalDate, data.yearlyGoalMorningRemindDate, loaded, persist]);

  // Monday morning weekly habit completion rate report — fires once per Monday at 9:00+.
  // Reports the previous week's (7 days ending yesterday) average daily habit completion rate.
  // weeklyHabitReportDate persists the guard so it fires only once per Monday even after restart.
  // Design: yesterday-ending window avoids including today's (incomplete) check-ins in last week's stats.
  // Design: date is persisted before the async send (same pattern as weeklyGoalMorningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyHabitReportDate === today) return;
    if (now.getDay() !== 1) return;   // only Monday (1 = Monday in JS)
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7 = calcLastNDays(yesterday.toLocaleDateString("sv"), 7);
    const msg = calcWeeklyHabitReport(data.habits ?? [], last7);
    if (!msg) return;
    persist({ ...dataRef.current, weeklyHabitReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.weeklyHabitReportDate, loaded, persist]);

  // 1st-of-month morning monthly habit completion rate report — fires once per month at 9:00+.
  // Reports the previous calendar month's average daily habit completion rate.
  // monthlyHabitReportDate persists the guard so it fires only once per month-1st even after restart.
  // Design: yesterday-ending window spans the full previous calendar month.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyHabitReportDate === today) return;
    if (now.getDate() !== 1) return;  // only 1st of month
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    // Use yesterday.getDate() (= last day of prev month = total days in prev month)
    // so the window covers exactly all calendar days of the previous month (e.g. 31 for Dec, 28/29 for Feb).
    // A fixed 30-day window would miss the 1st of months with more than 30 days.
    const prevMonthDays = calcLastNDays(yesterday.toLocaleDateString("sv"), yesterday.getDate());
    const msg = calcMonthlyHabitReport(data.habits ?? [], prevMonthDays);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyHabitReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.monthlyHabitReportDate, loaded, persist]);

  // Monday morning weekly perfect-day count retrospective — fires once per Monday at 9:00+.
  // Reports the previous 7-day window's count of "perfect days" (all habits checked on that day).
  // Complements calcWeeklyHabitReport (average rate per habit) with a full-portfolio completion signal.
  // weeklyPerfectDayReportDate persists the guard so it fires only once per Monday even after restart.
  // Design: yesterday-ending 7-day window avoids including today's (incomplete) check-ins.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyPerfectDayReportDate === today) return;
    if (now.getDay() !== 1) return;   // only Monday (1 = Monday in JS)
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7 = calcLastNDays(yesterday.toLocaleDateString("sv"), 7);
    const msg = calcWeeklyPerfectDayReport(data.habits ?? [], last7);
    if (!msg) return;
    persist({ ...dataRef.current, weeklyPerfectDayReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.weeklyPerfectDayReportDate, loaded, persist]);

  // 1st-of-month morning monthly perfect-day count retrospective — fires once per month at 9:00+.
  // Reports the previous calendar month's count of "perfect days" (all habits checked on that day).
  // Complements calcMonthlyHabitReport (average rate per habit) with a full-portfolio completion signal.
  // monthlyPerfectDayReportDate persists the guard so it fires only once per month-1st even after restart.
  // Design: yesterday-ending window spans the full previous calendar month.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyPerfectDayReportDate === today) return;
    if (now.getDate() !== 1) return;  // only 1st of month
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    // yesterday.getDate() = last calendar day of the previous month = total days in that month
    // (e.g. Jan 1 → yesterday = Dec 31 → getDate() = 31). Gives exact previous-month window.
    const prevMonthDays = calcLastNDays(yesterday.toLocaleDateString("sv"), yesterday.getDate());
    const msg = calcMonthlyPerfectDayReport(data.habits ?? [], prevMonthDays);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyPerfectDayReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.monthlyPerfectDayReportDate, loaded, persist]);

  // Quarter-start morning quarterly habit completion rate retrospective — fires once per quarter at 9:00+.
  // Reports the previous calendar quarter's average daily habit completion rate.
  // quarterlyHabitReportDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: totalDaysInQuarter(yesterday) gives the exact length of the previous quarter (90–92 days).
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyHabitReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevQtrDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInQuarter(yesterday));
    const msg = calcQuarterlyHabitReport(data.habits ?? [], prevQtrDays);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyHabitReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.quarterlyHabitReportDate, loaded, persist]);

  // New Year's morning yearly habit completion rate retrospective — fires once per year on Jan 1 at 9:00+.
  // Reports the previous calendar year's average daily habit completion rate across all habits.
  // yearlyHabitReportDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: totalDaysInYear(yesterday) gives the exact length of the previous year (365 or 366 in leap years).
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyHabitReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;  // only Jan 1
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevYearDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInYear(yesterday));
    const msg = calcYearlyHabitReport(data.habits ?? [], prevYearDays);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyHabitReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.yearlyHabitReportDate, loaded, persist]);

  // Quarter-start morning quarterly perfect-day count retrospective — fires once per quarter at 9:00+.
  // Reports the previous calendar quarter's count of "perfect days" (all habits checked).
  // Complements calcQuarterlyHabitReport (average rate per habit) with a full-portfolio signal.
  // quarterlyPerfectDayReportDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: totalDaysInQuarter(yesterday) gives the exact length of the previous quarter (90–92 days).
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyPerfectDayReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevQtrDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInQuarter(yesterday));
    const msg = calcQuarterlyPerfectDayReport(data.habits ?? [], prevQtrDays);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyPerfectDayReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.quarterlyPerfectDayReportDate, loaded, persist]);

  // New Year's morning yearly perfect-day count retrospective — fires once per year on Jan 1 at 9:00+.
  // Reports the previous calendar year's count of "perfect days" (all habits checked).
  // Complements calcYearlyHabitReport (average rate per habit) with a full-portfolio signal.
  // yearlyPerfectDayReportDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: totalDaysInYear(yesterday) gives the exact length of the previous year (365 or 366 days).
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyPerfectDayReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;  // only Jan 1
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevYearDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInYear(yesterday));
    const msg = calcYearlyPerfectDayReport(data.habits ?? [], prevYearDays);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyPerfectDayReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.yearlyPerfectDayReportDate, loaded, persist]);

  // 1st-of-month morning monthly pomodoro total session count report — fires once per month at 9:00+.
  // Reports the previous month's total sessions and active-day count.
  // monthlyPomodoroReportDate persists the guard so it fires only once per month-1st even after restart.
  // Design: yesterday-ending window spans the full previous calendar month.
  //   pomodoroHistory is capped at 35 days — covers all calendar months (28–31 days) completely.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyPomodoroReportDate === today) return;
    if (now.getDate() !== 1) return;  // only 1st of month
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    // Use yesterday.getDate() (= last day of prev month = total days in prev month)
    // to build a window spanning the full previous calendar month (e.g. 31 for Dec, 28/29 for Feb).
    const prevMonthDays = calcLastNDays(yesterday.toLocaleDateString("sv"), yesterday.getDate());
    const msg = calcMonthlyPomodoroReport(data.pomodoroHistory ?? [], prevMonthDays);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyPomodoroReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.pomodoroHistory, data.monthlyPomodoroReportDate, loaded, persist]);

  // Quarter-start morning quarterly pomodoro total session count report — fires once per quarter at 9:00+.
  // Reports the previous calendar quarter's total sessions and active-day count.
  // quarterlyPomodoroReportDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: pomodoroHistory is capped at 35 days, so only the last ≤35 days of the quarter will match.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyPomodoroReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevQtrDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInQuarter(yesterday));
    const msg = calcQuarterlyPomodoroReport(data.pomodoroHistory ?? [], prevQtrDays);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyPomodoroReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.pomodoroHistory, data.quarterlyPomodoroReportDate, loaded, persist]);

  // New Year's morning yearly pomodoro total session count retrospective — fires once per year on Jan 1 at 9:00+.
  // Reports the previous calendar year's total sessions and active-day count.
  // yearlyPomodoroReportDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: pomodoroHistory is capped at 35 days, so only the last ≤35 days of the year will match.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyPomodoroReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;  // only Jan 1
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevYearDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInYear(yesterday));
    const msg = calcYearlyPomodoroReport(data.pomodoroHistory ?? [], prevYearDays);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyPomodoroReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.pomodoroHistory, data.yearlyPomodoroReportDate, loaded, persist]);

  // Monday morning weekly momentum avg + tier distribution report — fires once per Monday at 9:00+.
  // Reports the previous week's (7 days ending yesterday, Mon–Sun) average score and tier breakdown.
  // weeklyMomentumReportDate persists the guard so it fires only once per Monday even after restart.
  // Design: yesterday-ending window mirrors calcWeeklyHabitReport to exclude today's live (incomplete) score.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyMomentumReportDate === today) return;
    if (now.getDay() !== 1) return;   // only Monday (1 = Monday in JS)
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7 = calcLastNDays(yesterday.toLocaleDateString("sv"), 7);
    const msg = calcWeeklyMomentumReport(data.momentumHistory ?? [], last7);
    if (!msg) return;
    persist({ ...dataRef.current, weeklyMomentumReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.momentumHistory, data.weeklyMomentumReportDate, loaded, persist]);

  // 1st-of-month morning monthly momentum avg + tier distribution report — fires once per month-1st at 9:00+.
  // Reports the previous calendar month's average score and tier breakdown (requires ≥10 entries in the window).
  // monthlyMomentumReportDate persists the guard so it fires only once per month-1st even after restart.
  // Design: yesterday-ending window (= last day of prev month) covers all calendar days of the previous month.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyMomentumReportDate === today) return;
    if (now.getDate() !== 1) return;  // only 1st of month
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    // yesterday.getDate() = last day of prev month = total days in prev month (28–31)
    const prevMonthDays = calcLastNDays(yesterday.toLocaleDateString("sv"), yesterday.getDate());
    const msg = calcMonthlyMomentumReport(data.momentumHistory ?? [], prevMonthDays);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyMomentumReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.momentumHistory, data.monthlyMomentumReportDate, loaded, persist]);

  // Quarter-start morning quarterly momentum avg + tier distribution report — fires once per quarter-start at 9:00+.
  // Reports the previous quarter's average score and tier breakdown (requires ≥10 entries in the window).
  // quarterlyMomentumReportDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: momentumHistory is capped at 31 days, so only the last ≤31 days of the quarter will match.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyMomentumReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevQtrDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInQuarter(yesterday));
    const msg = calcQuarterlyMomentumReport(data.momentumHistory ?? [], prevQtrDays);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyMomentumReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.momentumHistory, data.quarterlyMomentumReportDate, loaded, persist]);

  // New Year's morning yearly momentum avg + tier distribution report — fires once per year on Jan 1 at 9:00+.
  // Reports the previous calendar year's average momentum score and tier breakdown (requires ≥10 entries in the window).
  // yearlyMomentumReportDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: momentumHistory is capped at 31 days, so only the last ≤31 days of the year will match.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyMomentumReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;  // only Jan 1
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevYearDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInYear(yesterday));
    const msg = calcYearlyMomentumReport(data.momentumHistory ?? [], prevYearDays);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyMomentumReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.momentumHistory, data.yearlyMomentumReportDate, loaded, persist]);

  // Monday morning weekly pomodoro session count report — fires once per Monday at 9:00+.
  // Reports the previous week's (7 days ending yesterday) total session count and active-day count.
  // weeklyPomodoroReportDate persists the guard so it fires only once per Monday even after restart.
  // Design: yesterday-ending window mirrors calcWeeklyHabitReport to exclude today's live (incomplete) sessions.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyPomodoroReportDate === today) return;
    if (now.getDay() !== 1) return;   // only Monday (1 = Monday in JS)
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7 = calcLastNDays(yesterday.toLocaleDateString("sv"), 7);
    const msg = calcWeeklyPomodoroReport(data.pomodoroHistory ?? [], last7);
    if (!msg) return;
    persist({ ...dataRef.current, weeklyPomodoroReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.pomodoroHistory, data.weeklyPomodoroReportDate, loaded, persist]);

  // Monday morning weekly intention done-rate report — fires once per Monday at 9:00+.
  // Reports the previous week's (7 days Mon–Sun ending yesterday) intention done rate.
  // weeklyIntentionReportDate persists the guard so it fires only once per Monday even after restart.
  // Design: yesterday-ending window excludes today's (live) intention state from last week's stats.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyIntentionReportDate === today) return;
    if (now.getDay() !== 1) return;   // only Monday
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7 = calcLastNDays(yesterday.toLocaleDateString("sv"), 7);
    const msg = calcWeeklyIntentionReport(data.intentionHistory ?? [], last7);
    if (!msg) return;
    persist({ ...dataRef.current, weeklyIntentionReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.intentionHistory, data.weeklyIntentionReportDate, loaded, persist]);

  // 1st-of-month morning monthly intention done-rate report — fires once per month at 9:00+.
  // Reports the previous calendar month's intention done rate from intentionHistory.
  // monthlyIntentionReportDate persists the guard so it fires only once per month-1st even after restart.
  // Design: yesterday-ending window spans the full previous calendar month (yesterday.getDate() = total days).
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyIntentionReportDate === today) return;
    if (now.getDate() !== 1) return;  // only 1st of month
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevMonthDays = calcLastNDays(yesterday.toLocaleDateString("sv"), yesterday.getDate());
    const msg = calcMonthlyIntentionReport(data.intentionHistory ?? [], prevMonthDays);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyIntentionReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.intentionHistory, data.monthlyIntentionReportDate, loaded, persist]);

  // Quarter-start morning quarterly intention done-rate report — fires once per quarter at 9:00+.
  // Reports the previous calendar quarter's intention done rate from intentionHistory.
  // quarterlyIntentionReportDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: totalDaysInQuarter(yesterday) gives the exact length of the previous quarter (90–92 days).
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyIntentionReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevQtrDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInQuarter(yesterday));
    const msg = calcQuarterlyIntentionReport(data.intentionHistory ?? [], prevQtrDays);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyIntentionReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.intentionHistory, data.quarterlyIntentionReportDate, loaded, persist]);

  // New Year's morning yearly intention done-rate retrospective — fires once per year on Jan 1 at 9:00+.
  // Reports the previous calendar year's intention done rate from intentionHistory.
  // yearlyIntentionReportDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: totalDaysInYear(yesterday) gives the exact length of the previous year (365 or 366 in leap years).
  // Design: intentionHistory is capped at 35 days, so only the last ≤35 days of prevYearDays will match.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyIntentionReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;  // only Jan 1
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevYearDays = calcLastNDays(yesterday.toLocaleDateString("sv"), totalDaysInYear(yesterday));
    const msg = calcYearlyIntentionReport(data.intentionHistory ?? [], prevYearDays);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyIntentionReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.intentionHistory, data.yearlyIntentionReportDate, loaded, persist]);

  // Monday morning weekly goal achievement retrospective — fires once per Monday at 9:00+.
  // Reports whether the previous ISO week's goal was achieved (done === true) or missed.
  // weeklyGoalReportDate persists the guard so it fires only once per Monday even after restart.
  // Design: isoWeekStr(yesterday) gives the previous ISO week key regardless of year-boundary drift.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.weeklyGoalReportDate === today) return;
    if (now.getDay() !== 1) return;   // only Monday (1 = Monday in JS)
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeekStr = isoWeekStr(yesterday);
    const msg = calcWeeklyGoalReport(lastWeekStr, data.weekGoalHistory ?? []);
    if (!msg) return;
    persist({ ...dataRef.current, weeklyGoalReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.weekGoalHistory, data.weeklyGoalReportDate, loaded, persist]);

  // 1st-of-month morning monthly goal achievement retrospective — fires once per month at 9:00+.
  // Reports whether the previous calendar month's goal was achieved (done === true) or missed.
  // monthlyGoalReportDate persists the guard so it fires only once per month-1st even after restart.
  // Design: yesterday's "YYYY-MM" slice gives the previous month key when firing on the 1st of the month.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthlyGoalReportDate === today) return;
    if (now.getDate() !== 1) return;  // only 1st of month
    if (now.getHours() < 9) return;   // after 09:00
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastMonthStr = yesterday.toLocaleDateString("sv").slice(0, 7); // "YYYY-MM" of prev month
    const msg = calcMonthlyGoalReport(lastMonthStr, data.monthGoalHistory ?? []);
    if (!msg) return;
    persist({ ...dataRef.current, monthlyGoalReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.monthGoalHistory, data.monthlyGoalReportDate, loaded, persist]);

  // Quarter-start morning quarterly goal achievement retrospective — fires once per quarter at 9:00+.
  // Reports whether the previous calendar quarter's goal was achieved (done === true) or missed.
  // quarterlyGoalReportDate persists the guard so it fires only once per quarter-start even after restart.
  // Design: yesterday's quarterStr gives the previous quarter key when firing on the 1st of a new quarter.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterlyGoalReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    // Quarter starts on Jan 1, Apr 1, Jul 1, Oct 1
    const month = now.getMonth() + 1; // 1-based
    if (!((month === 1 || month === 4 || month === 7 || month === 10) && now.getDate() === 1)) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastQuarterStr = quarterStr(yesterday);
    const msg = calcQuarterlyGoalReport(lastQuarterStr, data.quarterGoalHistory ?? []);
    if (!msg) return;
    persist({ ...dataRef.current, quarterlyGoalReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.quarterGoalHistory, data.quarterlyGoalReportDate, loaded, persist]);

  // New Year's morning yearly goal achievement retrospective — fires once per year on Jan 1 at 9:00+.
  // Reports whether the previous calendar year's goal was achieved (done === true) or missed.
  // yearlyGoalReportDate persists the guard so it fires only once per Jan 1 even after restart.
  // Design: yesterday's year string (slice(0,4)) gives the previous year key when firing on Jan 1.
  // Design: date is persisted before the async send (persist-before-send pattern) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearlyGoalReportDate === today) return;
    if (now.getHours() < 9) return;   // after 09:00
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;  // only Jan 1
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastYearStr = yesterday.toLocaleDateString("sv").slice(0, 4); // "YYYY" of prev year
    const msg = calcYearlyGoalReport(lastYearStr, data.yearGoalHistory ?? []);
    if (!msg) return;
    persist({ ...dataRef.current, yearlyGoalReportDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.yearGoalHistory, data.yearlyGoalReportDate, loaded, persist]);

  // End-of-month goal review nudge — fires once per month in the last 2 calendar days at 18:00+.
  // Triggers when monthGoal is set OR when no goal set (generic nudge to plan the next month).
  // monthGoalRemindDate persists the guard so it fires only once per month-end even after restart.
  // Design: date is persisted before the async send (same pattern as weeklyReviewRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.monthGoalRemindDate === today) return;
    if (now.getHours() < 18) return;
    // Last 2 days of the month: daysLeftInMonth ≤ 2
    const todayMidnight = new Date(today + "T00:00:00");
    const lastDayOfMonth = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() + 1, 0).getDate();
    if (todayMidnight.getDate() < lastDayOfMonth - 1) return;
    persist({ ...dataRef.current, monthGoalRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        const msg = calcMonthlyGoalReminder(data.monthGoal, data.monthGoalDone);
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.monthGoal, data.monthGoalDone, data.monthGoalRemindDate, loaded, persist]);

  // End-of-quarter goal review nudge — fires once per quarter in the last 3 calendar days at 18:00+.
  // Triggers when quarterGoal is set OR when no goal set (generic nudge to plan the next quarter).
  // quarterGoalRemindDate persists the guard so it fires only once per quarter-end even after restart.
  // Design: date is persisted before the async send (same pattern as monthGoalRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.quarterGoalRemindDate === today) return;
    if (now.getHours() < 18) return;
    // Last 3 days of the quarter: quarter ends on Mar 31, Jun 30, Sep 30, Dec 31
    const todayMidnight = new Date(today + "T00:00:00");
    const qEndMonth = Math.ceil((todayMidnight.getMonth() + 1) / 3) * 3; // 3, 6, 9, or 12
    const lastDayOfQuarter = new Date(todayMidnight.getFullYear(), qEndMonth, 0).getDate();
    const isLastMonthOfQuarter = todayMidnight.getMonth() + 1 === qEndMonth;
    if (!isLastMonthOfQuarter || todayMidnight.getDate() < lastDayOfQuarter - 2) return;
    persist({ ...dataRef.current, quarterGoalRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        const msg = calcQuarterlyGoalReminder(data.quarterGoal, data.quarterGoalDone);
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.quarterGoal, data.quarterGoalDone, data.quarterGoalRemindDate, loaded, persist]);

  // End-of-year goal review nudge — fires once per year in the last 7 calendar days (Dec 25-31) at 18:00+.
  // Triggers when yearGoal is set OR when no goal set (generic nudge to plan the next year).
  // yearGoalRemindDate persists the guard so it fires only once per year-end even after restart.
  // Design: date is persisted before the async send (same pattern as quarterGoalRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.yearGoalRemindDate === today) return;
    if (now.getHours() < 18) return;
    // Last 7 days of December: lastDayOfYear - 6 through 31 (Dec 25-31)
    const todayMidnight = new Date(today + "T00:00:00");
    const lastDayOfYear = new Date(todayMidnight.getFullYear(), 12, 0).getDate();
    const isDecember = todayMidnight.getMonth() === 11;
    if (!isDecember || todayMidnight.getDate() < lastDayOfYear - 6) return;
    persist({ ...dataRef.current, yearGoalRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        const msg = calcYearlyGoalReminder(data.yearGoal, data.yearGoalDone);
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.yearGoal, data.yearGoalDone, data.yearGoalRemindDate, loaded, persist]);

  // At-risk streak notification — fires once per app startup when habits are about to lose their streak.
  // "At risk" = streak > 0, last checked yesterday (midnight reset will zero the streak if not checked today).
  // sessionStorage guard prevents re-fire on hot-reload / Strict Mode double-invoke; re-evaluates on restart.
  useEffect(() => {
    if (!loaded) return;
    if (sessionStorage.getItem("vw_atrisk_notified")) return;
    const todayStr = new Date().toLocaleDateString("sv");
    const yesterday = new Date(todayStr + "T00:00:00"); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("sv");
    // lastChecked === yesterdayStr implies streak > 0: initial load resets streak to 0 when lastChecked < yesterdayStr
    const atRisk = (dataRef.current.habits ?? []).filter(h => h.lastChecked === yesterdayStr);
    if (atRisk.length === 0) return;
    sessionStorage.setItem("vw_atrisk_notified", "1");
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        const names = atRisk.map(h => h.name).join(", ");
        sendNotification({ title: "Vision Widget", body: `⚠ 스트릭 위험 ${atRisk.length}개: ${names}` });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [loaded]); // only triggers once: loaded transitions false→true once at startup

  const updateProjects = useCallback((projects: Project[]) => {
    persist({ ...dataRef.current, projects });
  }, [persist]);

  const updateQuotes = useCallback((quotes: string[]) => {
    persist({ ...dataRef.current, quotes });
  }, [persist]);

  const updateQuoteInterval = useCallback((quoteInterval: number) => {
    persist({ ...dataRef.current, quoteInterval });
  }, [persist]);

  const updateIntention = useCallback((todayIntention: string) => {
    const snapshot = dataRef.current;
    const intention = todayIntention !== "" ? todayIntention : undefined;
    // Track the date when the intention was last set so midnight reset can clear stale values
    const today = new Date().toLocaleDateString("sv");
    const todayIntentionDate = intention ? today : undefined;
    // Append/update today's entry in rolling 35-day history when setting a non-empty intention.
    // 35 days covers the full previous calendar month (max 31 days) for calcMonthlyIntentionReport.
    // When clearing, leave history unchanged so the last set text is preserved for reflection.
    const history: IntentionEntry[] = snapshot.intentionHistory ?? [];
    // preserve done (single source: todayIntentionDone) when text is unchanged — same contract as below
    const updatedHistory = intention
      ? [...history.filter(e => e.date !== today), {
          date: today, text: intention,
          ...(snapshot.todayIntentionDone && intention === snapshot.todayIntention ? { done: true } : {}),
        }].slice(-35)
      : history.length > 0 ? history : undefined;
    // Clear done when intention is cleared OR when text changes; done is tied to the specific text
    const todayIntentionDone = (intention && intention === snapshot.todayIntention) ? snapshot.todayIntentionDone : undefined;
    persist({ ...snapshot, todayIntention: intention, todayIntentionDate, todayIntentionDone, intentionHistory: updatedHistory });
  }, [persist]);

  const updateIntentionDone = useCallback((done: boolean) => {
    const snapshot = dataRef.current;
    const today = new Date().toLocaleDateString("sv");
    // Persist done state in today's history entry so it survives midnight reset
    const history = snapshot.intentionHistory ?? [];
    let updatedHistory: IntentionEntry[];
    if (history.some(e => e.date === today)) {
      updatedHistory = history.map(e => e.date === today ? { ...e, done: done || undefined } : e);
    } else if (done && snapshot.todayIntention) {
      // today entry absent + done=true: upsert so done survives midnight reset.
      // done=false: skip — no history entry exists, nothing to clear.
      // Apply the same 35-day cap as the setIntention path when appending a new entry.
      updatedHistory = [...history, { date: today, text: snapshot.todayIntention, done: true }].slice(-35);
    } else {
      updatedHistory = history;
    }
    // Only meaningful when an intention exists; false is stored as absent to keep JSON lean
    // Capture prevDone before persist so the false→true transition can be detected below.
    const prevDone = snapshot.todayIntentionDone;
    // Update intentionDoneBestStreak on done=true: max(full-history streak, stored best).
    // calcIntentionDoneStreak is capped at 7 for UI display; iterate history directly (up to 34
    // days back) to get the uncapped streak needed for accurate best-streak tracking.
    // updatedHistory is already sliced to the last 35 entries, so 34 is the effective lookback cap.
    let intentionDoneBestUpdate = {};
    if (done) {
      const doneSet = new Set<string>(updatedHistory.filter(e => e.done === true).map(e => e.date));
      const base = new Date(today + "T00:00:00");
      let fullStreak = 1; // today is done=true
      for (let back = 1; back <= 34; back++) {
        const d = new Date(base);
        d.setDate(d.getDate() - back);
        if (!doneSet.has(d.toLocaleDateString("sv"))) break;
        fullStreak++;
      }
      intentionDoneBestUpdate = { intentionDoneBestStreak: Math.max(fullStreak, snapshot.intentionDoneBestStreak ?? 0) };
    }
    persist({
      ...snapshot,
      todayIntentionDone: done || undefined,
      intentionHistory: updatedHistory.length > 0 ? updatedHistory : undefined,
      ...intentionDoneBestUpdate,
    });
    // Notify on false→true transition only (prevDone captured before persist, safer than re-reading dataRef).
    const notifyBody = calcIntentionDoneNotify(done, prevDone, snapshot.todayIntention);
    if (notifyBody) (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: notifyBody });
      } catch { /* Notification not available in browser dev mode */ }
    })();
  }, [persist]);

  const updateWeekGoal = useCallback((weekGoal: string) => {
    const goal = weekGoal !== "" ? weekGoal : undefined;
    const weekGoalDate = goal ? isoWeekStr(new Date()) : undefined;
    // Clear done when goal text changes — done is tied to the specific goal text
    persist({ ...dataRef.current, weekGoal: goal, weekGoalDate, weekGoalDone: undefined });
  }, [persist]);

  const updateWeekGoalDone = useCallback((done: boolean) => {
    persist({ ...dataRef.current, weekGoalDone: done || undefined });
    // Only notify on the false→true transition; re-check prevents duplicate fires on undo+redo
    if (done && !dataRef.current.weekGoalDone) (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: calcGoalCompletionNotify("week", dataRef.current.weekGoal) });
      } catch { /* Notification not available in browser dev mode */ }
    })();
  }, [persist]);

  const updateMonthGoal = useCallback((monthGoal: string) => {
    const goal = monthGoal !== "" ? monthGoal : undefined;
    // monthGoalDate format: "YYYY-MM" — first 7 chars of the sv locale date string
    const monthGoalDate = goal ? new Date().toLocaleDateString("sv").slice(0, 7) : undefined;
    const snapshot = dataRef.current;
    persist({ ...snapshot, monthGoal: goal, monthGoalDate, monthGoalDone: undefined });
  }, [persist]);

  const updateMonthGoalDone = useCallback((done: boolean) => {
    persist({ ...dataRef.current, monthGoalDone: done || undefined });
    if (done && !dataRef.current.monthGoalDone) (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: calcGoalCompletionNotify("month", dataRef.current.monthGoal) });
      } catch { /* Notification not available in browser dev mode */ }
    })();
  }, [persist]);

  const updateQuarterGoal = useCallback((quarterGoal: string) => {
    const goal = quarterGoal !== "" ? quarterGoal : undefined;
    // quarterGoalDate format: "YYYY-Q1"…"YYYY-Q4" derived from current date
    const quarterGoalDate = goal ? quarterStr(new Date()) : undefined;
    const snapshot = dataRef.current;
    persist({ ...snapshot, quarterGoal: goal, quarterGoalDate, quarterGoalDone: undefined });
  }, [persist]);

  const updateQuarterGoalDone = useCallback((done: boolean) => {
    persist({ ...dataRef.current, quarterGoalDone: done || undefined });
    if (done && !dataRef.current.quarterGoalDone) (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: calcGoalCompletionNotify("quarter", dataRef.current.quarterGoal) });
      } catch { /* Notification not available in browser dev mode */ }
    })();
  }, [persist]);

  const updateYearGoal = useCallback((yearGoal: string) => {
    const goal = yearGoal !== "" ? yearGoal : undefined;
    // yearGoalDate format: "YYYY" — first 4 chars of the sv locale date string
    const yearGoalDate = goal ? new Date().toLocaleDateString("sv").slice(0, 4) : undefined;
    const snapshot = dataRef.current;
    persist({ ...snapshot, yearGoal: goal, yearGoalDate, yearGoalDone: undefined });
  }, [persist]);

  const updateYearGoalDone = useCallback((done: boolean) => {
    persist({ ...dataRef.current, yearGoalDone: done || undefined });
    if (done && !dataRef.current.yearGoalDone) (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: calcGoalCompletionNotify("year", dataRef.current.yearGoal) });
      } catch { /* Notification not available in browser dev mode */ }
    })();
  }, [persist]);

  const updatePomodoroDurations = useCallback((pomodoroDurations: { focus: number; break: number; longBreak: number }) => {
    persist({ ...dataRef.current, pomodoroDurations });
  }, [persist]);

  const updatePomodoroAutoStart = useCallback((pomodoroAutoStart: boolean) => {
    persist({ ...dataRef.current, pomodoroAutoStart });
  }, [persist]);

  const updatePomodoroSessionGoal = useCallback((pomodoroSessionGoal: number | undefined) => {
    persist({ ...dataRef.current, pomodoroSessionGoal });
  }, [persist]);

  const updatePomodoroLongBreakInterval = useCallback((pomodoroLongBreakInterval: number) => {
    persist({ ...dataRef.current, pomodoroLongBreakInterval });
  }, [persist]);

  const updatePomodoroNotify = useCallback((pomodoroNotify: boolean) => {
    // Only persist false — absent/undefined means enabled (matches absent=default convention)
    persist({ ...dataRef.current, pomodoroNotify: pomodoroNotify ? undefined : false });
  }, [persist]);

  const updatePomodoroSound = useCallback((pomodoroSound: boolean) => {
    // Store true when enabled; coerce false → undefined so absent and false are both "disabled"
    persist({ ...dataRef.current, pomodoroSound: pomodoroSound || undefined });
  }, [persist]);

  const updateHabitsSound = useCallback((habitsSound: boolean) => {
    // Store true when enabled; coerce false → undefined so absent and false are both "disabled"
    persist({ ...dataRef.current, habitsSound: habitsSound || undefined });
  }, [persist]);

  // Batch-refresh GitHub data for all projects that have a repo set.
  // Fetches all repos in parallel, then applies results atomically to avoid
  // parallel-persist races (each updateProject call would overwrite the others).
  const refreshAllProjects = useCallback(async () => {
    if (!settings.githubPat) return;
    const targets = dataRef.current.projects.filter(p => p.githubRepo);
    const fetched: Array<{ id: number; githubData: GitHubData }> = [];
    await Promise.allSettled(
      targets.map(async p => {
        try {
          const githubData = await fetchRepoData(settings.githubPat!, p.githubRepo!);
          fetched.push({ id: p.id, githubData });
        } catch {
          // silent skip — bad repo, network error, rate limit
        }
      })
    );
    if (fetched.length === 0) return;
    // Read the latest snapshot after all fetches complete to apply results atomically
    const snapshot = dataRef.current;
    const updatedProjects = snapshot.projects.map(p => {
      const hit = fetched.find(f => f.id === p.id);
      return hit ? { ...p, githubData: hit.githubData } : p;
    });
    persist({ ...snapshot, projects: updatedProjects });
  }, [settings.githubPat, persist]);

  const handlePomodoroSession = useCallback((focusMins: number) => {
    const snapshot = dataRef.current;
    const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date (sv = Swedish = ISO format)
    const count = calcTodaySessionCount(snapshot.pomodoroSessionsDate, snapshot.pomodoroSessions, today);
    const newHistory = updatePomodoroHistory(snapshot.pomodoroHistory ?? [], today, count);
    // Credit session to the ★ focused project (if any) as a lifetime counter.
    const focusIdx = snapshot.projects.findIndex(p => p.isFocus);
    const updatedProjects = focusIdx >= 0
      ? snapshot.projects.map((p, i) =>
          i === focusIdx ? { ...p, pomodoroSessions: (p.pomodoroSessions ?? 0) + 1, lastFocusDate: today } : p
        )
      : snapshot.projects;
    const prevLifetime = snapshot.pomodoroLifetimeMins ?? 0;
    const newLifetime = prevLifetime + Math.max(0, focusMins); // guard: negative focusMins must not shrink cumulative total
    // Update focusBestStreak: max(new streak after this session, stored best).
    const newFocusStreak = calcFocusStreak(newHistory, today);
    const newFocusBestStreak = Math.max(newFocusStreak, snapshot.focusBestStreak ?? 0);
    // Update pomodoroGoalBestStreak: when today's sessions reach the daily goal, the effective goal
    // streak (past consecutive goal days + 1 for today) may be a new personal best.
    // calcPomodoroGoalStreak excludes today, so +1 accounts for today's goal-met contribution.
    const goalMet = snapshot.pomodoroSessionGoal != null && snapshot.pomodoroSessionGoal > 0 && count >= snapshot.pomodoroSessionGoal;
    const newPomodoroGoalBestStreak = goalMet
      ? Math.max(
          calcPomodoroGoalStreak(newHistory, snapshot.pomodoroSessionGoal!, today) + 1,
          snapshot.pomodoroGoalBestStreak ?? 0,
        )
      : snapshot.pomodoroGoalBestStreak;
    persist({ ...snapshot, pomodoroSessionsDate: today, pomodoroSessions: count, pomodoroHistory: newHistory, projects: updatedProjects, pomodoroLifetimeMins: newLifetime, focusBestStreak: newFocusBestStreak, pomodoroGoalBestStreak: newPomodoroGoalBestStreak });
    if (snapshot.pomodoroNotify !== false) {
      // Notify when the daily session goal is hit exactly (not on every subsequent session).
      if (snapshot.pomodoroSessionGoal !== undefined && snapshot.pomodoroSessionGoal > 0 && count === snapshot.pomodoroSessionGoal) {
        (async () => {
          try {
            let ok = await isPermissionGranted();
            if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
            if (!ok) return;
            sendNotification({ title: "Vision Widget", body: `🎯 오늘의 집중 목표 ${count}세션 달성!` });
          } catch { /* not available in browser dev mode */ }
        })();
      }
      // Notify when cumulative lifetime focus time crosses a major milestone (1h/5h/10h/25h/50h/100h).
      const lifetimeMilestoneMsg = calcPomodoroLifetimeMilestone(prevLifetime, newLifetime);
      if (lifetimeMilestoneMsg) {
        (async () => {
          try {
            let ok = await isPermissionGranted();
            if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
            if (!ok) return;
            sendNotification({ title: "Vision Widget", body: lifetimeMilestoneMsg });
          } catch { /* not available in browser dev mode */ }
        })();
      }
      // Notify when the focused project's per-project session count crosses a milestone (10/25/50/100 sessions).
      // prevSessions: before this session; newSessions: after (always prevSessions + 1).
      // Guard status !== 'done': a done project may still have isFocus=true in persisted data — skip milestone for it.
      if (focusIdx >= 0 && snapshot.projects[focusIdx].status !== "done") {
        const focusProject = snapshot.projects[focusIdx];
        const prevSessions = focusProject.pomodoroSessions ?? 0;
        const projectMilestoneMsg = calcProjectPomodoroMilestone(prevSessions, prevSessions + 1, focusProject.name);
        if (projectMilestoneMsg) {
          (async () => {
            try {
              let ok = await isPermissionGranted();
              if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
              if (!ok) return;
              sendNotification({ title: "Vision Widget", body: projectMilestoneMsg });
            } catch { /* not available in browser dev mode */ }
          })();
        }
      }
    }
  }, [persist]);

  const toggleSection = useCallback((section: SectionKey) => {
    const snapshot = dataRef.current;
    const current = snapshot.collapsedSections ?? [];
    const next = current.includes(section)
      ? current.filter(s => s !== section)
      : [...current, section];
    persist({ ...snapshot, collapsedSections: next });
  }, [persist]);

  const moveSection = useCallback((section: SectionKey, dir: -1 | 1) => {
    const snapshot = dataRef.current;
    const hidden = hiddenSectionsRef.current;
    const order = snapshot.sectionOrder ?? DEFAULT_SECTION_ORDER;
    const i = order.indexOf(section);
    // Find nearest visible section in the given direction
    let j = i + dir;
    while (j >= 0 && j < order.length && hidden.includes(order[j])) {
      j += dir;
    }
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    persist({ ...snapshot, sectionOrder: next });
  }, [persist]);

  // Derived: today's completed focus session count, reset to 0 when date changes
  const pomodoroSessionsToday =
    data.pomodoroSessionsDate === new Date().toLocaleDateString("sv")
      ? (data.pomodoroSessions ?? 0)
      : 0;

  const collapsed = data.collapsedSections ?? [];
  const theme = THEMES[settings.theme] ?? THEMES.void;
  const themeAccent = theme.accent;

  // Derived: habits done today + at-risk count — same render-time date pattern as pomodoroSessionsToday above.
  // Brief (<1 min) badge/button mismatch at midnight is acceptable; matching existing project pattern.
  const habitsArr = data.habits ?? [];
  // renderDate: single Date snapshot for all render-time derivations — one instance ensures todayStr and
  // Q/M/W period labels are always consistent at midnight boundaries (avoids separate new Date() calls drifting).
  const renderDate = new Date();
  const todayStr = renderDate.toLocaleDateString("sv");
  // Derive yesterday from local-midnight basis (same as HabitStreak.tsx) for DST safety
  const yesterdayHabitsStr = (() => { const d = new Date(todayStr + "T00:00:00"); d.setDate(d.getDate() - 1); return d.toLocaleDateString("sv"); })();
  // Current period labels for Direction goal context — derived from renderDate (same snapshot as todayStr)
  const currentQtr = Math.floor(renderDate.getMonth() / 3) + 1;      // 1–4
  const currentMonth = renderDate.getMonth() + 1;                     // 1–12
  const currentWeek = parseInt(isoWeekStr(renderDate).split("-W")[1], 10); // ISO week 1–53
  // Days remaining in each period including today (last day of period → 1d; first day → full count).
  // All calculations anchor to todayMidnight (local midnight of todayStr) — same pattern as yesterdayHabitsStr —
  // to avoid DST/time-of-day distortions that would occur if renderDate (current time) were used as base.
  const todayMidnight = new Date(todayStr + "T00:00:00");
  // Period remaining days — all anchor to todayMidnight (local midnight) for DST safety.
  // Declared largest→smallest to match usage order in directionBadge (Y→Q→M→W).
  // Design: expanded labels always show Nd; collapsed badge uses urgency thresholds (≤30/14/7/3d) for compactness.
  const daysLeftYear    = daysLeftInYear(todayMidnight);
  const daysLeftQuarter = daysLeftInQuarter(todayMidnight);
  const daysLeftMonth   = daysLeftInMonth(todayMidnight);
  // ISO week ends Sunday; getDay() on local midnight is consistent with isoWeekStr which uses local date parts.
  const daysLeftWeek    = daysLeftInWeek(todayMidnight);
  // Period elapsed fractions — used for the 2px progress bars in Direction goal rows.
  // Consistent visual language with Clock day bar and DragBar year bar.
  const yearElapsedFrac    = periodElapsedFraction(daysLeftYear,    totalDaysInYear(todayMidnight));
  const quarterElapsedFrac = periodElapsedFraction(daysLeftQuarter, totalDaysInQuarter(todayMidnight));
  const monthElapsedFrac   = periodElapsedFraction(daysLeftMonth,   totalDaysInMonth(todayMidnight));
  const weekElapsedFrac    = periodElapsedFraction(daysLeftWeek, 7);
  const habitsDoneToday = habitsArr.filter(h => h.lastChecked === todayStr).length;
  // atRisk: streak > 0, last checked yesterday — semantically equivalent to HabitStreak.tsx:338's !doneToday&&streak>0&&lastChecked===yesterday
  const habitsAtRisk = habitsArr.filter(h => h.streak > 0 && h.lastChecked === yesterdayHabitsStr).length;
  // dailyScore: 0-100 momentum score combining habits, pomodoro, and intention for today
  const dailyScore = calcDailyScore({
    habitsCheckedToday: habitsDoneToday,
    habitsTotal: habitsArr.length,
    pomodoroToday: pomodoroSessionsToday,
    pomodoroGoal: data.pomodoroSessionGoal,
    intentionDone: !!data.todayIntentionDone,
    intentionSet: !!data.todayIntention,
  });
  // momentumStreak: consecutive days with momentum score ≥ 40; shown as 🔥Nd badge when ≥ 2
  const momentumStreak = calcMomentumStreak(data.momentumHistory ?? [], todayStr);
  // prevMomentumStreak: streak as of yesterday's start — used to detect a momentum streak that broke yesterday.
  // Reuses yesterdayHabitsStr (same local-midnight basis) to avoid duplicate date computation.
  const prevMomentumStreak = calcMomentumStreak(data.momentumHistory ?? [], yesterdayHabitsStr);
  // momentumWeekAvg: rounded average of the rolling momentum history (up to 31 days); null when < 2 entries
  const momentumWeekAvg = calcMomentumWeekAvg(data.momentumHistory ?? []);
  // pomodoroGoalStreak: consecutive PAST days (not today) where sessionGoal was met or exceeded.
  // undefined when sessionGoal is not set (no goal means streak is meaningless).
  const pomodoroGoalStreak = data.pomodoroSessionGoal != null && data.pomodoroSessionGoal > 0
    ? calcPomodoroGoalStreak(data.pomodoroHistory ?? [], data.pomodoroSessionGoal, todayStr)
    : undefined;
  // prevPomodoroGoalStreak: streak as of yesterday's start — used to detect a streak that broke yesterday.
  // Reuses yesterdayHabitsStr (same local-midnight basis) to avoid duplicate date computation.
  const prevPomodoroGoalStreak = data.pomodoroSessionGoal != null && data.pomodoroSessionGoal > 0
    ? calcPomodoroGoalStreak(data.pomodoroHistory ?? [], data.pomodoroSessionGoal, yesterdayHabitsStr)
    : undefined;
  // prevIntentionDoneStreak: consecutive done days ending at the day before yesterdayHabitsStr.
  // Computed inline (not via calcIntentionDoneStreak) to avoid the 7-day display cap —
  // we need the actual streak length so the badge message "N일 스트릭 끊어짐" is accurate.
  const prevIntentionDoneStreak = (() => {
    const doneSet = new Set(
      (data.intentionHistory ?? []).filter(e => e.done === true).map(e => e.date),
    );
    const base = new Date(yesterdayHabitsStr + "T00:00:00");
    let count = 0;
    for (let back = 1; back <= 101; back++) {
      const d = new Date(base);
      d.setDate(d.getDate() - back);
      if (!doneSet.has(d.toLocaleDateString("sv"))) break;
      count++;
    }
    return count;
  })();
  // pomodoroSessionBest: max session count on any PAST calendar day in the 35-day rolling history.
  // Today's entry is excluded — compare against past days only to detect a genuine new daily record.
  // undefined when no past-day history exists (first use or all entries are today's date).
  const pomodoroSessionBest = (() => {
    const pastCounts = (data.pomodoroHistory ?? [])
      .filter(d => d.date !== todayStr)
      .map(d => d.count);
    return pastCounts.length > 0 ? Math.max(...pastCounts) : undefined;
  })();
  // intentionConsecutiveDays: consecutive days (including today) on which the user has set an intention.
  // Pure function extracted to src/lib/intention.ts for testability.
  const intentionConsecutiveDays = calcIntentionStreak(
    data.todayIntention,
    todayStr,
    data.intentionHistory ?? [],
  );
  // intentionDoneStreak: consecutive days (including today if done) on which today's intention was
  // marked accomplished. When ≥ 3, the intention_done badge shows the streak count instead of a
  // generic message — rewards sustained execution over single-day completion.
  const intentionDoneStreak = calcIntentionDoneStreak(
    data.intentionHistory ?? [],
    data.todayIntentionDone,
    todayStr,
  );
  // last28Days: 4-week window used for per-weekday habit completion rate (calcDayOfWeekHabitRates).
  // 28 days = 4 full weeks so each weekday has exactly 4 data points — well above MIN_DOW_APPEARANCES=2.
  const last28Days = calcLastNDays(todayStr, 28);
  // focusStreak: consecutive days (including today when sessions > 0) with ≥1 pomodoro session.
  // Passed to calcTodayInsight for focus_streak_milestone badge (7/14/30-day milestones).
  const focusStreak = calcFocusStreak(data.pomodoroHistory ?? [], todayStr);
  // prevFocusStreak: streak as of yesterday's start — used to detect a focus streak that broke yesterday.
  // Reuses yesterdayHabitsStr (same local-midnight basis) to avoid duplicate date computation.
  const prevFocusStreak = calcFocusStreak(data.pomodoroHistory ?? [], yesterdayHabitsStr);
  // pomodoroLifetimePrevMins: cumulative focus minutes BEFORE today's sessions were added.
  // Subtracts sessionsToday × current focus-phase duration so the insight can detect
  // when today's sessions crossed a lifetime milestone (10h/50h/100h/200h).
  // sessionDurationMins defaults to 25 when pomodoroDurations is absent (standard Pomodoro).
  // Known limitation: if the user changed pomodoroDurations mid-day, prev uses the current setting
  // rather than the actual per-session duration — a rare edge case that may cause off-by-one in
  // milestone detection on that specific day only. Acceptable vs. the complexity of per-session
  // duration tracking.
  const pomodoroLifetimePrevMins = Math.max(
    0,
    (data.pomodoroLifetimeMins ?? 0) - pomodoroSessionsToday * ((data.pomodoroDurations ?? { focus: 25 }).focus),
  );
  // habitLifetimePrevCheckins: cumulative check-ins across all habits BEFORE today's check-ins.
  // Computed by subtracting habitsDoneToday (already wired above) from the stored running total.
  // Together with data.habitLifetimeTotalCheckins, detects when today crossed a milestone (100/500/1000/5000).
  const habitLifetimePrevCheckins = data.habitLifetimeTotalCheckins !== undefined
    ? Math.max(0, data.habitLifetimeTotalCheckins - habitsDoneToday)
    : undefined;
  // projectFocusSessions/projectFocusPrevSessions: lifetime focus session count for the focused project.
  // prevSessions = max(0, current − sessionsToday) — mirrors the pomodoroLifetimePrevMins pattern.
  // Known approximation: sessionsToday is the global daily count, not per-project. On days where the
  // user switched focused projects, prev may underestimate. Acceptable vs. per-session tracking complexity.
  const insightFocusProject = (data.projects ?? []).find(p => p.isFocus === true);
  // Use undefined (not 0) when no focus project so insight.ts guard `projectFocusSessions !== undefined`
  // correctly distinguishes "no focused project" from "focused project with 0 sessions".
  const projectFocusSessions = insightFocusProject !== undefined
    ? (insightFocusProject.pomodoroSessions ?? 0)
    : undefined;
  const projectFocusPrevSessions = insightFocusProject !== undefined
    ? Math.max(0, (insightFocusProject.pomodoroSessions ?? 0) - pomodoroSessionsToday)
    : undefined;
  const projectFocusName = insightFocusProject?.name;
  // pomodoroRecentAvg: average sessions per day across all past history entries (today excluded).
  // pomodoroHistory includes today's entry (written by the session-complete handler); today is
  // excluded inside calcPomodoroRecentAvg via the todayStr filter — this exclusion is load-bearing.
  // Passed to calcTodayInsight for the pomodoro_today_above_avg badge (priority 10.45).
  const pomodoroRecentAvg = calcPomodoroRecentAvg(data.pomodoroHistory ?? [], todayStr);
  // pomodoroWeekRecord: compares current ISO-week total (Mon–today) against same-length window last week.
  // Uses pomodoroSessionsToday (the live session count) rather than any history entry for today,
  // so the record comparison stays accurate during an active work session.
  const pomodoroWeekRecord = calcPomodoroWeekRecord(data.pomodoroHistory ?? [], pomodoroSessionsToday, todayStr);
  // last14Days/habitsPerfectStreak: declared here (before calcTodayInsight) so perfectDayStreak
  // can be passed as a param. Also reused by HabitStreak + habitsWeekTrend below.
  // perfectDayWindow uses 101 days so that the 30/50/100-day milestones in PERFECT_DAY_MILESTONES
  // are reachable (a 14-day cap would permanently prevent those milestones from firing).
  const last14Days = calcLastNDays(todayStr, 14);
  const perfectDayWindow = calcLastNDays(todayStr, 101);
  const habitsPerfectStreak = calcPerfectDayStreak(habitsArr, perfectDayWindow);
  // last7Days + habitsWeekRate: declared before calcTodayInsight so habitWeekRate feeds the
  // habit_week_excellent insight (priority 10.35). Reused below for intentionWeek, habitsWeekTrend,
  // habitsBadge, and projectsBadge — single source of truth for the current 7-day window.
  const last7Days = calcLastNDays(todayStr, 7);
  const habitsWeekRate = calcHabitsWeekRate(habitsArr, last7Days);
  // habitsPrevWeekRate: declared before calcTodayInsight so habitPrevWeekRate feeds the
  // habit_week_declined insight (priority 10.37). Reused below for habitsWeekTrend.
  // Uses last14Days (already declared above) — prevWeek7Days = days 7–13 ago (previous 7-day window).
  const prevWeek7Days = last14Days.slice(0, 7);
  const habitsPrevWeekRate = calcHabitsWeekRate(habitsArr, prevWeek7Days);
  // momentumWeekAvg7d: 7-day momentum average for momentum_week_strong/improved/declined badges.
  // Filters momentumHistory to last7Days entries then averages — null when < 2 entries in window.
  const momentumWeekAvg7d = calcMomentumWeekAvg(
    (data.momentumHistory ?? []).filter(e => last7Days.includes(e.date))
  );
  // momentumPrevWeekAvg7d: previous 7-day window (days 7–13 ago) for week-over-week comparison.
  // Uses the first 7 entries of last14Days which are the oldest 7 days in that window.
  const momentumPrevWeekAvg7d = calcMomentumWeekAvg(
    (data.momentumHistory ?? []).filter(e => prevWeek7Days.includes(e.date))
  );
  // intentionWeek7: per-day set/done status for the last 7 days.
  // Computed before calcTodayInsight so intentionWeekDoneRate feeds the intention_week_* badges.
  // Reused below for the direction badge and intention heatmap UI.
  const { days: intentionLast7, setCount: intentionSetCount7, doneCount: intentionDoneCount7 } =
    calcIntentionWeek(last7Days, todayStr, data.todayIntention, data.todayIntentionDone, data.intentionHistory ?? []);
  // intentionWeekDoneRate: done rate for the last 7 days — requires setCount ≥ 3 for a meaningful signal.
  // Absent (undefined) when fewer than 3 intentions were set, to avoid noise from sparse weeks.
  const intentionWeekDoneRate =
    intentionSetCount7 >= 3
      ? Math.round((intentionDoneCount7 / intentionSetCount7) * 100)
      : undefined;
  // intentionPrevWeekDoneRate: done rate for the previous 7-day window (days 7-13 ago).
  // Uses calcIntentionWeek with prevWeek7Days; todayStr won't match that range so today's live
  // state is effectively ignored. Requires setCount ≥ 2 for a meaningful comparison baseline.
  const { setCount: intentionPrevSetCount7, doneCount: intentionPrevDoneCount7 } =
    calcIntentionWeek(prevWeek7Days, todayStr, data.todayIntention, data.todayIntentionDone, data.intentionHistory ?? []);
  const intentionPrevWeekDoneRate =
    intentionPrevSetCount7 >= 2
      ? Math.round((intentionPrevDoneCount7 / intentionPrevSetCount7) * 100)
      : undefined;
  // pomodoroWeekSessions / pomodoroPrevWeekSessions for pomodoro_week_improved/declined badges.
  // Uses the same last7Days / last14Days windows as habit week comparisons — single source of truth.
  const pomodoroWeekSessions = (data.pomodoroHistory ?? [])
    .filter(e => last7Days.includes(e.date))
    .reduce((sum, e) => sum + e.count, 0);
  const pomodoroPrevWeekSessions = (data.pomodoroHistory ?? [])
    .filter(e => prevWeek7Days.includes(e.date))
    .reduce((sum, e) => sum + e.count, 0);
  // pomodoroWeekGoalDays: days in last7Days where session count >= sessionGoal; undefined when no goal set.
  const pomodoroWeekGoalDays = (data.pomodoroSessionGoal && data.pomodoroSessionGoal > 0)
    ? calcPomodoroWeekGoalDays(data.pomodoroHistory ?? [], data.pomodoroSessionGoal, last7Days, pomodoroSessionsToday, todayStr)
    : undefined;
  // pomodoroMonthGoalDays: days in last14Days where session count >= sessionGoal; undefined when no goal set.
  // When currentMonthDay ≥ 14 (the badge guard in insight.ts), last14Days lies entirely within the
  // current calendar month, giving a meaningful "this month" goal-hit count for the monthly badge.
  const pomodoroMonthGoalDays = (data.pomodoroSessionGoal && data.pomodoroSessionGoal > 0)
    ? calcPomodoroWeekGoalDays(data.pomodoroHistory ?? [], data.pomodoroSessionGoal, last14Days, pomodoroSessionsToday, todayStr)
    : undefined;
  // pomodoroWeekPrevGoalDays: days in the PREVIOUS 7-day window (prevWeek7Days, i.e. days 7–13 ago)
  // where session count >= sessionGoal. prevWeek7Days never contains todayStr (it ends 7 days ago),
  // so sessionsToday=0 and the todayStr branch inside calcPomodoroWeekGoalDays are both inert — all counts
  // come from pomodoroHistory. Used alongside pomodoroWeekGoalDays to detect week-over-week goal-day delta ≥ 2
  // in insight.ts (10.3823/10.3824).
  const pomodoroWeekPrevGoalDays = (data.pomodoroSessionGoal && data.pomodoroSessionGoal > 0)
    ? calcPomodoroWeekGoalDays(data.pomodoroHistory ?? [], data.pomodoroSessionGoal, prevWeek7Days, 0, todayStr)
    : undefined;
  // pomodoroMonthPrevGoalDays: days in the PREVIOUS 14-day window (last28Days.slice(0, 14), i.e. days 14–27 ago)
  // where session count >= sessionGoal. The window never includes today, so sessionsToday=0 and the
  // todayStr branch inside calcPomodoroWeekGoalDays is inert — all counts come from pomodoroHistory.
  // Used alongside pomodoroMonthGoalDays to detect 14d-over-14d goal-day delta ≥ 2 in insight.ts (10.443/10.444).
  const pomodoroMonthPrevGoalDays = (data.pomodoroSessionGoal && data.pomodoroSessionGoal > 0)
    ? calcPomodoroWeekGoalDays(data.pomodoroHistory ?? [], data.pomodoroSessionGoal, last28Days.slice(0, 14), 0, todayStr)
    : undefined;
  // intentionMonthDoneRate: current calendar month's intention done rate (0–100), or undefined when
  // fewer than 14 intentions were set this month (insufficient data for a meaningful signal).
  // Delegates to calcIntentionMonthDoneRate which excludes today from intentionHistory to avoid
  // double-counting (intentionHistory may already contain today's persisted entry).
  const intentionMonthDoneRate = calcIntentionMonthDoneRate(
    data.intentionHistory ?? [],
    todayStr,
    data.todayIntention,
    data.todayIntentionDone,
  );
  // intentionPrevMonthDoneRate: previous calendar month's intention done rate (0–100), or undefined
  // when fewer than 10 intentions were set in the previous month (insufficient comparison baseline).
  // intentionHistory is capped at 35 days (types.ts) — enough to cover the full previous calendar month.
  // Computed inline: filter intentionHistory to prevMonthPrefix, compute done/set ratio.
  const intentionPrevMonthDoneRate = (() => {
    const yr = +todayStr.slice(0, 4);
    const mo = +todayStr.slice(5, 7);
    const prevMonthPrefix = mo === 1
      ? `${yr - 1}-12`
      : `${yr}-${String(mo - 1).padStart(2, "0")}`;
    const prevEntries = (data.intentionHistory ?? []).filter(e => e.date.startsWith(prevMonthPrefix));
    if (prevEntries.length < 10) return undefined;
    const doneCount = prevEntries.filter(e => e.done === true).length;
    return Math.round((doneCount / prevEntries.length) * 100);
  })();
  // habitMonthRate: current calendar month's average daily habit completion rate (0–100), or undefined
  // when fewer than 14 days have passed in the month (too early for a meaningful monthly signal).
  // Uses calcHabitsWeekRate which returns null when no habits have check history — mapped to undefined.
  const habitMonthRate = (() => {
    const day = renderDate.getDate();
    if (day < 14) return undefined;
    const rate = calcHabitsWeekRate(habitsArr, calcLastNDays(todayStr, day));
    return rate ?? undefined;
  })();
  // habitPrevMonthRate: previous calendar month's average daily habit completion rate (0–100),
  // or undefined when calcHabitsWeekRate returns null (no check history in that month).
  // Uses the full previous calendar month's days as the window.
  const habitPrevMonthRate = (() => {
    const lastDayOfPrevMonth = new Date(renderDate.getFullYear(), renderDate.getMonth(), 0);
    const daysInPrevMonth = lastDayOfPrevMonth.getDate();
    const lastDayStr = lastDayOfPrevMonth.toLocaleDateString("sv");
    const rate = calcHabitsWeekRate(habitsArr, calcLastNDays(lastDayStr, daysInPrevMonth));
    return rate ?? undefined;
  })();
  // habitMomentumGap: point gap between avg momentum on all-habits-done days vs. not-all-done days.
  // Derived from 31-day momentumHistory × per-habit checkHistory; requires ≥5 samples in each bucket.
  // Returns null when data is insufficient or gap < 15 pt; undefined coercion skips the badge silently.
  const habitMomentumGap = calcHabitMomentumCorrelation(habitsArr, data.momentumHistory ?? [], todayStr) ?? undefined;
  // intentionMomentumGap: point gap between avg momentum on intention-done days vs. not-done/not-set days.
  // Derived from 31-day momentumHistory × intentionHistory done entries; requires ≥5 samples in each bucket.
  // Returns null when data is insufficient or gap < 15 pt; undefined coercion skips the badge silently.
  const intentionMomentumGap = calcIntentionMomentumCorrelation(data.intentionHistory ?? [], data.momentumHistory ?? [], todayStr) ?? undefined;
  // pomodoroMomentumGap: point gap between avg momentum on pomodoro-goal-met days vs. not-met days.
  // Derived from 35-day pomodoroHistory × 31-day momentumHistory; requires ≥5 samples in each bucket.
  // Returns null when sessionGoal not set, data is insufficient, or gap < 15 pt; undefined coercion skips the badge silently.
  const pomodoroMomentumGap = calcPomodoroMomentumCorrelation(data.pomodoroHistory ?? [], data.momentumHistory ?? [], data.pomodoroSessionGoal, todayStr) ?? undefined;
  // intentionConsecutiveMissDays: consecutive past days without an intention entry; null = brand-new user or < 3 days missed.
  const intentionConsecutiveMissDays = calcIntentionConsecutiveMiss(data.intentionHistory ?? [], todayStr) ?? undefined;
  // focusDroughtDays: consecutive past days without any pomodoro sessions; null = never started or drought < 3 days.
  const focusDroughtDays = calcFocusDroughtDays(data.pomodoroHistory ?? [], todayStr) ?? undefined;
  // Past consecutive done streaks for each goal period — shared by todayInsight and directionBadge.
  // Excludes the current (in-progress) period; ≥ 2 triggers streak suffix in both contexts.
  // Math.max(0, ...) clamps the result to ≥ 0: when no goal is set for the current period,
  // calcXxxGoalStreak returns 0, so 0 - 1 = -1 without the clamp — which would violate the ≥ 0 contract.
  const weekGoalPastDoneStreak = Math.max(0, calcWeekGoalStreak(
    data.weekGoal, data.weekGoalDate,
    (data.weekGoalHistory ?? []).filter(e => e.done === true), renderDate,
  ) - 1);
  const monthGoalPastDoneStreak = Math.max(0, calcMonthGoalStreak(
    data.monthGoal, data.monthGoalDate,
    (data.monthGoalHistory ?? []).filter(e => e.done === true), renderDate,
  ) - 1);
  const quarterGoalPastDoneStreak = Math.max(0, calcQuarterGoalStreak(
    data.quarterGoal, data.quarterGoalDate,
    (data.quarterGoalHistory ?? []).filter(e => e.done === true), renderDate,
  ) - 1);
  const yearGoalPastDoneStreak = Math.max(0, calcYearGoalStreak(
    data.yearGoal, data.yearGoalDate,
    (data.yearGoalHistory ?? []).filter(e => e.done === true), renderDate,
  ) - 1);
  // todayInsight: single most actionable context-aware insight for the Clock badge
  const todayInsight = calcTodayInsight({
    habits: habitsArr,
    todayStr,
    nowHour: renderDate.getHours(),
    todayIntentionDate: data.todayIntentionDate,
    todayIntentionDone: data.todayIntentionDone,
    sessionsToday: pomodoroSessionsToday,
    sessionGoal: data.pomodoroSessionGoal,
    habitsAllDoneDate: data.habitsAllDoneDate,
    projects: data.projects ?? [],
    weekGoal: data.weekGoal,
    weekGoalDone: data.weekGoalDone,
    daysLeftWeek,
    monthGoal: data.monthGoal,
    monthGoalDone: data.monthGoalDone,
    daysLeftMonth,
    quarterGoal: data.quarterGoal,
    quarterGoalDone: data.quarterGoalDone,
    daysLeftQuarter,
    yearGoal: data.yearGoal,
    yearGoalDone: data.yearGoalDone,
    daysLeftYear,
    momentumHistory: data.momentumHistory,
    weekGoalPastDoneStreak,
    monthGoalPastDoneStreak,
    quarterGoalPastDoneStreak,
    yearGoalPastDoneStreak,
    pomodoroGoalStreak,
    prevPomodoroGoalStreak,
    prevIntentionDoneStreak,
    prevFocusStreak,
    prevMomentumStreak,
    pomodoroGoalBestStreak: data.pomodoroGoalBestStreak,
    pomodoroSessionBest,
    pomodoroWeekRecord,
    pomodoroRecentAvg,
    intentionConsecutiveDays,
    intentionDoneStreak,
    // momentumStreak: consecutive days with momentum score ≥ 40; fires milestone badge at 7/14/30 days.
    momentumStreak,
    focusStreak,
    pomodoroLifetimePrevMins,
    pomodoroLifetimeMins: data.pomodoroLifetimeMins,
    habitLifetimePrevCheckins,
    habitLifetimeCheckins: data.habitLifetimeTotalCheckins,
    projectFocusSessions,
    projectFocusPrevSessions,
    projectFocusName,
    // perfectDayStreak: consecutive days all habits completed including today — same 14-day window used by HabitStreak.
    // When ≥ 3, the perfect_day badge shows the streak count instead of a generic celebration.
    perfectDayStreak: habitsPerfectStreak,
    perfectDayBestStreak: data.perfectDayBestStreak,
    intentionDoneBestStreak: data.intentionDoneBestStreak,
    focusBestStreak: data.focusBestStreak,
    momentumBestStreak: data.momentumBestStreak,
    habitWeekRate: habitsWeekRate ?? undefined,
    // habitPrevWeekRate: same 14-day window's first half (days 7–13 ago) — already computed for habitsWeekTrend.
    habitPrevWeekRate: habitsPrevWeekRate ?? undefined,
    // habitMonthRate / habitPrevMonthRate: month-over-month habit completion rate comparison.
    // habitMonthRate is undefined when currentMonthDay < 14 (enforced in the computation above).
    habitMonthRate,
    habitPrevMonthRate,
    // todayIsWeakHabitDay / todayIsBestHabitDay: derived from the same per-weekday rates computed once.
    // Uses last28Days (4 full weeks) so each weekday has exactly 4 data points.
    ...(() => {
      const rates = calcDayOfWeekHabitRates(habitsArr, last28Days);
      const todayDow = new Date(todayStr + "T00:00:00").getDay();
      return {
        todayIsWeakHabitDay: calcWeakDayOfWeek(rates) === todayDow,
        todayIsBestHabitDay: calcBestDayOfWeek(rates) === todayDow,
      };
    })(),
    // todayIsWeakPomodoroDay / todayIsBestPomodoroDay: per-weekday pomodoro session averages.
    // Uses last14Days (2 occurrences per DoW) so the function has consistent inputs.
    // Returns false when history has no recorded sessions (calcDayOfWeekPomodoroAvg returns all-null).
    ...(() => {
      const pomAvg = calcDayOfWeekPomodoroAvg(data.pomodoroHistory ?? [], last14Days);
      const todayDow = new Date(todayStr + "T00:00:00").getDay();
      return {
        todayIsWeakPomodoroDay: calcWeakPomodoroDay(pomAvg) === todayDow,
        todayIsBestPomodoroDay: calcBestPomodoroDay(pomAvg) === todayDow,
      };
    })(),
    // todayIsWeakIntentionDay / todayIsBestIntentionDay: per-weekday intention done-rate analysis.
    // Uses last28Days (4 full weeks) so each weekday has exactly 4 data points in the window.
    // Returns false when intentionHistory has no entries (calcDayOfWeekIntentionDoneRate returns all-null).
    ...(() => {
      const intentionRates = calcDayOfWeekIntentionDoneRate(data.intentionHistory ?? [], last28Days);
      const todayDow = new Date(todayStr + "T00:00:00").getDay();
      return {
        todayIsWeakIntentionDay: calcWeakIntentionDay(intentionRates) === todayDow,
        todayIsBestIntentionDay: calcBestIntentionDay(intentionRates) === todayDow,
      };
    })(),
    // todayIsWeakMomentumDay / todayIsBestMomentumDay: per-weekday momentum score averages.
    // Uses last14Days (2 occurrences per DoW), matching other day-of-week analyses using the same window.
    // Returns false when history has no entries (calcDayOfWeekMomentumAvg returns all-null).
    ...(() => {
      const momAvg = calcDayOfWeekMomentumAvg(data.momentumHistory ?? [], last14Days);
      const todayDow = new Date(todayStr + "T00:00:00").getDay();
      return {
        todayIsWeakMomentumDay: calcWeakMomentumDay(momAvg) === todayDow,
        todayIsBestMomentumDay: calcBestMomentumDay(momAvg) === todayDow,
      };
    })(),
    // momentumWeekAvg7d / momentumPrevWeekAvg7d: 7-day window averages for week-rate insight badges.
    // Both computed before this call (above) — passed as undefined when < 2 history entries in window.
    momentumWeekAvg7d: momentumWeekAvg7d ?? undefined,
    momentumPrevWeekAvg7d: momentumPrevWeekAvg7d ?? undefined,
    // intentionWeekDoneRate / intentionPrevWeekDoneRate: intention done rates for week-comparison badges.
    // Both computed before this call (above) — undefined when insufficient sample (setCount < threshold).
    intentionWeekDoneRate,
    intentionPrevWeekDoneRate,
    // intentionMonthDoneRate: current calendar month done rate — undefined when setCount < 14.
    intentionMonthDoneRate,
    // intentionPrevMonthDoneRate: previous calendar month done rate — undefined when prevEntries < 10.
    intentionPrevMonthDoneRate,
    // pomodoroWeekSessions / pomodoroPrevWeekSessions: rolling 7-day session totals for week-comparison badges.
    pomodoroWeekSessions,
    pomodoroPrevWeekSessions,
    // pomodoroWeekGoalDays: days in last7Days goal was met; undefined when sessionGoal not set.
    pomodoroWeekGoalDays,
    // pomodoroWeekPrevGoalDays: days in prevWeek7Days goal was met; undefined when sessionGoal not set.
    pomodoroWeekPrevGoalDays,
    // pomodoroMonthGoalDays: days in last14Days goal was met; undefined when sessionGoal not set.
    pomodoroMonthGoalDays,
    // pomodoroMonthPrevGoalDays: days in last28Days.slice(0, 14) goal was met; undefined when sessionGoal not set.
    pomodoroMonthPrevGoalDays,
    // habitMomentumGap: avg momentum gap (all-done days minus not-all-done days); undefined = insufficient data or gap < 15.
    habitMomentumGap,
    // intentionMomentumGap: avg momentum gap (intention-done days minus not-done/not-set days); undefined = insufficient data or gap < 15.
    intentionMomentumGap,
    // pomodoroMomentumGap: avg momentum gap (goal-met days minus not-goal-met days); undefined = no sessionGoal, insufficient data, or gap < 15.
    pomodoroMomentumGap,
    // intentionConsecutiveMissDays: consecutive past days without intention; undefined = brand-new user, < 3 days missed, or null from calc.
    intentionConsecutiveMissDays,
    // focusDroughtDays: consecutive past days without any pomodoro sessions; undefined = never started or drought < 3 days.
    focusDroughtDays,
  });
  // Persist today's momentum score whenever it changes — upserts into rolling 31-day history.
  // Uses dataRef.current (not `data`) to avoid stale closure overwriting concurrent changes
  // (e.g. pomodoro session or habit check-in that updates data between renders).
  useEffect(() => {
    if (!loaded) return;
    const current = dataRef.current;
    const stored = (current.momentumHistory ?? []).find(e => e.date === todayStr);
    if (stored && stored.score === dailyScore.score && stored.tier === dailyScore.tier) return;
    const updated = updateMomentumHistory(current.momentumHistory ?? [], todayStr, dailyScore.score, dailyScore.tier);
    // Update momentumBestStreak: max(new streak including today, stored best).
    const newMomentumStreak = calcMomentumStreak(updated, todayStr);
    const newMomentumBestStreak = Math.max(newMomentumStreak, current.momentumBestStreak ?? 0);
    persist({ ...current, momentumHistory: updated, momentumBestStreak: newMomentumBestStreak });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyScore.score, dailyScore.tier, todayStr, loaded]);

  // Morning momentum reminder — fires once per calendar day at 09:00+ showing yesterday's momentum score.
  // Gives the user daily context to carry momentum forward or start fresh with awareness.
  // momentumMorningRemindDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as pomodoroMorningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.momentumMorningRemindDate === today) return;
    if (now.getHours() < 9) return;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("sv");
    const msg = calcMomentumMorningReminder(data.momentumHistory ?? [], yesterdayStr);
    if (!msg) return;
    persist({ ...dataRef.current, momentumMorningRemindDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  // dailyScore.score is included so the effect reruns when the user's first morning activity updates
  //   the score — covers the case where the app was open overnight and momentumHistory didn't change.
  }, [data.momentumHistory, data.momentumMorningRemindDate, dailyScore.score, loaded, persist]);

  // Evening momentum score digest — fires once per calendar day at 21:00+ when today's score > 0.
  // Gives the user end-of-day closure by surfacing their momentum score with a tier-appropriate message.
  // momentumEveningDigestDate persists the guard so it fires only once per calendar day even after restart.
  // Design: date is persisted before the async send (same pattern as habitEveningRemindDate) to prevent duplicates.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = now.toLocaleDateString("sv");
    if (data.momentumEveningDigestDate === today) return;
    if (now.getHours() < 21) return;
    const msg = calcMomentumEveningDigest(dailyScore.score, dailyScore.tier);
    if (!msg) return;
    persist({ ...dataRef.current, momentumEveningDigestDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: msg });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [dailyScore.score, dailyScore.tier, data.momentumEveningDigestDate, loaded, persist]);

  // weekGoalStreak: consecutive ISO weeks (including current) for which a weekly goal was set.
  // Mirrors intentionConsecutiveDays pattern; shown as "N🔥" when ≥ 2 to reward consistent goal-setting.
  const weekGoalStreak = calcWeekGoalStreak(
    data.weekGoal,
    data.weekGoalDate,
    data.weekGoalHistory ?? [],
    renderDate,
  );
  // weekGoalHeatmap: 7-week set/done dot row — mirrors the 7-day intention heatmap for consistent visual language.
  // last7Weeks: [6 weeks ago, …, this week] as ISO week strings (oldest→newest).
  const last7Weeks = calcLastNWeeks(todayStr, 7);
  const weekGoalHeatmap = calcWeekGoalHeatmap(
    last7Weeks,
    isoWeekStr(renderDate),
    data.weekGoal,
    data.weekGoalDone,
    data.weekGoalHistory ?? [],
  );
  // monthGoalHeatmap: 6-month set/done dot row — mirrors the 7-week goal heatmap for consistent visual language.
  // last6Months: [5 months ago, …, this month] as "YYYY-MM" strings (oldest→newest).
  const last6Months = calcLastNMonths(todayStr, 6);
  const currentMonthStr = todayStr.slice(0, 7); // "YYYY-MM"
  const monthGoalHeatmap = calcMonthGoalHeatmap(
    last6Months,
    currentMonthStr,
    data.monthGoal,
    data.monthGoalDone,
    data.monthGoalHistory ?? [],
  );
  // quarterGoalHeatmap: 4-quarter set/done dot row — mirrors monthGoalHeatmap for consistent visual language.
  // last4Quarters: [3 quarters ago, …, this quarter] as "YYYY-QN" strings (oldest→newest).
  // currentQuarterStr: derived from todayStr + currentQtr (same todayStr-based pattern as currentMonthStr/currentYearStr).
  const currentQuarterStr = `${todayStr.slice(0, 4)}-Q${currentQtr}`; // "YYYY-Q1"…"YYYY-Q4"
  const last4Quarters = calcLastNQuarters(todayStr, 4);
  const quarterGoalHeatmap = calcQuarterGoalHeatmap(
    last4Quarters,
    currentQuarterStr,
    data.quarterGoal,
    data.quarterGoalDone,
    data.quarterGoalHistory ?? [],
  );
  // yearGoalHeatmap: 4-year set/done dot row — mirrors quarterGoalHeatmap for consistent visual language.
  // last4Years: [3 years ago, …, this year] as "YYYY" strings (oldest→newest).
  const currentYearStr = todayStr.slice(0, 4); // "YYYY"
  const last4Years = calcLastNYears(todayStr, 4);
  const yearGoalHeatmap = calcYearGoalHeatmap(
    last4Years,
    currentYearStr,
    data.yearGoal,
    data.yearGoalDone,
    data.yearGoalHistory ?? [],
  );
  // M/Q/Y goal streaks: consecutive periods for which a goal was set — same reward pattern as week.
  const monthGoalStreak = calcMonthGoalStreak(data.monthGoal, data.monthGoalDate, data.monthGoalHistory ?? [], renderDate);
  const quarterGoalStreak = calcQuarterGoalStreak(data.quarterGoal, data.quarterGoalDate, data.quarterGoalHistory ?? [], renderDate);
  const yearGoalStreak = calcYearGoalStreak(data.yearGoal, data.yearGoalDate, data.yearGoalHistory ?? [], renderDate);
  // intentionLast7 / intentionSetCount7 / intentionDoneCount7: already computed before calcTodayInsight
  // (see above) so intentionWeekDoneRate could feed the intention_week_* insight badges.
  // Note: updateIntention preserves history entries when the user clears today's intention
  // ("leave history unchanged so the last set text is preserved for reflection"). So `set: !!entry`
  // signals engagement on that day (user set an intention), not necessarily that one was active at day end.
  // This aligns with the heatmap's purpose: visualizing daily intention practice, not end-of-day state.

  // habitsWeekTrend: week-over-week direction — compares cur-7 rate vs prev-7 rate using the same 14-day window.
  const habitsWeekTrend = calcHabitsWeekTrend(habitsWeekRate, habitsPrevWeekRate);
  const habitsBadge = calcHabitsBadge({
    habitCount: habitsArr.length,
    doneToday: habitsDoneToday,
    atRisk: habitsAtRisk,
    weekRate: habitsWeekRate,
    weekTrend: habitsWeekTrend,
    perfectStreak: habitsPerfectStreak,
  });

  // Derived: Projects section badge — focuses on non-done projects; shared with PomodoroTimer via focusProject.
  const projectsArr = data.projects ?? [];
  const focusProject = projectsArr.find(p => p.isFocus && p.status !== "done");
  const projectsBadge = calcProjectsBadge({
    projects: projectsArr,
    last7Days,
    todayMidnight,
    pomodoroHistory: data.pomodoroHistory,
    focusProjectName: focusProject?.name,
  });

  // intentionWeekTrend: ↑/↓/→ comparing this week's intention done rate vs last week (null when no prev baseline).
  const intentionWeekTrend = calcIntentionWeekTrend(
    last14Days, todayStr, data.todayIntention, data.todayIntentionDone, data.intentionHistory ?? [],
  );

  // Derived: Direction badge — shows year/month/week goal + intention status + quote count for quick overview when collapsed.
  // Pure function extracted to src/lib/direction.ts for testability.
  const directionBadge = calcDirectionBadge({
    yearGoal: data.yearGoal, yearGoalDone: data.yearGoalDone,
    quarterGoal: data.quarterGoal, quarterGoalDone: data.quarterGoalDone,
    monthGoal: data.monthGoal, monthGoalDone: data.monthGoalDone,
    weekGoal: data.weekGoal, weekGoalDone: data.weekGoalDone,
    todayIntention: data.todayIntention, todayIntentionDone: data.todayIntentionDone,
    intentionConsecutiveDays,
    intentionSetCount7,
    intentionDoneCount7,
    intentionWeekTrend,
    quotesCount: (data.quotes ?? []).length,
    daysLeftYear, daysLeftQuarter, daysLeftMonth, daysLeftWeek,
    weekGoalPastDoneStreak, monthGoalPastDoneStreak,
    quarterGoalPastDoneStreak, yearGoalPastDoneStreak,
  });

  return (
    <div
      ref={containerRef}
      style={{
        ...s.container,
        background: `rgba(${theme.bgRgb}, ${settings.opacity})`,
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Drag handle ── */}
      <DragBar
        hovered={hovered}
        onSettingsChange={updateSettings}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen(o => !o)}
        currentTheme={settings.theme}
        pinned={settings.pinned ?? false}
        opacity={settings.opacity}
        widgetWidth={settings.size.width ?? 380}
        // settings.size.height is never synced back from useWindowResize (height is content-driven,
        // not stored in settings), so spreading settings.size here safely retains the default height.
        onWidthChange={w => updateSettings({ size: { ...settings.size, width: w } })}
      />

      {/* ── Content ── */}
      <div style={s.content}>
        <Clock
          use12h={settings.clockFormat === "12h"}
          accent={themeAccent}
          onToggleFormat={() => updateSettings({ clockFormat: settings.clockFormat === "12h" ? "24h" : "12h" })}
          dailyScore={dailyScore}
          momentumHistory={data.momentumHistory}
          insight={todayInsight ?? undefined}
          momentumStreak={momentumStreak}
          weekAvg={momentumWeekAvg ?? undefined}
        />

        {(data.sectionOrder ?? DEFAULT_SECTION_ORDER).map((key, idx, order) => {
          if (hiddenSections.includes(key)) return null;
          const visibleOrder = order.filter(k => !hiddenSections.includes(k));
          const visibleIdx = visibleOrder.indexOf(key);
          const up = visibleIdx > 0 ? () => moveSection(key, -1) : undefined;
          const dn = visibleIdx < visibleOrder.length - 1 ? () => moveSection(key, 1) : undefined;
          if (key === "projects") return (
            <Fragment key="projects">
              <SectionLabel accent={themeAccent} collapsed={collapsed.includes("projects")} onToggle={() => toggleSection("projects")} badge={projectsBadge} onMoveUp={up} onMoveDown={dn}>Projects</SectionLabel>
              {!collapsed.includes("projects") && (
                <ProjectList projects={data.projects} onUpdate={updateProject} onProjectsChange={updateProjects} pat={settings.githubPat} onRefreshAll={refreshAllProjects} sessionsToday={pomodoroSessionsToday} sessionGoal={data.pomodoroSessionGoal} accent={themeAccent} />
              )}
            </Fragment>
          );
          if (key === "streaks") return (
            <Fragment key="streaks">
              <SectionLabel accent={themeAccent} collapsed={collapsed.includes("streaks")} onToggle={() => toggleSection("streaks")} badge={habitsBadge} onMoveUp={up} onMoveDown={dn}>Streaks</SectionLabel>
              {!collapsed.includes("streaks") && (
                <HabitStreak habits={data.habits} onUpdate={updateHabit} onHabitsChange={updateHabits} accent={themeAccent} onMilestoneReached={handleHabitMilestone} soundEnabled={data.habitsSound} onSoundChange={updateHabitsSound} />
              )}
            </Fragment>
          );
          if (key === "pomodoro") return (
            <Fragment key="pomodoro">
              {loaded && (
                <PomodoroTimer
                  initialDurations={data.pomodoroDurations}
                  onDurationsChange={updatePomodoroDurations}
                  initialAutoStart={data.pomodoroAutoStart}
                  onAutoStartChange={updatePomodoroAutoStart}
                  sessionsToday={pomodoroSessionsToday}
                  onSessionComplete={handlePomodoroSession}
                  initialOpen={!collapsed.includes("pomodoro")}
                  onToggleOpen={() => toggleSection("pomodoro")}
                  sessionGoal={data.pomodoroSessionGoal}
                  onSessionGoalChange={updatePomodoroSessionGoal}
                  longBreakInterval={data.pomodoroLongBreakInterval}
                  onLongBreakIntervalChange={updatePomodoroLongBreakInterval}
                  initialNotify={data.pomodoroNotify}
                  onNotifyChange={updatePomodoroNotify}
                  initialSound={data.pomodoroSound}
                  onSoundChange={updatePomodoroSound}
                  sessionHistory={data.pomodoroHistory}
                  lifetimeMins={data.pomodoroLifetimeMins}
                  focusProject={focusProject?.name || undefined}
                  todayIntention={data.todayIntentionDone ? undefined : data.todayIntention}
                  onMoveUp={up}
                  onMoveDown={dn}
                  accent={themeAccent}
                />
              )}
            </Fragment>
          );
          if (key === "direction") {
            // Past intentions: filter out today, take newest 6, reverse to newest-first.
            // Computed once and shared between toggle button visibility and history panel.
            const pastIntentions = (data.intentionHistory ?? []).filter(e => e.date !== todayStr).slice(-6).reverse();
            // Intention history success rate — same metric as W/M/Q/Y goal history panels, shown when expanded.
            const intentionHistoryRate = calcGoalSuccessRate(pastIntentions);
            // Goal success rates — computed once, shared between each history panel and the toggle button.
            const weekGoalRate = calcGoalSuccessRate(data.weekGoalHistory ?? []);
            const monthGoalRate = calcGoalSuccessRate(data.monthGoalHistory ?? []);
            const quarterGoalRate = calcGoalSuccessRate(data.quarterGoalHistory ?? []);
            const yearGoalRate = calcGoalSuccessRate(data.yearGoalHistory ?? []);
            return (
              <Fragment key="direction">
                <SectionLabel accent={themeAccent} collapsed={collapsed.includes("direction")} onToggle={() => toggleSection("direction")} badge={directionBadge} onMoveUp={up} onMoveDown={dn}>Direction</SectionLabel>
                {!collapsed.includes("direction") && (
                  <>
                    {/* Year goal — auto-expires when calendar year advances; ✓ marks done; ✕ clears when set; ▾ shows past year history */}
                    <div style={{ padding: "0 14px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                        <span style={{ ...s.mono, fontSize: fontSizes.label, color: data.yearGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`${daysLeftYear}일 남음`}>Y<span style={{ color: colors.textPhantom }}>·{daysLeftYear}d</span></span>
                        <InlineEdit
                          value={data.yearGoal ?? ""}
                          onSave={updateYearGoal}
                          placeholder="올해의 목표..."
                          style={{ flex: 1, fontSize: fontSizes.xs, ...(data.yearGoal ? { color: data.yearGoalDone ? colors.textLabel : colors.textSubtle, textDecoration: data.yearGoalDone ? "line-through" : "none" } : {}) }}
                        />
                        {data.yearGoal && (
                          <button onClick={() => updateYearGoalDone(!data.yearGoalDone)} title={data.yearGoalDone ? "달성 취소" : "연간 목표 달성 완료로 표시"} style={{ background: "transparent", border: "none", cursor: "pointer", color: data.yearGoalDone ? themeAccent : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1, transition: "color 0.15s" }}>✓</button>
                        )}
                        {/* Consecutive year streak — shown when ≥2 years in a row to reward consistent goal-setting */}
                        {data.yearGoal && yearGoalStreak >= 2 && (
                          <span title={`${yearGoalStreak}년 연속 연간 목표 설정`} style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, lineHeight: 1 }}>{yearGoalStreak}🔥</span>
                        )}
                        {data.yearGoal && (
                          <button onClick={() => updateYearGoal("")} title="연간 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                        )}
                        {(data.yearGoalHistory ?? []).length > 0 && (
                          <button
                            onClick={() => setShowYearGoalHistory(h => !h)}
                            title={showYearGoalHistory ? "연간 목표 이력 숨기기" : "이전 연간 목표 보기"}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: showYearGoalHistory ? colors.textSubtle : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                          >
                            {showYearGoalHistory ? "▴" : "▾"}
                          </button>
                        )}
                      </div>
                      <div style={{ height: 2, background: colors.borderSubtle, borderRadius: radius.bar }}>
                        <div style={{ height: "100%", width: `${Math.round(yearElapsedFrac * 100)}%`, background: `${themeAccent}28`, borderRadius: radius.bar, transition: "width 0.3s ease" }} />
                      </div>
                      {/* 4-year goal heatmap — mirrors quarter goal heatmap; accent=set+done, dim=set-only, ghost=not set */}
                      {yearGoalHeatmap.setCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, paddingTop: 3 }}>
                          {yearGoalHeatmap.years.map(({ year, set, done }, i) => {
                            const yearsAgo = yearGoalHeatmap.years.length - 1 - i;
                            const label = yearsAgo === 0 ? "올해" : `${yearsAgo}년 전`;
                            return (
                              <div
                                key={year}
                                title={`${label}${set ? (done ? " · 달성" : " · 설정만") : " · 없음"}`}
                                style={{
                                  width: 4, height: 4, borderRadius: "50%",
                                  background: done ? themeAccent : set ? colors.textPhantom : colors.borderSubtle,
                                  opacity: done ? 0.9 : 0.55,
                                }}
                              />
                            );
                          })}
                          <span
                            title={`최근 4년 목표 달성 ${yearGoalHeatmap.doneCount}/${yearGoalHeatmap.setCount}년`}
                            style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                          >
                            {yearGoalHeatmap.doneCount}/{yearGoalHeatmap.setCount}✓
                          </span>
                        </div>
                      )}
                      {showYearGoalHistory && (data.yearGoalHistory ?? []).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {yearGoalRate && (
                            <div style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginBottom: 3, opacity: 0.7 }}>
                              {yearGoalRate.done}/{yearGoalRate.total} 달성 · {yearGoalRate.pct}%
                            </div>
                          )}
                          {[...(data.yearGoalHistory ?? [])].reverse().map(e => (
                            <div key={e.date} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                              <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0, minWidth: 32 }}>{e.date}</span>
                              {e.done && <span style={{ fontSize: fontSizes.mini, color: themeAccent, flexShrink: 0, lineHeight: 1.4 }}>✓</span>}
                              <span style={{ fontSize: fontSizes.mini, color: colors.textLabel, lineHeight: 1.4, opacity: e.done ? 0.55 : 1 }}>{e.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Quarter goal — auto-expires when calendar quarter advances; ✓ marks done; ✕ clears when set; ▾ shows past quarter history */}
                    <div style={{ padding: "0 14px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                        <span style={{ ...s.mono, fontSize: fontSizes.label, color: data.quarterGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`Q${currentQtr} · ${daysLeftQuarter}일 남음`}>Q{currentQtr}<span style={{ color: colors.textPhantom }}>·{daysLeftQuarter}d</span></span>
                        <InlineEdit
                          value={data.quarterGoal ?? ""}
                          onSave={updateQuarterGoal}
                          placeholder="이번 분기 목표..."
                          style={{ flex: 1, fontSize: fontSizes.xs, ...(data.quarterGoal ? { color: data.quarterGoalDone ? colors.textLabel : colors.textSubtle, textDecoration: data.quarterGoalDone ? "line-through" : "none" } : {}) }}
                        />
                        {data.quarterGoal && (
                          <button onClick={() => updateQuarterGoalDone(!data.quarterGoalDone)} title={data.quarterGoalDone ? "달성 취소" : "분기 목표 달성 완료로 표시"} style={{ background: "transparent", border: "none", cursor: "pointer", color: data.quarterGoalDone ? themeAccent : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1, transition: "color 0.15s" }}>✓</button>
                        )}
                        {/* Consecutive quarter streak — shown when ≥2 quarters in a row */}
                        {data.quarterGoal && quarterGoalStreak >= 2 && (
                          <span title={`${quarterGoalStreak}분기 연속 분기 목표 설정`} style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, lineHeight: 1 }}>{quarterGoalStreak}🔥</span>
                        )}
                        {data.quarterGoal && (
                          <button onClick={() => updateQuarterGoal("")} title="분기 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                        )}
                        {(data.quarterGoalHistory ?? []).length > 0 && (
                          <button
                            onClick={() => setShowQuarterGoalHistory(h => !h)}
                            title={showQuarterGoalHistory ? "분기 목표 이력 숨기기" : "이전 분기 목표 보기"}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: showQuarterGoalHistory ? colors.textSubtle : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                          >
                            {showQuarterGoalHistory ? "▴" : "▾"}
                          </button>
                        )}
                      </div>
                      <div style={{ height: 2, background: colors.borderSubtle, borderRadius: radius.bar }}>
                        <div style={{ height: "100%", width: `${Math.round(quarterElapsedFrac * 100)}%`, background: `${themeAccent}28`, borderRadius: radius.bar, transition: "width 0.3s ease" }} />
                      </div>
                      {/* 4-quarter goal heatmap — mirrors month goal heatmap; accent=set+done, dim=set-only, ghost=not set */}
                      {quarterGoalHeatmap.setCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, paddingTop: 3 }}>
                          {quarterGoalHeatmap.quarters.map(({ quarter, set, done }, i) => {
                            const quartersAgo = quarterGoalHeatmap.quarters.length - 1 - i;
                            const label = quartersAgo === 0 ? "이번 분기" : `${quartersAgo}분기 전`;
                            return (
                              <div
                                key={quarter}
                                title={`${label}${set ? (done ? " · 달성" : " · 설정만") : " · 없음"}`}
                                style={{
                                  width: 4, height: 4, borderRadius: "50%",
                                  background: done ? themeAccent : set ? colors.textPhantom : colors.borderSubtle,
                                  opacity: done ? 0.9 : 0.55,
                                }}
                              />
                            );
                          })}
                          <span
                            title={`최근 4분기 목표 달성 ${quarterGoalHeatmap.doneCount}/${quarterGoalHeatmap.setCount}분기`}
                            style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                          >
                            {quarterGoalHeatmap.doneCount}/{quarterGoalHeatmap.setCount}✓
                          </span>
                        </div>
                      )}
                      {showQuarterGoalHistory && (data.quarterGoalHistory ?? []).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {quarterGoalRate && (
                            <div style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginBottom: 3, opacity: 0.7 }}>
                              {quarterGoalRate.done}/{quarterGoalRate.total} 달성 · {quarterGoalRate.pct}%
                            </div>
                          )}
                          {[...(data.quarterGoalHistory ?? [])].reverse().map(e => (
                            <div key={e.date} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                              <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0, minWidth: 48 }}>{e.date}</span>
                              {e.done && <span style={{ fontSize: fontSizes.mini, color: themeAccent, flexShrink: 0, lineHeight: 1.4 }}>✓</span>}
                              <span style={{ fontSize: fontSizes.mini, color: colors.textLabel, lineHeight: 1.4, opacity: e.done ? 0.55 : 1 }}>{e.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Month goal — auto-expires when calendar month advances; ✓ marks done; ✕ clears when set; ▾ shows past month history */}
                    <div style={{ padding: "0 14px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                        <span style={{ ...s.mono, fontSize: fontSizes.label, color: data.monthGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`M${currentMonth} · ${daysLeftMonth}일 남음`}>M{currentMonth}<span style={{ color: colors.textPhantom }}>·{daysLeftMonth}d</span></span>
                        <InlineEdit
                          value={data.monthGoal ?? ""}
                          onSave={updateMonthGoal}
                          placeholder="이번 달 목표..."
                          style={{ flex: 1, fontSize: fontSizes.xs, ...(data.monthGoal ? { color: data.monthGoalDone ? colors.textLabel : colors.textSubtle, textDecoration: data.monthGoalDone ? "line-through" : "none" } : {}) }}
                        />
                        {data.monthGoal && (
                          <button onClick={() => updateMonthGoalDone(!data.monthGoalDone)} title={data.monthGoalDone ? "달성 취소" : "월간 목표 달성 완료로 표시"} style={{ background: "transparent", border: "none", cursor: "pointer", color: data.monthGoalDone ? themeAccent : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1, transition: "color 0.15s" }}>✓</button>
                        )}
                        {/* Consecutive month streak — shown when ≥2 months in a row */}
                        {data.monthGoal && monthGoalStreak >= 2 && (
                          <span title={`${monthGoalStreak}달 연속 월간 목표 설정`} style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, lineHeight: 1 }}>{monthGoalStreak}🔥</span>
                        )}
                        {data.monthGoal && (
                          <button onClick={() => updateMonthGoal("")} title="월간 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                        )}
                        {(data.monthGoalHistory ?? []).length > 0 && (
                          <button
                            onClick={() => setShowMonthGoalHistory(h => !h)}
                            title={showMonthGoalHistory ? "월간 목표 이력 숨기기" : "이전 월간 목표 보기"}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: showMonthGoalHistory ? colors.textSubtle : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                          >
                            {showMonthGoalHistory ? "▴" : "▾"}
                          </button>
                        )}
                      </div>
                      <div style={{ height: 2, background: colors.borderSubtle, borderRadius: radius.bar }}>
                        <div style={{ height: "100%", width: `${Math.round(monthElapsedFrac * 100)}%`, background: `${themeAccent}28`, borderRadius: radius.bar, transition: "width 0.3s ease" }} />
                      </div>
                      {/* 6-month goal heatmap — mirrors week goal heatmap; accent=set+done, dim=set-only, ghost=not set */}
                      {monthGoalHeatmap.setCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, paddingTop: 3 }}>
                          {monthGoalHeatmap.months.map(({ month, set, done }, i) => {
                            const monthsAgo = monthGoalHeatmap.months.length - 1 - i;
                            const label = monthsAgo === 0 ? "이번 달" : `${monthsAgo}달 전`;
                            return (
                              <div
                                key={month}
                                title={`${label}${set ? (done ? " · 달성" : " · 설정만") : " · 없음"}`}
                                style={{
                                  width: 4, height: 4, borderRadius: "50%",
                                  background: done ? themeAccent : set ? colors.textPhantom : colors.borderSubtle,
                                  opacity: done ? 0.9 : 0.55,
                                }}
                              />
                            );
                          })}
                          <span
                            title={`최근 6달 목표 달성 ${monthGoalHeatmap.doneCount}/${monthGoalHeatmap.setCount}달`}
                            style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                          >
                            {monthGoalHeatmap.doneCount}/{monthGoalHeatmap.setCount}✓
                          </span>
                        </div>
                      )}
                      {showMonthGoalHistory && (data.monthGoalHistory ?? []).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {monthGoalRate && (
                            <div style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginBottom: 3, opacity: 0.7 }}>
                              {monthGoalRate.done}/{monthGoalRate.total} 달성 · {monthGoalRate.pct}%
                            </div>
                          )}
                          {[...(data.monthGoalHistory ?? [])].reverse().map(e => (
                            <div key={e.date} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                              <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0, minWidth: 44 }}>{e.date}</span>
                              {e.done && <span style={{ fontSize: fontSizes.mini, color: themeAccent, flexShrink: 0, lineHeight: 1.4 }}>✓</span>}
                              <span style={{ fontSize: fontSizes.mini, color: colors.textLabel, lineHeight: 1.4, opacity: e.done ? 0.55 : 1 }}>{e.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Week goal — auto-expires when ISO week advances; ✓ marks done; ✕ clears when set; ▾ shows past week history */}
                    <div style={{ padding: "0 14px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                        <span style={{ ...s.mono, fontSize: fontSizes.label, color: data.weekGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`W${currentWeek} · ${daysLeftWeek}일 남음`}>W{currentWeek}<span style={{ color: colors.textPhantom }}>·{daysLeftWeek}d</span></span>
                        <InlineEdit
                          value={data.weekGoal ?? ""}
                          onSave={updateWeekGoal}
                          placeholder="이번 주 목표..."
                          style={{ flex: 1, fontSize: fontSizes.xs, ...(data.weekGoal ? { color: data.weekGoalDone ? colors.textLabel : colors.textSubtle, textDecoration: data.weekGoalDone ? "line-through" : "none" } : {}) }}
                        />
                        {data.weekGoal && (
                          <button onClick={() => updateWeekGoalDone(!data.weekGoalDone)} title={data.weekGoalDone ? "달성 취소" : "주간 목표 달성 완료로 표시"} style={{ background: "transparent", border: "none", cursor: "pointer", color: data.weekGoalDone ? themeAccent : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1, transition: "color 0.15s" }}>✓</button>
                        )}
                        {/* Consecutive week streak — shown when ≥2 weeks in a row to reward consistent goal-setting */}
                        {data.weekGoal && weekGoalStreak >= 2 && (
                          <span title={`${weekGoalStreak}주 연속 주간 목표 설정`} style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, lineHeight: 1 }}>{weekGoalStreak}🔥</span>
                        )}
                        {data.weekGoal && (
                          <button onClick={() => updateWeekGoal("")} title="주간 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                        )}
                        {/* Toggle past week goal history; only visible when past entries exist */}
                        {(data.weekGoalHistory ?? []).length > 0 && (
                          <button
                            onClick={() => setShowWeekGoalHistory(h => !h)}
                            title={showWeekGoalHistory ? "주간 목표 이력 숨기기" : "이전 주간 목표 보기"}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: showWeekGoalHistory ? colors.textSubtle : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                          >
                            {showWeekGoalHistory ? "▴" : "▾"}
                          </button>
                        )}
                      </div>
                      <div style={{ height: 2, background: colors.borderSubtle, borderRadius: radius.bar }}>
                        <div style={{ height: "100%", width: `${Math.round(weekElapsedFrac * 100)}%`, background: `${themeAccent}28`, borderRadius: radius.bar, transition: "width 0.3s ease" }} />
                      </div>
                      {/* 7-week goal heatmap — mirrors intention heatmap; accent=set+done, dim=set-only, ghost=not set */}
                      {weekGoalHeatmap.setCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, paddingTop: 3 }}>
                          {weekGoalHeatmap.weeks.map(({ week, set, done }, i) => {
                            const weeksAgo = 6 - i;
                            const label = weeksAgo === 0 ? "이번 주" : `${weeksAgo}주 전`;
                            return (
                              <div
                                key={week}
                                title={`${label}${set ? (done ? " · 달성" : " · 설정만") : " · 없음"}`}
                                style={{
                                  width: 4, height: 4, borderRadius: "50%",
                                  background: done ? themeAccent : set ? colors.textPhantom : colors.borderSubtle,
                                  opacity: done ? 0.9 : 0.55,
                                }}
                              />
                            );
                          })}
                          <span
                            title={`최근 7주 목표 달성 ${weekGoalHeatmap.doneCount}/${weekGoalHeatmap.setCount}주`}
                            style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                          >
                            {weekGoalHeatmap.doneCount}/{weekGoalHeatmap.setCount}✓
                          </span>
                        </div>
                      )}
                      {/* Past week goal history — up to 8 previous weeks, newest first */}
                      {showWeekGoalHistory && (data.weekGoalHistory ?? []).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {weekGoalRate && (
                            <div style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginBottom: 3, opacity: 0.7 }}>
                              {weekGoalRate.done}/{weekGoalRate.total} 달성 · {weekGoalRate.pct}%
                            </div>
                          )}
                          {[...(data.weekGoalHistory ?? [])].reverse().map(e => (
                            <div key={e.date} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                              <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0, minWidth: 48 }}>{e.date}</span>
                              {e.done && <span style={{ fontSize: fontSizes.mini, color: themeAccent, flexShrink: 0, lineHeight: 1.4 }}>✓</span>}
                              <span style={{ fontSize: fontSizes.mini, color: colors.textLabel, lineHeight: 1.4, opacity: e.done ? 0.55 : 1 }}>{e.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Today's intention — a one-line focus phrase set by the user; ✓ marks done; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <InlineEdit
                        value={data.todayIntention ?? ""}
                        onSave={updateIntention}
                        placeholder="오늘의 의도..."
                        style={{ flex: 1, fontStyle: "italic", fontSize: fontSizes.sm, ...(data.todayIntention ? { color: data.todayIntentionDone ? colors.textLabel : colors.textMid, textDecoration: data.todayIntentionDone ? "line-through" : "none" } : {}) }}
                      />
                      {/* Done toggle — only visible when intention is set; accent when done, ghost when pending */}
                      {data.todayIntention && (
                        <button
                          onClick={() => updateIntentionDone(!data.todayIntentionDone)}
                          title={data.todayIntentionDone ? "달성 취소" : "오늘의 의도 달성 완료로 표시"}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: data.todayIntentionDone ? themeAccent : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1, transition: "color 0.15s" }}
                        >✓</button>
                      )}
                      {/* Consecutive intention streak — shown when ≥2 days in a row to reward consistency */}
                      {data.todayIntention && intentionConsecutiveDays >= 2 && (
                        <span title={`${intentionConsecutiveDays}일 연속 의도 설정`} style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, lineHeight: 1 }}>{intentionConsecutiveDays}🔥</span>
                      )}
                      {data.todayIntention && (
                        <button onClick={() => updateIntention("")} title="의도 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                      )}
                      {/* Toggle past intention history; only visible when past entries exist */}
                      {pastIntentions.length > 0 && (
                        <button
                          onClick={() => setShowHistory(h => !h)}
                          title={showHistory ? "이력 숨기기" : "이전 의도 보기"}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: showHistory ? colors.textSubtle : colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                        >
                          {showHistory ? "▴" : "▾"}
                        </button>
                      )}
                    </div>
                    {/* 7-day intention completion heatmap — visible once any day in the window has an intention.
                        Dot legend: accent-filled = set+done; dim = set but not done; ghost = no intention. */}
                    {intentionSetCount7 > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 14px 4px" }}>
                        {intentionLast7.map(({ date, set, done }, i) => {
                          // i=0 → 6daysAgo (relDaysAgo=6), i=6 → today (relDaysAgo=0)
                          const relDaysAgo = 6 - i;
                          const label = relDaysAgo === 0 ? "오늘" : relDaysAgo === 1 ? "어제" : `${relDaysAgo}일 전`;
                          return (
                            <div
                              key={date}
                              title={`${label}${set ? (done ? " · 달성" : " · 설정만") : " · 없음"}`}
                              style={{
                                width: 4, height: 4, borderRadius: "50%",
                                // Three distinct states: accent=done, textPhantom=set-not-done, borderSubtle=ghost
                                // textPhantom (rgba 0.25) vs borderSubtle (rgba 0.06) at same opacity → ~4× contrast ratio
                                background: done ? themeAccent : set ? colors.textPhantom : colors.borderSubtle,
                                opacity: done ? 0.9 : 0.55,
                              }}
                            />
                          );
                        })}
                        <span
                          title={`최근 7일 의도 달성 ${intentionDoneCount7}/${intentionSetCount7}일`}
                          style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                        >
                          {intentionDoneCount7}/{intentionSetCount7}✓
                        </span>
                      </div>
                    )}
                    {/* Past intention history — up to 6 previous days, newest first */}
                    {showHistory && pastIntentions.length > 0 && (
                      <div style={{ padding: "0 14px 6px" }}>
                        {intentionHistoryRate && (
                          <div style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginBottom: 3, opacity: 0.7 }}>
                            {intentionHistoryRate.done}/{intentionHistoryRate.total} 달성 · {intentionHistoryRate.pct}%
                          </div>
                        )}
                        {pastIntentions.map(e => (
                          <div key={e.date} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                            <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0, minWidth: 32 }}>{e.date.slice(5)}</span>
                            {e.done && <span style={{ fontSize: fontSizes.mini, color: themeAccent, flexShrink: 0, lineHeight: 1.4 }}>✓</span>}
                            <span style={{ fontSize: fontSizes.xs, color: colors.textLabel, fontStyle: "italic", lineHeight: 1.4, opacity: e.done ? 0.55 : 1 }}>{e.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <QuoteRotator quotes={data.quotes} onUpdate={updateQuotes} rotationInterval={data.quoteInterval} onIntervalChange={updateQuoteInterval} accent={themeAccent} />
                  </>
                )}
              </Fragment>
            );
          }
          return null;
        })}

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 12,
          borderTop: `1px solid ${colors.borderFaint}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, letterSpacing: 2, textTransform: "uppercase" }}>
            Vision Widget v0.1
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {projectsArr.map(p => {
              // Neutral fallback for unknown status values from deserialized JSON
              const sc = PROJECT_STATUS_COLORS[p.status] ?? colors.textDim;
              const isFocused = !!p.isFocus;
              // Done projects can clear a stale focus but cannot be newly focused.
              const canFocus = p.status !== "done" || isFocused;
              return (
                <div
                  key={p.id}
                  title={isFocused ? `★ ${p.name} (집중 중) — 클릭하여 해제` : canFocus ? `${p.name} · ${p.status} — 클릭하여 집중 표시` : `${p.name} · 완료`}
                  onClick={canFocus ? () => updateProject(p.id, { isFocus: isFocused ? undefined : true }) : undefined}
                  style={{
                    width: 20, height: 20, borderRadius: radius.chip,
                    background: isFocused ? `${colors.statusProgress}22` : `${sc}22`,
                    border: `1px solid ${isFocused ? colors.statusProgress + "66" : sc + "44"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    ...s.mono, fontSize: fontSizes.mini,
                    color: isFocused ? colors.statusProgress : sc,
                    fontWeight: 600,
                    cursor: canFocus ? "pointer" : "default",
                    transition: "border-color 0.2s, color 0.2s, background 0.2s",
                  }}
                >
                  {isFocused ? "★" : (p.name.trim()[0] ?? "?")}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Settings panel ── */}
      {settingsOpen && (
        <SettingsPanel settings={settings} onUpdate={updateSettings} widgetData={data} onImport={(imported) => { if (imported.hiddenSections !== undefined) { setHiddenSections(imported.hiddenSections); hiddenSectionsRef.current = imported.hiddenSections; } persist(imported); }} hiddenSections={hiddenSections} onHiddenSectionsChange={(next) => { setHiddenSections(next); hiddenSectionsRef.current = next; persist({ ...dataRef.current, hiddenSections: next }); }} />
      )}
    </div>
  );
}
