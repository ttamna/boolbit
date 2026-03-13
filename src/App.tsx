// ABOUTME: Vision Widget root component - composes all widget sections
// ABOUTME: Handles data loading/saving and inline patch updates for projects/habits/quotes

import { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import type { WidgetData, Habit, Project, SectionKey, GitHubData } from "./types";
import { colors, fonts, fontSizes, radius, shadows, THEMES, PROJECT_STATUS_COLORS } from "./theme";
import { invoke } from "./lib/tauri";
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
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings();

  useWindowSync({
    settings,
    settingsLoaded,
    onPositionSave: (x, y) => updateSettings({ position: { x, y } }),
  });
  useWindowResize(containerRef);

  useEffect(() => {
    (async () => {
      try {
        const saved = await invoke<WidgetData>("load_data");
        if (saved) {
          // Reset streaks for habits checked before yesterday (user missed at least one full day)
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString("sv"); // YYYY-MM-DD local
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
          const needsSave = hadExpired || needsIdMigration;
          const resolvedData = needsSave ? { ...saved, habits: reset } : saved;
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
    const next = { ...data, habits: data.habits.map((h, idx) =>
      idx === i ? { ...h, ...patch } : h
    )};
    persist(next);
  }, [data, persist]);

  const updateProject = useCallback((id: number, patch: Partial<Project>) => {
    const next = { ...data, projects: data.projects.map(p =>
      p.id === id ? { ...p, ...patch } : p
    )};
    persist(next);
  }, [data, persist]);

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
  // Runs every minute so a long-running widget corrects expiry without requiring restart.
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("sv");
      const habits = dataRef.current.habits ?? [];
      let hadExpired = false;
      const reset = habits.map(h => {
        if (h.lastChecked && h.lastChecked < yesterdayStr) {
          hadExpired = true;
          return { ...h, streak: 0, lastChecked: undefined };
        }
        return h;
      });
      if (!hadExpired) return;
      await persist({ ...dataRef.current, habits: reset });
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
    persist({ ...data, pomodoroSessionsDate: today, pomodoroSessions: count });
  }, [data, persist]);

  const toggleSection = useCallback((section: SectionKey) => {
    const current = data.collapsedSections ?? [];
    const next = current.includes(section)
      ? current.filter(s => s !== section)
      : [...current, section];
    persist({ ...data, collapsedSections: next });
  }, [data, persist]);

  // Derived: today's completed focus session count, reset to 0 when date changes
  const pomodoroSessionsToday =
    data.pomodoroSessionsDate === new Date().toLocaleDateString("sv")
      ? (data.pomodoroSessions ?? 0)
      : 0;

  const collapsed = data.collapsedSections ?? [];
  const theme = THEMES[settings.theme] ?? THEMES.void;
  const themeAccent = theme.accent;

  // Derived: habits done today — same render-time date pattern as pomodoroSessionsToday above.
  // Brief (<1 min) badge/button mismatch at midnight is acceptable; matching existing project pattern.
  const habitsArr = data.habits ?? [];
  const habitsDoneToday = habitsArr.filter(h => h.lastChecked === new Date().toLocaleDateString("sv")).length;
  const habitsBadge = habitsArr.length > 0 ? `${habitsDoneToday}/${habitsArr.length}` : undefined;

  // Derived: non-paused project count + average progress for Projects section badge.
  // "active" and "in-progress" are both considered running; "paused" is excluded.
  // Badge format: "2/3 · 45%" — running count, total count, and avg progress of running projects.
  const projectsArr = data.projects ?? [];
  const nonPausedProjects = projectsArr.filter(p => p.status !== "paused");
  const nonPausedCount = nonPausedProjects.length;
  const avgProgress = nonPausedCount > 0
    ? Math.round(nonPausedProjects.reduce((s, p) => s + p.progress, 0) / nonPausedCount)
    : null;
  const projectsBadge = projectsArr.length > 0
    ? avgProgress !== null
      ? `${nonPausedCount}/${projectsArr.length} · ${avgProgress}%`
      : `${nonPausedCount}/${projectsArr.length}`
    : undefined;

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
      />

      {/* ── Content ── */}
      <div style={s.content}>
        <Clock
          use12h={settings.clockFormat === "12h"}
          accent={themeAccent}
          onToggleFormat={() => updateSettings({ clockFormat: settings.clockFormat === "12h" ? "24h" : "12h" })}
        />

        <SectionLabel accent={themeAccent} collapsed={collapsed.includes("projects")} onToggle={() => toggleSection("projects")} badge={projectsBadge}>Projects</SectionLabel>
        {!collapsed.includes("projects") && (
          <ProjectList
            projects={data.projects}
            onUpdate={updateProject}
            onProjectsChange={updateProjects}
            pat={settings.githubPat}
            onRefreshAll={refreshAllProjects}
          />
        )}

        <SectionLabel accent={themeAccent} collapsed={collapsed.includes("streaks")} onToggle={() => toggleSection("streaks")} badge={habitsBadge}>Streaks</SectionLabel>
        {!collapsed.includes("streaks") && (
          <HabitStreak habits={data.habits} onUpdate={updateHabit} onHabitsChange={updateHabits} accent={themeAccent} />
        )}

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
          />
        )}

        <SectionLabel accent={themeAccent} collapsed={collapsed.includes("direction")} onToggle={() => toggleSection("direction")}>Direction</SectionLabel>
        {!collapsed.includes("direction") && (
          <QuoteRotator quotes={data.quotes} onUpdate={updateQuotes} rotationInterval={data.quoteInterval} onIntervalChange={updateQuoteInterval} />
        )}

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
              return (
                <div key={p.id} title={`${p.name} · ${p.status}`} style={{
                  width: 20, height: 20, borderRadius: radius.chip,
                  background: `${sc}22`,
                  border: `1px solid ${sc}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  ...s.mono, fontSize: fontSizes.mini, color: sc, fontWeight: 600,
                }}>
                  {p.name[0]}
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
