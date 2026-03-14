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
  useWindowResize(containerRef);

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
          const needsSave = hadExpired || needsIdMigration || intentionStale || weekGoalStale;
          const resolvedData = needsSave ? {
            ...saved,
            habits: reset,
            ...(intentionStale ? { todayIntention: undefined, todayIntentionDate: undefined } : {}),
            ...(weekGoalStale ? { weekGoal: undefined, weekGoalDate: undefined } : {}),
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
      if (!hadExpired && !intentionStale && !weekGoalStale) return;
      await persist({
        ...current,
        habits: reset,
        ...(intentionStale ? { todayIntention: undefined, todayIntentionDate: undefined } : {}),
        ...(weekGoalStale ? { weekGoal: undefined, weekGoalDate: undefined } : {}),
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
    const intention = todayIntention !== "" ? todayIntention : undefined;
    // Track the date when the intention was last set so midnight reset can clear stale values
    const today = new Date().toLocaleDateString("sv");
    const todayIntentionDate = intention ? today : undefined;
    // Append/update today's entry in rolling 7-day history when setting a non-empty intention.
    // When clearing, leave history unchanged so the last set text is preserved for reflection.
    const history: IntentionEntry[] = data.intentionHistory ?? [];
    const updatedHistory = intention
      ? [...history.filter(e => e.date !== today), { date: today, text: intention }].slice(-7)
      : history.length > 0 ? history : undefined;
    persist({ ...data, todayIntention: intention, todayIntentionDate, intentionHistory: updatedHistory });
  }, [data, persist]);

  const updateWeekGoal = useCallback((weekGoal: string) => {
    const goal = weekGoal !== "" ? weekGoal : undefined;
    const weekGoalDate = goal ? isoWeekStr(new Date()) : undefined;
    persist({ ...data, weekGoal: goal, weekGoalDate });
  }, [data, persist]);

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

  const handlePomodoroSession = useCallback(() => {
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
    persist({ ...data, pomodoroSessionsDate: today, pomodoroSessions: count, pomodoroHistory: newHistory, projects: updatedProjects });
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
  // todayStr: render-time date for Habits and Direction badge derivations (effects capture their own date at invocation time)
  const todayStr = new Date().toLocaleDateString("sv");
  // Derive yesterday from local-midnight basis (same as HabitStreak.tsx) for DST safety
  const yesterdayHabitsStr = (() => { const d = new Date(todayStr + "T00:00:00"); d.setDate(d.getDate() - 1); return d.toLocaleDateString("sv"); })();
  const habitsDoneToday = habitsArr.filter(h => h.lastChecked === todayStr).length;
  // atRisk: streak > 0, last checked yesterday — semantically equivalent to HabitStreak.tsx:338's !doneToday&&streak>0&&lastChecked===yesterday
  const habitsAtRisk = habitsArr.filter(h => h.streak > 0 && h.lastChecked === yesterdayHabitsStr).length;
  const habitsBadge = habitsArr.length > 0
    ? [
        `${habitsDoneToday}/${habitsArr.length}`,
        habitsAtRisk > 0 ? `⚠${habitsAtRisk}` : null,
      ].filter(Boolean).join(" · ")
    : undefined;

  // Derived: running project count + average progress for Projects section badge.
  // "active" and "in-progress" are running; "paused" is stalled; "done" is excluded from tracking.
  // Badge format: "2/3 · 45%" — running count / non-done count, avg progress of running projects.
  // When projects have a deadline ≤ today (overdue or due today), appends " · ⚠N" for urgency.
  const projectsArr = data.projects ?? [];
  const nonDoneProjects = projectsArr.filter(p => p.status !== "done");
  const runningProjects = nonDoneProjects.filter(p => p.status === "active" || p.status === "in-progress");
  const runningCount = runningProjects.length;
  const avgProgress = runningCount > 0
    ? Math.round(runningProjects.reduce((s, p) => s + p.progress, 0) / runningCount)
    : null;
  // Count non-done projects with a deadline today or overdue (days <= 0).
  // Uses local midnight so DST days count as 0, consistent with ProjectCard deadlineDays().
  const localMidnight = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const overdueCount = nonDoneProjects.filter(p => {
    if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return false;
    const ts = new Date(p.deadline + "T00:00:00").getTime();
    if (isNaN(ts)) return false;
    return Math.floor((ts - localMidnight) / 86400000) <= 0;
  }).length;
  const projectsBadge = nonDoneProjects.length > 0
    ? [
        avgProgress !== null
          ? `${runningCount}/${nonDoneProjects.length} · ${avgProgress}%`
          : `${runningCount}/${nonDoneProjects.length}`,
        overdueCount > 0 ? `⚠${overdueCount}` : null,
      ].filter(Boolean).join(" · ")
    : undefined;

  // Derived: Direction badge — shows week goal + intention status + quote count for quick overview when collapsed
  const directionBadge = (() => {
    const parts: string[] = [];
    if (data.weekGoal) parts.push("W✓");
    if (data.todayIntention) parts.push("✓");
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
                <ProjectList projects={data.projects} onUpdate={updateProject} onProjectsChange={updateProjects} pat={settings.githubPat} onRefreshAll={refreshAllProjects} />
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
                    {/* Week goal — auto-expires when ISO week advances; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ ...s.mono, fontSize: fontSizes.mini, color: data.weekGoal ? colors.textSubtle : colors.textPhantom, flexShrink: 0 }}>W</span>
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
                    {/* Today's intention — a one-line focus phrase set by the user; ✕ clears when set */}
                    <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <InlineEdit
                        value={data.todayIntention ?? ""}
                        onSave={updateIntention}
                        placeholder="오늘의 의도..."
                        style={{ flex: 1, fontStyle: "italic", fontSize: fontSizes.sm, ...(data.todayIntention ? { color: colors.textMid } : {}) }}
                      />
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
                            <span style={{ fontSize: fontSizes.xs, color: colors.textLabel, fontStyle: "italic", lineHeight: 1.4 }}>{e.text}</span>
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
