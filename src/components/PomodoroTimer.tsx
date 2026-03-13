// ABOUTME: PomodoroTimer component - configurable focus/break timer with desktop notification
// ABOUTME: Durations, auto-start, and daily session goal are editable inline and persisted via callbacks

import { useState, useEffect, useRef, CSSProperties } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { fonts, fontSizes, colors, radius } from "../theme";

type Phase = "focus" | "break";

const DEFAULT_DURATION: Record<Phase, number> = { focus: 25, break: 5 };
const PRESETS: Record<Phase, number[]> = { focus: [15, 25, 45], break: [5, 10, 15] };

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
  sessionsToday?: number;              // completed focus sessions today, from persisted data
  onSessionComplete?: () => void;      // called when a focus phase finishes
  initialAutoStart?: boolean;          // persisted auto-start preference
  onAutoStartChange?: (v: boolean) => void; // persist toggle
  initialOpen?: boolean;               // persisted open/closed state
  onToggleOpen?: () => void;           // notify parent to persist toggle
  sessionGoal?: number;                // optional daily focus session target
  onSessionGoalChange?: (goal: number | undefined) => void; // persist goal (undefined = clear)
}

export function PomodoroTimer({ initialDurations, onDurationsChange, sessionsToday = 0, onSessionComplete, initialAutoStart = false, onAutoStartChange, initialOpen = false, onToggleOpen, sessionGoal, onSessionGoalChange }: PomodoroTimerProps) {
  const [open, setOpen] = useState(initialOpen);
  const [phase, setPhase] = useState<Phase>("focus");
  const [durations, setDurations] = useState<Record<Phase, number>>(initialDurations ?? DEFAULT_DURATION);
  const [remaining, setRemaining] = useState((initialDurations?.focus ?? DEFAULT_DURATION.focus) * 60);
  const [running, setRunning] = useState(false);
  const [autoStart, setAutoStart] = useState(initialAutoStart);
  // runKey: increment to force a new interval when autoStart transitions phases (running stays true)
  const [runKey, setRunKey] = useState(0);
  const [customMode, setCustomMode] = useState<Phase | null>(null);
  const [customValue, setCustomValue] = useState("");
  // goalEdit: true while the user is typing a new goal; goalDraft holds the input text
  // goalEditRef: sync shadow of goalEdit — used in commitGoal to guard against blur-after-Escape
  const [goalEdit, setGoalEdit] = useState(false);
  const goalEditRef = useRef(false);
  const [goalDraft, setGoalDraft] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirror mutable values in refs so setInterval callback always sees latest without stale closure
  const durationsRef = useRef(durations);
  durationsRef.current = durations;
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoStartRef = useRef(autoStart);
  autoStartRef.current = autoStart;
  const onSessionCompleteRef = useRef(onSessionComplete);
  onSessionCompleteRef.current = onSessionComplete;

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    // Compute effective start time from current remaining so pause/resume works correctly.
    // effectiveStart = now - (totalSecs - remaining) * 1000
    // This lets us resume mid-countdown without resetting to the full duration.
    const totalSecs = durationsRef.current[phaseRef.current] * 60;
    const effectiveStart = Date.now() - (totalSecs - remainingRef.current) * 1000;
    intervalRef.current = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - effectiveStart) / 1000);
      const newRemaining = Math.max(0, totalSecs - newElapsed);
      if (newRemaining <= 0) {
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
        setPhase(next);
        setRemaining(durationsRef.current[next] * 60);
        if (autoStartRef.current) {
          // Bump runKey so useEffect re-fires with running still true, creating a fresh interval
          setRunKey(k => k + 1);
        } else {
          setRunning(false);
        }
      } else {
        setRemaining(newRemaining);
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, runKey]);

  const reset = () => {
    setRunning(false);
    setRemaining(durations[phase] * 60);
  };

  // Skip to next phase immediately — does NOT count as a completed session,
  // and does NOT send a notification (user triggered, no feedback needed).
  // autoStart respected: if running+autoStart, next phase auto-starts; otherwise stops.
  const skipPhase = () => {
    const next: Phase = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setRemaining(durations[next] * 60);
    if (running && autoStart) {
      setRunKey(k => k + 1);
    } else {
      setRunning(false);
    }
  };

  const switchPhase = (p: Phase) => {
    setRunning(false);
    setPhase(p);
    setRemaining(durations[p] * 60);
    setCustomMode(null);
  };

  const applyDuration = (p: Phase, mins: number) => {
    if (running) return;
    const next = { ...durations, [p]: mins };
    setDurations(next);
    onDurationsChange?.(next);
    if (p === phase) setRemaining(mins * 60);
    setCustomMode(null);
  };

  const commitCustom = () => {
    if (customMode === null) return;
    const parsed = parseInt(customValue, 10);
    const mins = Math.max(1, Math.min(99, isNaN(parsed) ? durations[customMode] : parsed));
    applyDuration(customMode, mins);
  };

  const commitGoal = () => {
    // Guard: blur fires after Escape on some platforms — use ref (not state) because
    // React state reads inside event handlers reflect the previous render snapshot.
    if (!goalEditRef.current) return;
    goalEditRef.current = false;
    const parsed = parseInt(goalDraft, 10);
    // 0 or invalid input clears the goal; otherwise clamp to 1–99
    const goal = !isNaN(parsed) && parsed > 0 ? Math.min(99, parsed) : undefined;
    onSessionGoalChange?.(goal);
    setGoalEdit(false);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = 1 - remaining / (durations[phase] * 60);
  const accent = phase === "focus" ? colors.statusActive : colors.statusProgress;
  // Timer was started (or resumed) but is currently stopped mid-countdown
  const isPaused = !running && remaining < durations[phase] * 60;
  // Total focus time today using current duration as approximation (accurate when duration hasn't changed today)
  const totalFocusMins = sessionsToday * durations.focus;
  const todayTimeStr = totalFocusMins >= 60
    ? totalFocusMins % 60 === 0
      ? `${Math.floor(totalFocusMins / 60)}h`
      : `${Math.floor(totalFocusMins / 60)}h ${totalFocusMins % 60}m`
    : `${totalFocusMins}m`;
  // Session count badge: "×3/8" with goal, "✓8" when goal reached, "×3" without goal
  const goalReached = sessionGoal != null && sessionsToday >= sessionGoal;
  const sessionCountStr = sessionGoal != null
    ? goalReached ? `✓${sessionsToday}` : `×${sessionsToday}/${sessionGoal}`
    : `×${sessionsToday}`;

  return (
    <div style={{ borderTop: `1px solid ${colors.borderFaint}`, marginTop: 4 }}>
      {/* Toggle row */}
      <div
        onClick={() => { setOpen(o => !o); onToggleOpen?.(); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 6px", cursor: "pointer" }}
      >
        <span style={{ fontSize: fontSizes.label, fontWeight: 600, color: colors.textGhost, textTransform: "uppercase", letterSpacing: 3 }}>
          Pomodoro
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(sessionsToday > 0 || sessionGoal != null) && (
            <span style={{ fontSize: fontSizes.mini, color: goalReached ? colors.statusActive : colors.textSubtle }}>
              🍅 {sessionCountStr}{sessionsToday > 0 ? ` · ${todayTimeStr}` : ""}
            </span>
          )}
          <span style={{ ...mono, fontSize: fontSizes.xs, color: accent }}>
            {running
              ? `${phase === "focus" ? "집중" : "휴식"} ${pad(minutes)}:${pad(seconds)}`
              : isPaused
              ? `⏸ ${pad(minutes)}:${pad(seconds)}`
              : "▶"}
          </span>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{ paddingBottom: 14 }}>
          {/* Phase tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
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
                {p === "focus" ? "집중" : "휴식"} {durations[p]}분
              </button>
            ))}
          </div>

          {/* Duration presets */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {PRESETS[phase].map(mins => (
              <button
                key={mins}
                onClick={() => applyDuration(phase, mins)}
                disabled={running}
                style={{
                  flex: 1, padding: "3px 0", borderRadius: radius.chip,
                  background: durations[phase] === mins && customMode === null ? `${accent}22` : "transparent",
                  border: `1px solid ${durations[phase] === mins && customMode === null ? accent + "55" : colors.borderFaint}`,
                  color: durations[phase] === mins && customMode === null ? accent : colors.textPhantom,
                  fontSize: fontSizes.mini, cursor: running ? "default" : "pointer",
                  opacity: running ? 0.5 : 1,
                }}
              >
                {mins}분
              </button>
            ))}
            {customMode === phase ? (
              <input
                type="number"
                value={customValue}
                min={1}
                max={99}
                onChange={e => setCustomValue(e.target.value)}
                onBlur={commitCustom}
                onKeyDown={e => {
                  if (e.key === "Enter") commitCustom();
                  if (e.key === "Escape") setCustomMode(null);
                }}
                autoFocus
                style={{
                  flex: 1, padding: "3px 4px", borderRadius: radius.chip,
                  background: "transparent",
                  border: `1px solid ${accent}55`,
                  color: accent, fontSize: fontSizes.mini,
                  fontFamily: fonts.mono, textAlign: "center",
                  outline: "none", minWidth: 0,
                }}
              />
            ) : (
              <button
                onClick={() => { if (running) return; setCustomMode(phase); setCustomValue(String(durations[phase])); }}
                disabled={running}
                style={{
                  flex: 1, padding: "3px 0", borderRadius: radius.chip,
                  background: "transparent",
                  border: `1px solid ${colors.borderFaint}`,
                  color: colors.textPhantom,
                  fontSize: fontSizes.mini, cursor: running ? "default" : "pointer",
                  opacity: running ? 0.5 : 1,
                }}
              >
                직접
              </button>
            )}
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

          {/* Daily goal row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: fontSizes.xs, color: colors.textSubtle }}>일 목표</span>
            {goalEdit ? (
              <input
                type="number"
                value={goalDraft}
                min={0}
                max={99}
                onChange={e => setGoalDraft(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={e => {
                  if (e.key === "Enter") commitGoal();
                  if (e.key === "Escape") { goalEditRef.current = false; setGoalEdit(false); }
                }}
                autoFocus
                placeholder="0=해제"
                style={{
                  width: 60, padding: "2px 6px", borderRadius: radius.chip,
                  background: "transparent",
                  border: `1px solid ${accent}55`,
                  color: accent, fontSize: fontSizes.xs,
                  fontFamily: fonts.mono, textAlign: "center",
                  outline: "none",
                }}
              />
            ) : (
              <button
                onClick={() => { goalEditRef.current = true; setGoalEdit(true); setGoalDraft(sessionGoal != null ? String(sessionGoal) : ""); }}
                title="일일 집중 목표 세션 수 설정 (0 입력 시 해제)"
                style={{
                  background: "transparent", border: "none",
                  cursor: "pointer", padding: "2px 0",
                  color: sessionGoal != null ? (goalReached ? colors.statusActive : accent) : colors.textPhantom,
                  fontSize: fontSizes.xs, fontFamily: fonts.mono,
                }}
              >
                {sessionGoal != null ? `${sessionsToday}/${sessionGoal}세션` : "—"}
              </button>
            )}
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
              title="현재 단계 처음으로"
              style={{
                padding: "6px 12px", borderRadius: radius.chip,
                background: "transparent",
                border: `1px solid ${colors.borderFaint}`,
                color: colors.textSubtle, fontSize: fontSizes.sm, cursor: "pointer",
              }}
            >
              ↺
            </button>
            <button
              onClick={skipPhase}
              title={`다음 단계로 건너뛰기 (${phase === "focus" ? "집중 → 휴식" : "휴식 → 집중"})`}
              style={{
                padding: "6px 10px", borderRadius: radius.chip,
                background: "transparent",
                border: `1px solid ${colors.borderFaint}`,
                color: colors.textSubtle, fontSize: fontSizes.sm, cursor: "pointer",
              }}
            >
              ⏭
            </button>
            {/* Auto-start toggle: when on, next phase starts automatically */}
            <button
              onClick={() => {
                const next = !autoStart;
                setAutoStart(next);
                onAutoStartChange?.(next);
              }}
              title={autoStart ? "자동 시작 켜짐 — 클릭하여 끄기" : "자동 시작 꺼짐 — 클릭하여 켜기"}
              style={{
                padding: "6px 10px", borderRadius: radius.chip,
                background: autoStart ? `${accent}22` : "transparent",
                border: `1px solid ${autoStart ? accent + "44" : colors.borderFaint}`,
                color: autoStart ? accent : colors.textPhantom,
                fontSize: fontSizes.sm, cursor: "pointer",
              }}
            >
              ∞
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
