// ABOUTME: Vision Widget root component - composes all widget sections
// ABOUTME: Handles data loading/saving, inline patch updates, and section reorder via sectionOrder field

import { useState, useEffect, useCallback, useRef, CSSProperties, Fragment } from "react";
import type { WidgetData, Habit, Project, SectionKey, GitHubData, PomodoroDay, IntentionEntry } from "./types";
import { colors, fonts, fontSizes, radius, shadows, THEMES, PROJECT_STATUS_COLORS } from "./theme";
import { invoke, isTauri } from "./lib/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "./hooks/useSettings";
import { useWindowSync } from "./hooks/useWindowSync";
import { useWindowResize } from "./hooks/useWindowResize";
import { useGitHubSync } from "./hooks/useGitHubSync";
import { fetchRepoData } from "./lib/github";
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

// Returns ISO week string "YYYY-Www" for the given date.
// ISO weeks start on Monday; week number is defined by the Thursday of the week.
function isoWeekStr(date: Date): string {
  // Work in UTC to avoid DST distortions: move to Thursday of the ISO week
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Returns "YYYY-Q1"…"YYYY-Q4" quarter string for the given date.
function quarterStr(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

// ─── App ────────────────────────────────────────────────
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WidgetData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
          // Clear today's intention when the app loads and the date has advanced past the day it was set.
          // Requires todayIntentionDate to be present; old data without this field is left as-is
          // (date unknown — clearing would be destructive for intentions set on the same day as the update).
          const intentionStale = !!(saved.todayIntention && saved.todayIntentionDate && saved.todayIntentionDate < todayStr);
          // Clear week goal when the ISO week has advanced past the week it was set.
          const currentWeek = isoWeekStr(now);
          const weekGoalStale = !!(saved.weekGoal && saved.weekGoalDate && saved.weekGoalDate < currentWeek);
          // Clear month goal when the calendar month has advanced past the month it was set
          const currentMonth = todayStr.slice(0, 7); // "YYYY-MM" — reuse todayStr base
          const monthGoalStale = !!(saved.monthGoal && saved.monthGoalDate && saved.monthGoalDate < currentMonth);
          // Clear quarter goal when the calendar quarter has advanced past the quarter it was set
          const currentQuarter = quarterStr(now); // "YYYY-Q1"…"YYYY-Q4"
          const quarterGoalStale = !!(saved.quarterGoal && saved.quarterGoalDate && saved.quarterGoalDate < currentQuarter);
          // Clear year goal when the calendar year has advanced past the year it was set
          const currentYear = todayStr.slice(0, 4); // "YYYY" — first 4 chars of sv locale date
          const yearGoalStale = !!(saved.yearGoal && saved.yearGoalDate && saved.yearGoalDate < currentYear);
          const needsSave = hadExpired || needsIdMigration || intentionStale || weekGoalStale || monthGoalStale || quarterGoalStale || yearGoalStale;
          const resolvedData = needsSave ? {
            ...saved,
            habits: reset,
            ...(intentionStale ? { todayIntention: undefined, todayIntentionDate: undefined, todayIntentionDone: undefined } : {}),
            ...(weekGoalStale ? { weekGoal: undefined, weekGoalDate: undefined } : {}),
            ...(monthGoalStale ? { monthGoal: undefined, monthGoalDate: undefined } : {}),
            ...(quarterGoalStale ? { quarterGoal: undefined, quarterGoalDate: undefined } : {}),
            ...(yearGoalStale ? { yearGoal: undefined, yearGoalDate: undefined } : {}),
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
      const todayStr = now.toLocaleDateString("sv");
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
      // Clear today's intention when the date has advanced past the day it was set.
      // Same backward-compat rule as initial load: requires todayIntentionDate to be present.
      const intentionStale = !!(current.todayIntention && current.todayIntentionDate && current.todayIntentionDate < todayStr);
      // Clear week goal when the ISO week has advanced past the week it was set.
      const currentWeek = isoWeekStr(now);
      const weekGoalStale = !!(current.weekGoal && current.weekGoalDate && current.weekGoalDate < currentWeek);
      // Clear month goal when the calendar month has advanced past the month it was set.
      const currentMonth = now.toLocaleDateString("sv").slice(0, 7);
      const monthGoalStale = !!(current.monthGoal && current.monthGoalDate && current.monthGoalDate < currentMonth);
      // Clear quarter goal when the calendar quarter has advanced past the quarter it was set.
      const currentQuarter = quarterStr(now);
      const quarterGoalStale = !!(current.quarterGoal && current.quarterGoalDate && current.quarterGoalDate < currentQuarter);
      // Clear year goal when the calendar year has advanced past the year it was set.
      const currentYear = now.toLocaleDateString("sv").slice(0, 4);
      const yearGoalStale = !!(current.yearGoal && current.yearGoalDate && current.yearGoalDate < currentYear);
      if (!hadExpired && !intentionStale && !weekGoalStale && !monthGoalStale && !quarterGoalStale && !yearGoalStale) return;
      await persist({
        ...current,
        habits: reset,
        ...(intentionStale ? { todayIntention: undefined, todayIntentionDate: undefined, todayIntentionDone: undefined } : {}),
        ...(weekGoalStale ? { weekGoal: undefined, weekGoalDate: undefined } : {}),
        ...(monthGoalStale ? { monthGoal: undefined, monthGoalDate: undefined } : {}),
        ...(quarterGoalStale ? { quarterGoal: undefined, quarterGoalDate: undefined } : {}),
        ...(yearGoalStale ? { yearGoal: undefined, yearGoalDate: undefined } : {}),
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [loaded, persist]);

  const updateHabits = useCallback((habits: Habit[]) => {
    persist({ ...data, habits });
  }, [data, persist]);

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
    persist({ ...data, weekGoal: goal, weekGoalDate });
  }, [data, persist]);

  const updateMonthGoal = useCallback((monthGoal: string) => {
    const goal = monthGoal !== "" ? monthGoal : undefined;
    // monthGoalDate format: "YYYY-MM" — first 7 chars of the sv locale date string
    const monthGoalDate = goal ? new Date().toLocaleDateString("sv").slice(0, 7) : undefined;
    const snapshot = dataRef.current;
    persist({ ...snapshot, monthGoal: goal, monthGoalDate });
  }, [persist]);

  const updateQuarterGoal = useCallback((quarterGoal: string) => {
    const goal = quarterGoal !== "" ? quarterGoal : undefined;
    // quarterGoalDate format: "YYYY-Q1"…"YYYY-Q4" derived from current date
    const quarterGoalDate = goal ? quarterStr(new Date()) : undefined;
    const snapshot = dataRef.current;
    persist({ ...snapshot, quarterGoal: goal, quarterGoalDate });
  }, [persist]);

  const updateYearGoal = useCallback((yearGoal: string) => {
    const goal = yearGoal !== "" ? yearGoal : undefined;
    // yearGoalDate format: "YYYY" — first 4 chars of the sv locale date string
    const yearGoalDate = goal ? new Date().toLocaleDateString("sv").slice(0, 4) : undefined;
    const snapshot = dataRef.current;
    persist({ ...snapshot, yearGoal: goal, yearGoalDate });
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
    const count = data.pomodoroSessionsDate === today ? (data.pomodoroSessions ?? 0) + 1 : 1;
    // Upsert today's count into rolling history: remove old entry for today, append updated, sort, cap at 14.
    // Sorted YYYY-MM-DD strings compare lexicographically = chronologically, matching checkHistory pattern.
    const history: PomodoroDay[] = data.pomodoroHistory ?? [];
    const newHistory = [...history.filter(d => d.date !== today), { date: today, count }]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
    // Credit session to the ★ focused project (if any) as a lifetime counter.
    const focusIdx = data.projects.findIndex(p => p.isFocus);
    const updatedProjects = focusIdx >= 0
      ? data.projects.map((p, i) =>
          i === focusIdx ? { ...p, pomodoroSessions: (p.pomodoroSessions ?? 0) + 1, lastFocusDate: today } : p
        )
      : data.projects;
    persist({ ...data, pomodoroSessionsDate: today, pomodoroSessions: count, pomodoroHistory: newHistory, projects: updatedProjects, pomodoroLifetimeMins: (data.pomodoroLifetimeMins ?? 0) + focusMins });
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
  // Month/quarter: Date(y, m+1, 0) = last midnight of month m. Year: Date(y+1, 0, 0) = Dec 31 (same trick, different axis).
  // Declared largest→smallest to match usage order in directionBadge (Y→Q→M→W).
  // Design: expanded labels always show Nd; collapsed badge uses urgency thresholds (≤30/14/7/3d) for compactness.
  const daysLeftInYear    = Math.floor((new Date(todayMidnight.getFullYear() + 1, 0, 0).getTime() - todayMidnight.getTime()) / 86400000) + 1;
  const qEndMonth = Math.ceil((todayMidnight.getMonth() + 1) / 3) * 3; // 3, 6, 9, or 12
  const daysLeftInQuarter = Math.floor((new Date(todayMidnight.getFullYear(), qEndMonth, 0).getTime() - todayMidnight.getTime()) / 86400000) + 1;
  const daysLeftInMonth   = Math.floor((new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() + 1, 0).getTime() - todayMidnight.getTime()) / 86400000) + 1;
  // Week: ISO week ends Sunday. getDay() on local midnight is consistent with isoWeekStr which uses local date parts.
  const daysLeftInWeek    = todayMidnight.getDay() === 0 ? 1 : 8 - todayMidnight.getDay();
  const habitsDoneToday = habitsArr.filter(h => h.lastChecked === todayStr).length;
  // atRisk: streak > 0, last checked yesterday — semantically equivalent to HabitStreak.tsx:338's !doneToday&&streak>0&&lastChecked===yesterday
  const habitsAtRisk = habitsArr.filter(h => h.streak > 0 && h.lastChecked === yesterdayHabitsStr).length;
  // last7Days: [6daysAgo, ..., yesterday, today] as YYYY-MM-DD strings (oldest→newest, HabitStreak.tsx convention).
  // Single source shared by habitsWeekRate, weekPomodoroCount, and recentlyDoneCount.
  // Anchors to todayMidnight for DST safety.
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("sv");
  });
  // habitsWeekRate: average daily habit completion rate (%) over the last 7 days.
  // Returns null when no habit has any check within the last 7 days (avoids misleading 0%).
  const habitsWeekRate = (() => {
    if (habitsArr.length === 0) return null;
    // Require at least one check within the 7-day window before showing a rate.
    const anyInWindow = habitsArr.some(h => last7Days.some(day => h.checkHistory?.includes(day)));
    if (!anyInWindow) return null;
    const avgRate = last7Days.reduce((sum, day) => {
      return sum + habitsArr.filter(h => h.checkHistory?.includes(day)).length / habitsArr.length;
    }, 0) / 7;
    return Math.round(avgRate * 100);
  })();
  const habitsBadge = habitsArr.length > 0
    ? [
        `${habitsDoneToday}/${habitsArr.length}`,
        habitsWeekRate !== null ? `7d·${habitsWeekRate}%` : null,
        habitsAtRisk > 0 ? `⚠${habitsAtRisk}` : null,
      ].filter(Boolean).join(" · ")
    : undefined;

  // Derived: running project count + average progress for Projects section badge.
  // "active" and "in-progress" are running; "paused" is stalled; "done" is excluded from tracking.
  // Badge format: "★ <name> · 2/3 · 45% · 🍅N·7d · ⚠N · ✓N·7d" — focus project name, running/total, avg progress, weekly sessions, overdue, recent completions.
  // When projects have a deadline ≤ today (overdue or due today), appends " · ⚠N" for urgency.
  const projectsArr = data.projects ?? [];
  const nonDoneProjects = projectsArr.filter(p => p.status !== "done");
  const runningProjects = nonDoneProjects.filter(p => p.status === "active" || p.status === "in-progress");
  const runningCount = runningProjects.length;
  const avgProgress = runningCount > 0
    ? Math.round(runningProjects.reduce((s, p) => s + p.progress, 0) / runningCount)
    : null;
  // Count non-done projects with a deadline today or overdue (days <= 0).
  // Anchors to todayMidnight (same as all other 7-day windows); DST days count as 0 via Math.floor, consistent with ProjectCard deadlineDays().
  const overdueCount = nonDoneProjects.filter(p => {
    if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return false;
    const ts = new Date(p.deadline + "T00:00:00").getTime();
    if (isNaN(ts)) return false;
    return Math.floor((ts - todayMidnight.getTime()) / 86400000) <= 0;
  }).length;
  // recentlyDoneCount: projects completed within the last 7 days — weekly completion velocity.
  // Suppressed in badge when 0 (no completions this week).
  const recentlyDoneCount = projectsArr.filter(
    p => p.status === "done" && p.completedDate && last7Days.includes(p.completedDate)
  ).length;
  // Weekly pomodoro session count: sum of focus sessions in the last 7 days from pomodoroHistory.
  // Returns 0 when no history exists; badge suppresses the indicator when 0.
  const weekPomodoroCount = (() => {
    const history = data.pomodoroHistory ?? [];
    if (history.length === 0) return 0;
    return history.filter(day => last7Days.includes(day.date)).reduce((s, day) => s + day.count, 0);
  })();
  // Focus project badge: first word of the focused non-done project name, max 12 chars.
  // Shown as "★ <name>" prefix so the user can see current priority without expanding the section.
  // "done" projects are excluded to stay within the badge scope (nonDoneProjects): showing a
  // done project's name while it is not counted in the N/total would be misleading.
  const focusProject = projectsArr.find(p => p.isFocus && p.status !== "done");
  const focusBadgeName = focusProject
    ? (focusProject.name.trim().split(/\s+/)[0].slice(0, 12) || null)
    : null;
  const projectsBadge = nonDoneProjects.length > 0
    ? [
        focusBadgeName ? `★ ${focusBadgeName}` : null,
        avgProgress !== null
          ? `${runningCount}/${nonDoneProjects.length} · ${avgProgress}%`
          : `${runningCount}/${nonDoneProjects.length}`,
        weekPomodoroCount > 0 ? `🍅${weekPomodoroCount}·7d` : null,
        overdueCount > 0 ? `⚠${overdueCount}` : null,
        recentlyDoneCount > 0 ? `✓${recentlyDoneCount}·7d` : null,
      ].filter(Boolean).join(" · ")
    : undefined;

  // Derived: Direction badge — shows year/month/week goal + intention status + quote count for quick overview when collapsed.
  // Urgency thresholds: append "·Nd" remaining days when the period end is near (year ≤30d, quarter ≤14d, month ≤7d, week ≤3d).
  const directionBadge = (() => {
    const parts: string[] = [];
    if (data.yearGoal)    parts.push(daysLeftInYear    <= 30 ? `Y✓·${daysLeftInYear}d`    : "Y✓");
    if (data.quarterGoal) parts.push(daysLeftInQuarter <= 14 ? `Q✓·${daysLeftInQuarter}d` : "Q✓");
    if (data.monthGoal)   parts.push(daysLeftInMonth   <= 7  ? `M✓·${daysLeftInMonth}d`   : "M✓");
    if (data.weekGoal)    parts.push(daysLeftInWeek    <= 3  ? `W✓·${daysLeftInWeek}d`    : "W✓");
    if (data.todayIntention) parts.push(data.todayIntentionDone ? "✓✓" : "✓");
    const quotesArr = data.quotes ?? [];
    if (quotesArr.length > 0) parts.push(`${quotesArr.length}q`);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  })();

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
        />

        {(data.sectionOrder ?? DEFAULT_SECTION_ORDER).map((key, idx, order) => {
          const up = idx > 0 ? () => moveSection(key, -1) : undefined;
          const dn = idx < order.length - 1 ? () => moveSection(key, 1) : undefined;
          if (key === "projects") return (
            <Fragment key="projects">
              <SectionLabel accent={themeAccent} collapsed={collapsed.includes("projects")} onToggle={() => toggleSection("projects")} badge={projectsBadge} onMoveUp={up} onMoveDown={dn}>Projects</SectionLabel>
              {!collapsed.includes("projects") && (
                <ProjectList projects={data.projects} onUpdate={updateProject} onProjectsChange={updateProjects} pat={settings.githubPat} onRefreshAll={refreshAllProjects} sessionsToday={pomodoroSessionsToday} sessionGoal={data.pomodoroSessionGoal} />
              )}
            </Fragment>
          );
          if (key === "streaks") return (
            <Fragment key="streaks">
              <SectionLabel accent={themeAccent} collapsed={collapsed.includes("streaks")} onToggle={() => toggleSection("streaks")} badge={habitsBadge} onMoveUp={up} onMoveDown={dn}>Streaks</SectionLabel>
              {!collapsed.includes("streaks") && (
                <HabitStreak habits={data.habits} onUpdate={updateHabit} onHabitsChange={updateHabits} accent={themeAccent} />
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
                  sessionHistory={data.pomodoroHistory}
                  lifetimeMins={data.pomodoroLifetimeMins}
                  focusProject={data.projects.find(p => p.isFocus)?.name}
                  onMoveUp={up}
                  onMoveDown={dn}
                />
              )}
            </Fragment>
          );
          if (key === "direction") {
            // Past intentions: filter out today, take newest 6, reverse to newest-first.
            // Computed once and shared between toggle button visibility and history panel.
            const pastIntentions = (data.intentionHistory ?? []).filter(e => e.date !== todayStr).slice(-6).reverse();
            return (
              <Fragment key="direction">
                <SectionLabel accent={themeAccent} collapsed={collapsed.includes("direction")} onToggle={() => toggleSection("direction")} badge={directionBadge} onMoveUp={up} onMoveDown={dn}>Direction</SectionLabel>
                {!collapsed.includes("direction") && (
                  <>
                    {/* Year goal — auto-expires when calendar year advances; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.yearGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`${daysLeftInYear}일 남음`}>Y<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftInYear}d</span></span>
                      <InlineEdit
                        value={data.yearGoal ?? ""}
                        onSave={updateYearGoal}
                        placeholder="올해의 목표..."
                        style={{ flex: 1, fontSize: fontSizes.xs, ...(data.yearGoal ? { color: colors.textSubtle } : {}) }}
                      />
                      {data.yearGoal && (
                        <button onClick={() => updateYearGoal("")} title="연간 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                    {/* Quarter goal — auto-expires when calendar quarter advances; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.quarterGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`Q${currentQtr} · ${daysLeftInQuarter}일 남음`}>Q{currentQtr}<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftInQuarter}d</span></span>
                      <InlineEdit
                        value={data.quarterGoal ?? ""}
                        onSave={updateQuarterGoal}
                        placeholder="이번 분기 목표..."
                        style={{ flex: 1, fontSize: fontSizes.xs, ...(data.quarterGoal ? { color: colors.textSubtle } : {}) }}
                      />
                      {data.quarterGoal && (
                        <button onClick={() => updateQuarterGoal("")} title="분기 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                    {/* Month goal — auto-expires when calendar month advances; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.monthGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`M${currentMonth} · ${daysLeftInMonth}일 남음`}>M{currentMonth}<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftInMonth}d</span></span>
                      <InlineEdit
                        value={data.monthGoal ?? ""}
                        onSave={updateMonthGoal}
                        placeholder="이번 달 목표..."
                        style={{ flex: 1, fontSize: fontSizes.xs, ...(data.monthGoal ? { color: colors.textSubtle } : {}) }}
                      />
                      {data.monthGoal && (
                        <button onClick={() => updateMonthGoal("")} title="월간 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                    {/* Week goal — auto-expires when ISO week advances; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.weekGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }} title={`W${currentWeek} · ${daysLeftInWeek}일 남음`}>W{currentWeek}<span style={{ color: colors.textPhantom, opacity: 0.5 }}>·{daysLeftInWeek}d</span></span>
                      <InlineEdit
                        value={data.weekGoal ?? ""}
                        onSave={updateWeekGoal}
                        placeholder="이번 주 목표..."
                        style={{ flex: 1, fontSize: fontSizes.xs, ...(data.weekGoal ? { color: colors.textSubtle } : {}) }}
                      />
                      {data.weekGoal && (
                        <button onClick={() => updateWeekGoal("")} title="주간 목표 지우기" style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textGhost, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}>✕</button>
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
                    {/* Past intention history — up to 6 previous days, newest first */}
                    {showHistory && pastIntentions.length > 0 && (
                      <div style={{ padding: "0 14px 6px" }}>
                        {pastIntentions.map(e => (
                          <div key={e.date} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                            <span style={{ ...s.mono, fontSize: fontSizes.mini, color: colors.textPhantom, flexShrink: 0, minWidth: 32 }}>{e.date.slice(5)}</span>
                            {e.done && <span style={{ fontSize: fontSizes.mini, color: themeAccent, flexShrink: 0, lineHeight: 1.4 }}>✓</span>}
                            <span style={{ fontSize: fontSizes.xs, color: colors.textLabel, fontStyle: "italic", lineHeight: 1.4, opacity: e.done ? 0.55 : 1 }}>{e.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <QuoteRotator quotes={data.quotes} onUpdate={updateQuotes} rotationInterval={data.quoteInterval} onIntervalChange={updateQuoteInterval} />
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
