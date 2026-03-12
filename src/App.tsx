// ABOUTME: Vision Widget root component - composes all widget sections
// ABOUTME: Handles data loading/saving and inline patch updates for projects/habits/quotes

import { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import type { WidgetData, Habit, Project } from "./types";
import { colors, fonts, fontSizes, radius, shadows, THEMES } from "./theme";
import { invoke } from "./lib/tauri";
import { useSettings } from "./hooks/useSettings";
import { useWindowSync } from "./hooks/useWindowSync";
import { useWindowResize } from "./hooks/useWindowResize";
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
    { name: "푸시업", streak: 12, icon: "💪" },
    { name: "풀업", streak: 8, icon: "🏋️" },
    { name: "폰 사용↓", streak: 5, icon: "📵" },
    { name: "포모도로", streak: 3, icon: "🍅" },
  ],
  quotes: [
    "Design so it cannot fail fatally, then execute.",
    "시스템이 행동을 만든다. 의지력이 아니라.",
    "Ship small, get feedback, adjust.",
    "완벽보다 실행. 실행보다 피드백.",
    "What do we lose by waiting?",
  ],
};

// ─── Styles ─────────────────────────────────────────────
const s = {
  container: {
    width: "100%",
    maxHeight: "100vh",
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
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
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
          const reset = savedHabits.map(h => {
            if (h.lastChecked && h.lastChecked < yesterdayStr) {
              hadExpired = true;
              return { ...h, streak: 0, lastChecked: undefined };
            }
            return h;
          });
          const resolvedData = hadExpired ? { ...saved, habits: reset } : saved;
          setData(resolvedData);
          if (hadExpired) await invoke("save_data", { data: resolvedData });
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

  const updateHabits = useCallback((habits: Habit[]) => {
    persist({ ...data, habits });
  }, [data, persist]);

  const updateProjects = useCallback((projects: Project[]) => {
    persist({ ...data, projects });
  }, [data, persist]);

  const updateQuotes = useCallback((quotes: string[]) => {
    persist({ ...data, quotes });
  }, [data, persist]);

  const updatePomodoroDurations = useCallback((pomodoroDurations: { focus: number; break: number }) => {
    persist({ ...data, pomodoroDurations });
  }, [data, persist]);

  const updatePomodoroAutoStart = useCallback((pomodoroAutoStart: boolean) => {
    persist({ ...data, pomodoroAutoStart });
  }, [data, persist]);

  const handlePomodoroSession = useCallback(() => {
    const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date (sv = Swedish = ISO format)
    const count = data.pomodoroSessionsDate === today ? (data.pomodoroSessions ?? 0) + 1 : 1;
    persist({ ...data, pomodoroSessionsDate: today, pomodoroSessions: count });
  }, [data, persist]);

  // Derived: today's completed focus session count, reset to 0 when date changes
  const pomodoroSessionsToday =
    data.pomodoroSessionsDate === new Date().toLocaleDateString("sv")
      ? (data.pomodoroSessions ?? 0)
      : 0;

  return (
    <div
      ref={containerRef}
      style={{
        ...s.container,
        background: `rgba(${THEMES[settings.theme].bgRgb}, ${settings.opacity})`,
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
      />

      {/* ── Content ── */}
      <div style={s.content}>
        <Clock />

        <SectionLabel>Projects</SectionLabel>
        <ProjectList
          projects={data.projects}
          onUpdate={updateProject}
          onProjectsChange={updateProjects}
        />

        <SectionLabel>Streaks</SectionLabel>
        <HabitStreak habits={data.habits} onUpdate={updateHabit} onHabitsChange={updateHabits} />

        {loaded && (
          <PomodoroTimer
            initialDurations={data.pomodoroDurations}
            onDurationsChange={updatePomodoroDurations}
            sessionsToday={pomodoroSessionsToday}
            onSessionComplete={handlePomodoroSession}
            initialAutoStart={data.pomodoroAutoStart}
            onAutoStartChange={updatePomodoroAutoStart}
          />
        )}

        <SectionLabel>Direction</SectionLabel>
        <QuoteRotator quotes={data.quotes} onUpdate={updateQuotes} />

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
            {data.projects.map(p => (
              <div key={p.id} style={{
                width: 20, height: 20, borderRadius: radius.chip,
                background: colors.surfaceFaint,
                display: "flex", alignItems: "center", justifyContent: "center",
                ...s.mono, fontSize: fontSizes.mini, color: colors.textSubtle, fontWeight: 600,
              }}>
                {p.name[0]}
              </div>
            ))}
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
