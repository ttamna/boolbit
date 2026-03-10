// ABOUTME: Vision Widget root component - composes all widget sections
// ABOUTME: Handles data loading/saving and habit increment interactions

import { useState, useEffect, useCallback, CSSProperties } from "react";
import type { WidgetData } from "./types";
import { colors, fonts, fontSizes, radius, shadows } from "./theme";
import { invoke } from "./lib/tauri";
import { useSettings } from "./hooks/useSettings";
import { useWindowSync } from "./hooks/useWindowSync";
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
    height: "100%",
    background: colors.bgBase,
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
    overflowY: "auto",
    padding: "0 24px 28px",
  } as CSSProperties,

  mono: { fontFamily: fonts.mono } as CSSProperties,
};

// ─── App ────────────────────────────────────────────────
export default function App() {
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

  useEffect(() => {
    (async () => {
      const saved = await invoke<WidgetData>("load_data");
      if (saved) setData(saved);
      setTimeout(() => setLoaded(true), 100);
    })();
  }, []);

  const persist = useCallback(async (next: WidgetData) => {
    setData(next);
    await invoke("save_data", { data: next });
  }, []);

  const incrementHabit = useCallback((i: number) => {
    const next = { ...data, habits: data.habits.map((h, idx) =>
      idx === i ? { ...h, streak: h.streak + 1 } : h
    )};
    persist(next);
  }, [data, persist]);

  const renameHabit = useCallback((i: number, name: string) => {
    const next = { ...data, habits: data.habits.map((h, idx) =>
      idx === i ? { ...h, name } : h
    )};
    persist(next);
  }, [data, persist]);

  const updateProject = useCallback((id: number, patch: Partial<import("./types").Project>) => {
    const next = { ...data, projects: data.projects.map(p =>
      p.id === id ? { ...p, ...patch } : p
    )};
    persist(next);
  }, [data, persist]);

  return (
    <div
      style={{
        ...s.container,
        background: `rgba(12, 12, 16, ${0.75 * settings.opacity})`,
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Drag handle ── */}
      <DragBar
        hovered={hovered}
        settings={settings}
        onSettingsChange={updateSettings}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen(o => !o)}
      />

      {/* ── Content ── */}
      <div style={s.content}>
        <Clock />

        <SectionLabel>Projects</SectionLabel>
        {data.projects.map(p => <ProjectCard key={p.id} project={p} onUpdate={patch => updateProject(p.id, patch)} />)}

        <SectionLabel>Streaks</SectionLabel>
        <HabitStreak habits={data.habits} onIncrement={incrementHabit} onRename={renameHabit} />

        <PomodoroTimer />

        <SectionLabel>Direction</SectionLabel>
        <QuoteRotator quotes={data.quotes} />

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
