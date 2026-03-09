// ABOUTME: Vision Widget - main Tauri app component
// ABOUTME: Displays clock, projects, habits, and quotes with Tauri data persistence

import { useState, useEffect, useCallback, CSSProperties } from "react";
import type { Project, Habit, WidgetData } from "./types";

// ─── Tauri invoke wrapper ───────────────────────────────
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const tauri = (window as any).__TAURI__;
    if (tauri?.core?.invoke) {
      return await tauri.core.invoke(cmd, args);
    }
  } catch {
    // fallback for dev without Tauri
  }
  return null as unknown as T;
}

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
    background: "rgba(12, 12, 16, 0.75)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
  } as CSSProperties,

  dragBar: {
    padding: "12px 16px 8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "grab",
  } as CSSProperties,

  content: {
    flex: 1,
    overflowY: "auto",
    padding: "0 24px 28px",
  } as CSSProperties,

  mono: {
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
  } as CSSProperties,
};

// ─── Clock ──────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = time.getHours().toString().padStart(2, "0");
  const m = time.getMinutes().toString().padStart(2, "0");
  const sec = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...s.mono, fontSize: 56, fontWeight: 200, letterSpacing: 6, color: "rgba(255,255,255,0.95)", lineHeight: 1 }}>
        {h}<span style={{ opacity: 0.4 }}>:</span>{m}
        <span style={{ opacity: 0.2, fontSize: 32, marginLeft: 4 }}>{sec}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6, fontWeight: 300, letterSpacing: 1 }}>
        {dateStr}
      </div>
    </div>
  );
}

// ─── Section Label ──────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)",
      textTransform: "uppercase", letterSpacing: 3, marginBottom: 10, marginTop: 20,
    }}>
      {children}
    </div>
  );
}

// ─── Progress Bar ───────────────────────────────────────
function ProgressBar({ value, color = "#4ADE80" }: { value: number; color?: string }) {
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        borderRadius: 2, transition: "width 1s ease",
      }} />
    </div>
  );
}

// ─── Project Card ───────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const statusColors: Record<string, string> = { active: "#4ADE80", "in-progress": "#FBBF24", paused: "#F87171" };
  const color = statusColors[project.status] || "#4ADE80";

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}66` }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: 0.3 }}>{project.name}</span>
        </div>
        <span style={{ ...s.mono, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{project.progress}%</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, paddingLeft: 14 }}>{project.goal}</div>
      <div style={{ paddingLeft: 14 }}>
        <ProgressBar value={project.progress} color={color} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 14, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{project.metric}</span>
        <span style={{ ...s.mono, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          {project.metric_value} <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span> {project.metric_target}
        </span>
      </div>
    </div>
  );
}

// ─── Habits ─────────────────────────────────────────────
function HabitStreak({ habits, onIncrement }: { habits: Habit[]; onIncrement: (i: number) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
      {habits.map((h, i) => (
        <div
          key={h.name}
          onClick={() => onIncrement(i)}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}
          title="클릭하면 +1"
        >
          <span style={{ fontSize: 14 }}>{h.icon}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", flex: 1 }}>{h.name}</span>
          <span style={{
            ...s.mono, fontSize: 13, fontWeight: 700,
            color: h.streak >= 10 ? "#4ADE80" : h.streak >= 5 ? "#FBBF24" : "rgba(255,255,255,0.5)",
          }}>
            {h.streak}
            <span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.2)", marginLeft: 2 }}>일</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Quote Rotator ──────────────────────────────────────
function QuoteRotator({ quotes }: { quotes: string[] }) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => { setIdx(prev => (prev + 1) % quotes.length); setOpacity(1); }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  return (
    <div style={{
      fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic", lineHeight: 1.6,
      minHeight: 36, display: "flex", alignItems: "center",
      opacity, transition: "opacity 0.6s ease",
      borderLeft: "2px solid rgba(255,255,255,0.08)", paddingLeft: 12,
    }}>
      {quotes[idx]}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────
export default function App() {
  const [data, setData] = useState<WidgetData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Load data from Rust backend
  useEffect(() => {
    (async () => {
      const saved = await invoke<WidgetData>("load_data");
      if (saved) setData(saved);
      setTimeout(() => setLoaded(true), 100);
    })();
  }, []);

  // Save helper
  const persist = useCallback(async (next: WidgetData) => {
    setData(next);
    await invoke("save_data", { data: next });
  }, []);

  // Habit increment
  const incrementHabit = useCallback((i: number) => {
    const next = { ...data, habits: data.habits.map((h, idx) =>
      idx === i ? { ...h, streak: h.streak + 1 } : h
    )};
    persist(next);
  }, [data, persist]);

  return (
    <div
      style={{
        ...s.container,
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Drag handle ── */}
      <div data-tauri-drag-region style={s.dragBar}>
        <div style={{ ...s.mono, fontSize: 8, color: "rgba(255,255,255,0.12)", letterSpacing: 2 }}>VISION</div>
        <div style={{ display: "flex", gap: 5, opacity: hovered ? 0.6 : 0, transition: "opacity 0.3s ease" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={s.content}>
        <Clock />

        <SectionLabel>Projects</SectionLabel>
        {data.projects.map(p => <ProjectCard key={p.id} project={p} />)}

        <SectionLabel>Streaks</SectionLabel>
        <HabitStreak habits={data.habits} onIncrement={incrementHabit} />

        <SectionLabel>Direction</SectionLabel>
        <QuoteRotator quotes={data.quotes} />

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ ...s.mono, fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: 2, textTransform: "uppercase" }}>
            Vision Widget v0.1
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {data.projects.map(p => (
              <div key={p.id} style={{
                width: 20, height: 20, borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                ...s.mono, fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 600,
              }}>
                {p.name[0]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
