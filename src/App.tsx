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
import { calcIntentionStreak, calcIntentionWeek } from "./lib/intention";
import { calcHabitsWeekRate, calcHabitsWeekTrend, calcHabitsBadge, calcPerfectDayStreak } from "./lib/habits";
import { isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, calcGoalSuccessRate, calcLastNWeeks, calcWeekGoalHeatmap, calcLastNMonths, calcMonthGoalHeatmap, calcLastNQuarters, calcQuarterGoalHeatmap, calcLastNYears, calcYearGoalHeatmap } from "./lib/goalPeriods";
import { calcGoalExpiry } from "./lib/goalExpiry";
import { calcDirectionBadge } from "./lib/direction";
import { calcProjectsBadge } from "./lib/projects";
import { calcTodaySessionCount, updatePomodoroHistory } from "./lib/pomodoro";
import { calcDailyScore, updateMomentumHistory } from "./lib/momentum";
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
          if (needsSave) await invoke("save_data", { data: resolvedData });
        }
      } finally {
        setTimeout(() => setLoaded(true), 100);
      }
    })();
  }, []);

  const persist = useCallback(async (next: WidgetData) => {
    setData(next);
    await invoke("save_data", { data: next });
  }, []);

  // Mirror current data in a ref so interval callbacks always see the latest state (avoids stale closure)
  const dataRef = useRef(data);
  dataRef.current = data;

  const updateHabit = useCallback((i: number, patch: Partial<Habit>) => {
    const snapshot = dataRef.current;
    const next = { ...snapshot, habits: snapshot.habits.map((h, idx) =>
      idx === i ? { ...h, ...patch } : h
    )};
    persist(next);
  }, [persist]);

  const updateProject = useCallback((id: number, patch: Partial<Project>) => {
    const snapshot = dataRef.current;
    const next = { ...snapshot, projects: snapshot.projects.map(p =>
      p.id === id ? { ...p, ...patch } : p
    )};
    persist(next);
  }, [persist]);

  // Atomic batch update for GitHub polling — applies all results in one persist
  // to avoid the stale-closure overwrite race when multiple projects complete in parallel.
  const batchUpdateProjects = useCallback((updates: Array<{ id: number; patch: Partial<Project> }>) => {
    if (updates.length === 0) return;
    const snapshot = dataRef.current;
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
    persist({ ...dataRef.current, habits });
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
    // Mark today as notified and send the celebration notification.
    persist({ ...dataRef.current, habitsAllDoneDate: today });
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
        if (!ok) return;
        sendNotification({ title: "Vision Widget", body: `✓ 오늘의 습관 ${habits.length}개 모두 완료!` });
      } catch { /* not available in browser dev mode */ }
    })();
  }, [data.habits, data.habitsAllDoneDate, loaded, persist]);

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
    persist({ ...data, projects });
  }, [data, persist]);

  const updateQuotes = useCallback((quotes: string[]) => {
    persist({ ...data, quotes });
  }, [data, persist]);

  const updateQuoteInterval = useCallback((quoteInterval: number) => {
    persist({ ...data, quoteInterval });
  }, [data, persist]);

  const updateIntention = useCallback((todayIntention: string) => {
    const snapshot = dataRef.current;
    const intention = todayIntention !== "" ? todayIntention : undefined;
    // Track the date when the intention was last set so midnight reset can clear stale values
    const today = new Date().toLocaleDateString("sv");
    const todayIntentionDate = intention ? today : undefined;
    // Append/update today's entry in rolling 7-day history when setting a non-empty intention.
    // When clearing, leave history unchanged so the last set text is preserved for reflection.
    const history: IntentionEntry[] = snapshot.intentionHistory ?? [];
    // preserve done (single source: todayIntentionDone) when text is unchanged — same contract as below
    const updatedHistory = intention
      ? [...history.filter(e => e.date !== today), {
          date: today, text: intention,
          ...(snapshot.todayIntentionDone && intention === snapshot.todayIntention ? { done: true } : {}),
        }].slice(-7)
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
      // today entry absent + done=true: upsert so done survives midnight reset
      // done=false: skip — no history entry exists, nothing to clear
      updatedHistory = [...history, { date: today, text: snapshot.todayIntention, done: true }].slice(-7);
    } else {
      updatedHistory = history;
    }
    // Only meaningful when an intention exists; false is stored as absent to keep JSON lean
    persist({
      ...snapshot,
      todayIntentionDone: done || undefined,
      intentionHistory: updatedHistory.length > 0 ? updatedHistory : undefined,
    });
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
        sendNotification({ title: "Vision Widget", body: "🎉 이번 주 목표 달성!" });
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
        sendNotification({ title: "Vision Widget", body: "🏆 이번 달 목표 달성!" });
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
        sendNotification({ title: "Vision Widget", body: "🌟 이번 분기 목표 달성!" });
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
        sendNotification({ title: "Vision Widget", body: "💎 올해 목표 달성!" });
      } catch { /* Notification not available in browser dev mode */ }
    })();
  }, [persist]);

  const updatePomodoroDurations = useCallback((pomodoroDurations: { focus: number; break: number; longBreak: number }) => {
    persist({ ...data, pomodoroDurations });
  }, [data, persist]);

  const updatePomodoroAutoStart = useCallback((pomodoroAutoStart: boolean) => {
    persist({ ...data, pomodoroAutoStart });
  }, [data, persist]);

  const updatePomodoroSessionGoal = useCallback((pomodoroSessionGoal: number | undefined) => {
    persist({ ...data, pomodoroSessionGoal });
  }, [data, persist]);

  const updatePomodoroLongBreakInterval = useCallback((pomodoroLongBreakInterval: number) => {
    persist({ ...data, pomodoroLongBreakInterval });
  }, [data, persist]);

  const updatePomodoroNotify = useCallback((pomodoroNotify: boolean) => {
    // Only persist false — absent/undefined means enabled (matches absent=default convention)
    persist({ ...data, pomodoroNotify: pomodoroNotify ? undefined : false });
  }, [data, persist]);

  const updatePomodoroSound = useCallback((pomodoroSound: boolean) => {
    // Store true when enabled; coerce false → undefined so absent and false are both "disabled"
    persist({ ...data, pomodoroSound: pomodoroSound || undefined });
  }, [data, persist]);

  const updateHabitsSound = useCallback((habitsSound: boolean) => {
    // Store true when enabled; coerce false → undefined so absent and false are both "disabled"
    persist({ ...data, habitsSound: habitsSound || undefined });
  }, [data, persist]);

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
    const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date (sv = Swedish = ISO format)
    const count = calcTodaySessionCount(data.pomodoroSessionsDate, data.pomodoroSessions, today);
    const newHistory = updatePomodoroHistory(data.pomodoroHistory ?? [], today, count);
    // Credit session to the ★ focused project (if any) as a lifetime counter.
    const focusIdx = data.projects.findIndex(p => p.isFocus);
    const updatedProjects = focusIdx >= 0
      ? data.projects.map((p, i) =>
          i === focusIdx ? { ...p, pomodoroSessions: (p.pomodoroSessions ?? 0) + 1, lastFocusDate: today } : p
        )
      : data.projects;
    persist({ ...data, pomodoroSessionsDate: today, pomodoroSessions: count, pomodoroHistory: newHistory, projects: updatedProjects, pomodoroLifetimeMins: (data.pomodoroLifetimeMins ?? 0) + focusMins });
    // Notify when the daily session goal is hit exactly (not on every subsequent session).
    // Respects pomodoroNotify: absent/true = enabled, false = disabled.
    if (data.pomodoroSessionGoal !== undefined && data.pomodoroSessionGoal > 0 && count === data.pomodoroSessionGoal && data.pomodoroNotify !== false) {
      (async () => {
        try {
          let ok = await isPermissionGranted();
          if (!ok) { const perm = await requestPermission(); ok = perm === "granted"; }
          if (!ok) return;
          sendNotification({ title: "Vision Widget", body: `🎯 오늘의 집중 목표 ${count}세션 달성!` });
        } catch { /* not available in browser dev mode */ }
      })();
    }
  }, [data, persist]);

  const toggleSection = useCallback((section: SectionKey) => {
    const current = data.collapsedSections ?? [];
    const next = current.includes(section)
      ? current.filter(s => s !== section)
      : [...current, section];
    persist({ ...data, collapsedSections: next });
  }, [data, persist]);

  const moveSection = useCallback((section: SectionKey, dir: -1 | 1) => {
    const order = data.sectionOrder ?? DEFAULT_SECTION_ORDER;
    const i = order.indexOf(section);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    persist({ ...data, sectionOrder: next });
  }, [data, persist]);

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
  // Persist today's momentum score whenever it changes — upserts into rolling 7-day history.
  // Uses dataRef.current (not `data`) to avoid stale closure overwriting concurrent changes
  // (e.g. pomodoro session or habit check-in that updates data between renders).
  useEffect(() => {
    const current = dataRef.current;
    const stored = (current.momentumHistory ?? []).find(e => e.date === todayStr);
    if (stored && stored.score === dailyScore.score && stored.tier === dailyScore.tier) return;
    const updated = updateMomentumHistory(current.momentumHistory ?? [], todayStr, dailyScore.score, dailyScore.tier);
    persist({ ...current, momentumHistory: updated });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyScore.score, dailyScore.tier, todayStr]);

  // intentionConsecutiveDays: consecutive days (including today) on which the user has set an intention.
  // Pure function extracted to src/lib/intention.ts for testability.
  const intentionConsecutiveDays = calcIntentionStreak(
    data.todayIntention,
    todayStr,
    data.intentionHistory ?? [],
  );
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
  // last7Days: [6daysAgo, ..., yesterday, today] as YYYY-MM-DD strings (oldest→newest, HabitStreak.tsx convention).
  // Single source shared by habitsWeekRate, weekPomodoroCount, and recentlyDoneCount.
  const last7Days = calcLastNDays(todayStr, 7);
  // intentionWeek: per-day set/done status for the last 7 days — pure function extracted to src/lib/intention.ts.
  // Note: updateIntention preserves history entries when the user clears today's intention
  // ("leave history unchanged so the last set text is preserved for reflection"). So `set: !!entry`
  // signals engagement on that day (user set an intention), not necessarily that one was active at day end.
  // This aligns with the heatmap's purpose: visualizing daily intention practice, not end-of-day state.
  const { days: intentionLast7, setCount: intentionSetCount7, doneCount: intentionDoneCount7 } =
    calcIntentionWeek(last7Days, todayStr, data.todayIntention, data.todayIntentionDone, data.intentionHistory ?? []);

  // habitsWeekRate: average daily habit completion rate (%) over the last 7 days.
  // Pure functions extracted to src/lib/habits.ts for testability.
  const habitsWeekRate = calcHabitsWeekRate(habitsArr, last7Days);
  // habitsPerfectStreak: consecutive days all habits completed — same 14-day window as HabitStreak.tsx.
  const last14Days = calcLastNDays(todayStr, 14);
  const habitsPerfectStreak = calcPerfectDayStreak(habitsArr, last14Days);
  // habitsWeekTrend: ↑/↓/→ comparing this week's completion rate vs last week (null when no prev baseline).
  const habitsWeekTrend = calcHabitsWeekTrend(habitsArr, last14Days);
  const habitsBadge = calcHabitsBadge({
    habitCount: habitsArr.length,
    doneToday: habitsDoneToday,
    atRisk: habitsAtRisk,
    weekRate: habitsWeekRate,
    perfectStreak: habitsPerfectStreak,
    weekTrend: habitsWeekTrend,
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
    quotesCount: (data.quotes ?? []).length,
    daysLeftYear, daysLeftQuarter, daysLeftMonth, daysLeftWeek,
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
        />

        {(data.sectionOrder ?? DEFAULT_SECTION_ORDER).map((key, idx, order) => {
          const up = idx > 0 ? () => moveSection(key, -1) : undefined;
          const dn = idx < order.length - 1 ? () => moveSection(key, 1) : undefined;
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
                        <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.yearGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`${daysLeftYear}일 남음`}>Y<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftYear}d</span></span>
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
                        <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.quarterGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`Q${currentQtr} · ${daysLeftQuarter}일 남음`}>Q{currentQtr}<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftQuarter}d</span></span>
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
                        <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.monthGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`M${currentMonth} · ${daysLeftMonth}일 남음`}>M{currentMonth}<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftMonth}d</span></span>
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
                        <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.weekGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`W${currentWeek} · ${daysLeftWeek}일 남음`}>W{currentWeek}<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftWeek}d</span></span>
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
        <SettingsPanel settings={settings} onUpdate={updateSettings} />
      )}
    </div>
  );
}
