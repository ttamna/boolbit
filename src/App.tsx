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
import { ProjectCard } from "./components/ProjectCard";
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
  const [editingProjects, setEditingProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings();

  useWindowSync({
    settings,
    settingsLoaded,
    onPositionSave: (x, y) => updateSettings({ position: { x, y } }),
  });
  useWindowResize(containerRef);

  useEffect(() => {
    (async () => {
      const saved = await invoke<WidgetData>("load_data");
      if (saved) setData(saved);
      setTimeout(() => setLoaded(true), 100);
    })();
  }, []);

  useEffect(() => {
    if (!editingProjects) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setEditingProjects(false); setNewProjectName(""); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingProjects]);

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

  const updateQuotes = useCallback((quotes: string[]) => {
    persist({ ...data, quotes });
  }, [data, persist]);

  const updatePomodoroDurations = useCallback((pomodoroDurations: { focus: number; break: number }) => {
    persist({ ...data, pomodoroDurations });
  }, [data, persist]);

  const addProject = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const maxId = data.projects.reduce((m, p) => Math.max(m, p.id), 0);
    const newProject: Project = {
      id: maxId + 1,
      name: trimmed,
      status: "active",
      goal: "목표를 입력하세요",
      progress: 0,
      metric: "지표",
      metric_value: "0",
      metric_target: "100",
    };
    persist({ ...data, projects: [...data.projects, newProject] });
  }, [data, persist]);

  const deleteProject = useCallback((id: number) => {
    persist({ ...data, projects: data.projects.filter(p => p.id !== id) });
  }, [data, persist]);

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
        {editingProjects ? (
          <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
            {data.projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onUpdate={patch => updateProject(p.id, patch)}
                onDelete={() => deleteProject(p.id)}
              />
            ))}
            {/* Add new project */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newProjectName.trim()) { addProject(newProjectName); setNewProjectName(""); }
                }}
                placeholder="새 프로젝트 추가..."
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: 4, color: colors.textDim,
                  fontSize: fontSizes.sm, outline: "none",
                  padding: "2px 6px",
                }}
              />
              <button
                onClick={() => { if (newProjectName.trim()) { addProject(newProjectName); setNewProjectName(""); } }}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: colors.textMid, fontSize: fontSizes.base, padding: "0 2px", lineHeight: 1,
                }}
              >
                +
              </button>
            </div>
            <button
              onClick={() => setEditingProjects(false)}
              style={{
                marginTop: 4, background: "transparent",
                border: `1px solid ${colors.borderFaint}`,
                borderRadius: 4, cursor: "pointer",
                color: colors.textSubtle, fontSize: fontSizes.xs, padding: "2px 8px",
              }}
            >
              완료
            </button>
          </div>
        ) : (
          <>
            {data.projects.map(p => <ProjectCard key={p.id} project={p} onUpdate={patch => updateProject(p.id, patch)} />)}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={() => setEditingProjects(true)}
                title="프로젝트 추가/삭제"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: colors.textPhantom, fontSize: fontSizes.mini,
                  padding: "0 2px", lineHeight: 1,
                }}
              >
                ✏
              </button>
            </div>
          </>
        )}

        <SectionLabel>Streaks</SectionLabel>
        <HabitStreak habits={data.habits} onUpdate={updateHabit} onHabitsChange={updateHabits} />

        {loaded && (
          <PomodoroTimer
            initialDurations={data.pomodoroDurations}
            onDurationsChange={updatePomodoroDurations}
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
