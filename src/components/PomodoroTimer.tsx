// ABOUTME: PomodoroTimer component - configurable focus/break timer with desktop notification
// ABOUTME: Durations are editable inline and persisted via onDurationsChange callback

import { useState, useEffect, useRef, CSSProperties } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { fonts, fontSizes, colors, radius } from "../theme";

type Phase = "focus" | "break";

const DEFAULT_DURATION: Record<Phase, number> = { focus: 25, break: 5 };

const mono: CSSProperties = { fontFamily: fonts.mono };

function pad(n: number) { return String(n).padStart(2, "0"); }

async function notify(title: string, body: string) {
  try {
    const granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      if (permission !== "granted") return;
    }
    sendNotification({ title, body });
  } catch {
    // Notification not available in browser dev mode
  }
}

interface PomodoroTimerProps {
  initialDurations?: { focus: number; break: number };
  onDurationsChange?: (d: { focus: number; break: number }) => void;
  sessionsToday?: number;         // completed focus sessions today, from persisted data
  onSessionComplete?: () => void; // called when a focus phase finishes
}

export function PomodoroTimer({ initialDurations, onDurationsChange, sessionsToday = 0, onSessionComplete }: PomodoroTimerProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [durations, setDurations] = useState<Record<Phase, number>>(initialDurations ?? DEFAULT_DURATION);
  const [remaining, setRemaining] = useState((initialDurations?.focus ?? DEFAULT_DURATION.focus) * 60);
  const [running, setRunning] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editValue, setEditValue] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirror mutable values in refs so setInterval callback always sees latest without stale closure
  const durationsRef = useRef(durations);
  durationsRef.current = durations;
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const onSessionCompleteRef = useRef(onSessionComplete);
  onSessionCompleteRef.current = onSessionComplete;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const next_val = remainingRef.current - 1;
      if (next_val <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        const currentPhase = phaseRef.current;
        const next: Phase = currentPhase === "focus" ? "break" : "focus";
        const breakMins = durationsRef.current.break;
        const msg = currentPhase === "focus"
          ? `🍅 포모도로 완료! ${breakMins}분 휴식하세요.`
          : "💪 휴식 종료! 다시 집중할 시간.";
        notify("Vision Widget", msg);
        if (currentPhase === "focus") onSessionCompleteRef.current?.();
        setRunning(false);
        setPhase(next);
        setRemaining(durationsRef.current[next] * 60);
      } else {
        setRemaining(next_val);
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase]);

  const reset = () => {
    setRunning(false);
    setRemaining(durations[phase] * 60);
  };

  const switchPhase = (p: Phase) => {
    setRunning(false);
    setPhase(p);
    setRemaining(durations[p] * 60);
    setEditingPhase(null); // clear any in-progress edit when switching phase
  };

  const startEdit = (p: Phase, e: React.MouseEvent) => {
    e.stopPropagation();
    if (running) return;
    setEditingPhase(p);
    setEditValue(String(durations[p]));
  };

  const commitEdit = () => {
    if (editingPhase === null) return;
    const parsed = parseInt(editValue, 10);
    // Use original value on empty/non-numeric; clamp 1-99 for valid input (including 0)
    const mins = Math.max(1, Math.min(99, isNaN(parsed) ? durations[editingPhase] : parsed));
    const next = { ...durations, [editingPhase]: mins };
    setDurations(next);
    onDurationsChange?.(next);
    if (editingPhase === phase && !running) {
      setRemaining(mins * 60);
    }
    setEditingPhase(null);
  };

  const phaseLabel = (p: Phase) => {
    const label = p === "focus" ? "집중" : "휴식";
    if (editingPhase === p) {
      return (
        <span onClick={e => e.stopPropagation()}>
          {label}{" "}
          <input
            type="number"
            value={editValue}
            min={1}
            max={99}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditingPhase(null);
            }}
            autoFocus
            style={{
              width: 28,
              background: "transparent",
              border: "none",
              borderBottom: `1px solid currentColor`,
              color: "inherit",
              fontSize: "inherit",
              fontFamily: fonts.mono,
              textAlign: "center",
              outline: "none",
              padding: 0,
            }}
          />
          분
        </span>
      );
    }
    return (
      <span>
        {label}{" "}
        <span
          onClick={e => startEdit(p, e)}
          title={running ? undefined : "클릭하여 시간 변경"}
          style={{
            cursor: running ? "default" : "text",
            borderBottom: running ? "none" : `1px dashed currentColor`,
            opacity: running ? 1 : 0.8,
          }}
        >
          {durations[p]}
        </span>
        분
      </span>
    );
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = 1 - remaining / (durations[phase] * 60);
  const accent = phase === "focus" ? colors.statusActive : colors.statusProgress;

  return (
    <div style={{ borderTop: `1px solid ${colors.borderFaint}`, marginTop: 4 }}>
      {/* Toggle row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 6px", cursor: "pointer" }}
      >
        <span style={{ fontSize: fontSizes.label, fontWeight: 600, color: colors.textGhost, textTransform: "uppercase", letterSpacing: 3 }}>
          Pomodoro
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {sessionsToday > 0 && (
            <span style={{ fontSize: fontSizes.mini, color: colors.textSubtle }}>
              🍅 ×{sessionsToday}
            </span>
          )}
          <span style={{ ...mono, fontSize: fontSizes.xs, color: accent }}>
            {running ? `${pad(minutes)}:${pad(seconds)}` : "▶"}
          </span>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{ paddingBottom: 14 }}>
          {/* Phase tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["focus", "break"] as Phase[]).map(p => (
              <button
                key={p}
                onClick={() => switchPhase(p)}
                style={{
                  flex: 1, padding: "4px 0", borderRadius: radius.bar,
                  background: phase === p ? `${accent}22` : "transparent",
                  border: `1px solid ${phase === p ? accent + "44" : colors.borderFaint}`,
                  color: phase === p ? accent : colors.textSubtle,
                  fontSize: fontSizes.xs, cursor: "pointer",
                }}
              >
                {phaseLabel(p)}
              </button>
            ))}
          </div>

          {/* Timer display */}
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={{ ...mono, fontSize: 40, fontWeight: 200, color: accent, letterSpacing: 4, lineHeight: 1 }}>
              {pad(minutes)}<span style={{ opacity: 0.4 }}>:</span>{pad(seconds)}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: "100%", height: 2, background: colors.borderSubtle, borderRadius: 1, marginBottom: 12 }}>
            <div style={{
              width: `${progress * 100}%`, height: "100%",
              background: accent, borderRadius: 1, transition: "width 1s linear",
            }} />
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setRunning(r => !r)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: radius.chip,
                background: running ? `${accent}22` : `${accent}33`,
                border: `1px solid ${accent}44`,
                color: accent, fontSize: fontSizes.sm, cursor: "pointer", fontWeight: 600,
              }}
            >
              {running ? "⏸ 일시정지" : "▶ 시작"}
            </button>
            <button
              onClick={reset}
              style={{
                padding: "6px 12px", borderRadius: radius.chip,
                background: "transparent",
                border: `1px solid ${colors.borderFaint}`,
                color: colors.textSubtle, fontSize: fontSizes.sm, cursor: "pointer",
              }}
            >
              ↺
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
