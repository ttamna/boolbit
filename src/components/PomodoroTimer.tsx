// ABOUTME: PomodoroTimer component - configurable focus/break timer with desktop notification
// ABOUTME: Durations, auto-start, notify toggle, daily session goal, and long-break interval are editable inline and persisted via callbacks

import { useState, useEffect, useRef, CSSProperties } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { fonts, fontSizes, colors, radius } from "../theme";

type Phase = "focus" | "break" | "longBreak";

const DEFAULT_DURATION: Record<Phase, number> = { focus: 25, break: 5, longBreak: 15 };
const PRESETS: Record<Phase, number[]> = { focus: [15, 25, 45], break: [5, 10, 15], longBreak: [10, 15, 20] };
const LONG_BREAK_INTERVAL_PRESETS = [2, 3, 4, 6] as const;

const mono: CSSProperties = { fontFamily: fonts.mono };

function pad(n: number) { return String(n).padStart(2, "0"); }

// Accent color per phase: green for focus, yellow for short break, sky-blue for long break
function phaseAccent(p: Phase): string {
  if (p === "focus") return colors.statusActive;
  if (p === "break") return colors.statusProgress;
  return colors.statusLongBreak;
}

function phaseLabel(p: Phase): string {
  if (p === "focus") return "집중";
  if (p === "break") return "휴식";
  return "긴 휴식";
}

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
  initialDurations?: { focus: number; break: number; longBreak?: number };
  onDurationsChange?: (d: { focus: number; break: number; longBreak: number }) => void;
  sessionsToday?: number;              // completed focus sessions today, from persisted data
  onSessionComplete?: () => void;      // called when a focus phase finishes
  initialAutoStart?: boolean;          // persisted auto-start preference
  onAutoStartChange?: (v: boolean) => void; // persist toggle
  initialOpen?: boolean;               // persisted open/closed state
  onToggleOpen?: () => void;           // notify parent to persist toggle
  sessionGoal?: number;                // optional daily focus session target
  onSessionGoalChange?: (goal: number | undefined) => void; // persist goal (undefined = clear)
  longBreakInterval?: number;          // focus sessions per long-break cycle, default 4
  onLongBreakIntervalChange?: (n: number) => void; // persist interval
  initialNotify?: boolean;             // persisted notify preference; absent/true = enabled
  onNotifyChange?: (v: boolean) => void; // persist toggle
}

export function PomodoroTimer({ initialDurations, onDurationsChange, sessionsToday = 0, onSessionComplete, initialAutoStart = false, onAutoStartChange, initialOpen = false, onToggleOpen, sessionGoal, onSessionGoalChange, longBreakInterval, onLongBreakIntervalChange, initialNotify, onNotifyChange }: PomodoroTimerProps) {
  const [open, setOpen] = useState(initialOpen);
  const [phase, setPhase] = useState<Phase>("focus");
  const [durations, setDurations] = useState<Record<Phase, number>>({
    ...DEFAULT_DURATION,
    ...(initialDurations ?? {}),
    longBreak: initialDurations?.longBreak ?? DEFAULT_DURATION.longBreak,
  });
  const [remaining, setRemaining] = useState((initialDurations?.focus ?? DEFAULT_DURATION.focus) * 60);
  const [running, setRunning] = useState(false);
  const [autoStart, setAutoStart] = useState(initialAutoStart);
  // notifyEnabled: absent/true means notifications on; false means silenced by user
  const [notifyEnabled, setNotifyEnabled] = useState(initialNotify !== false);
  // runKey: increment to force a new interval when autoStart transitions phases (running stays true)
  const [runKey, setRunKey] = useState(0);
  const [customMode, setCustomMode] = useState<Phase | null>(null);
  const [showPresets, setShowPresets] = useState(false);
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
  const notifyRef = useRef(notifyEnabled);
  notifyRef.current = notifyEnabled;
  const onSessionCompleteRef = useRef(onSessionComplete);
  onSessionCompleteRef.current = onSessionComplete;
  // cycleCount: focus sessions completed in the current long-break cycle (resets to 0 at app start and after long break)
  const cycleCountRef = useRef(0);
  const effectiveLongBreakInterval = longBreakInterval ?? 4;
  const longBreakIntervalRef = useRef(effectiveLongBreakInterval);
  longBreakIntervalRef.current = effectiveLongBreakInterval;

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
        let next: Phase;
        if (currentPhase === "focus") {
          onSessionCompleteRef.current?.();
          const newCount = cycleCountRef.current + 1;
          if (newCount >= longBreakIntervalRef.current) {
            next = "longBreak";
            cycleCountRef.current = 0;
            if (notifyRef.current) notify("Vision Widget", `🍅 ${longBreakIntervalRef.current}회 완료! ${durationsRef.current.longBreak}분 긴 휴식하세요.`);
          } else {
            next = "break";
            cycleCountRef.current = newCount;
            if (notifyRef.current) notify("Vision Widget", `🍅 포모도로 완료! ${durationsRef.current.break}분 휴식하세요.`);
          }
        } else {
          next = "focus";
          const msg = currentPhase === "longBreak"
            ? "💪 긴 휴식 종료! 새 사이클을 시작하세요."
            : "💪 휴식 종료! 다시 집중할 시간.";
          if (notifyRef.current) notify("Vision Widget", msg);
        }
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
  // but DOES advance the long-break cycle count (user is "done" with the current focus).
  // autoStart respected: if running+autoStart, next phase auto-starts; otherwise stops.
  const skipPhase = () => {
    let next: Phase;
    if (phase === "focus") {
      const newCount = cycleCountRef.current + 1;
      if (newCount >= longBreakIntervalRef.current) {
        next = "longBreak";
        cycleCountRef.current = 0;
      } else {
        next = "break";
        cycleCountRef.current = newCount;
      }
    } else {
      next = "focus";
    }
    setPhase(next);
    setRemaining(durationsRef.current[next] * 60);
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
    setShowPresets(false);
    // Reset cycle count when manually navigating phases to avoid unexpected long break
    cycleCountRef.current = 0;
  };

  const applyDuration = (p: Phase, mins: number) => {
    if (running) return;
    const next = { ...durations, [p]: mins };
    setDurations(next);
    onDurationsChange?.(next);
    if (p === phase) setRemaining(mins * 60);
    setCustomMode(null);
    setShowPresets(false);
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

  const accent = phaseAccent(phase);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = 1 - remaining / (durations[phase] * 60);
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

  // Determine what the next phase will be when skip is pressed (for tooltip)
  const skipNextPhase: Phase = phase === "focus"
    ? (cycleCountRef.current + 1 >= effectiveLongBreakInterval ? "longBreak" : "break")
    : "focus";

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
              ? `${phaseLabel(phase)} ${pad(minutes)}:${pad(seconds)}`
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
            {(["focus", "break", "longBreak"] as Phase[]).map(p => {
              const tabAccent = phaseAccent(p);
              return (
                <button
                  key={p}
                  onClick={() => p === phase ? setShowPresets(v => !v) : switchPhase(p)}
                  style={{
                    flex: 1, padding: "4px 0", borderRadius: radius.bar,
                    background: phase === p ? `${tabAccent}22` : "transparent",
                    border: `1px solid ${phase === p ? tabAccent + "44" : colors.borderFaint}`,
                    color: phase === p ? tabAccent : colors.textSubtle,
                    fontSize: fontSizes.xs, cursor: "pointer",
                  }}
                >
                  {phaseLabel(p)} {durations[p]}분
                </button>
              );
            })}
          </div>

          {/* Duration presets — visible only when active tab is clicked */}
          {showPresets && <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
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
          </div>}

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
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

          {/* Long break interval row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: fontSizes.xs, color: colors.textSubtle }}>긴 휴식 주기</span>
            <div style={{ display: "flex", gap: 4 }}>
              {LONG_BREAK_INTERVAL_PRESETS.map(n => {
                const active = effectiveLongBreakInterval === n;
                return (
                  <button
                    key={n}
                    onClick={() => onLongBreakIntervalChange?.(n)}
                    style={{
                      fontSize: fontSizes.xs, padding: "2px 6px", borderRadius: radius.chip,
                      background: "transparent",
                      border: `1px solid ${active ? colors.statusLongBreak + "88" : colors.borderFaint}`,
                      color: active ? colors.statusLongBreak : colors.textPhantom,
                      cursor: "pointer", fontWeight: active ? 600 : 400,
                      fontFamily: fonts.mono,
                    }}
                  >
                    {n}회
                  </button>
                );
              })}
            </div>
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
              title={`다음 단계로 건너뛰기 (${phaseLabel(phase)} → ${phaseLabel(skipNextPhase)})`}
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
            {/* Notify toggle: bell on = desktop notification on phase end; bell-off = silenced */}
            <button
              onClick={() => {
                const next = !notifyEnabled;
                setNotifyEnabled(next);
                onNotifyChange?.(next);
              }}
              title={notifyEnabled ? "알림 켜짐 — 클릭하여 끄기" : "알림 꺼짐 — 클릭하여 켜기"}
              style={{
                padding: "6px 10px", borderRadius: radius.chip,
                background: notifyEnabled ? `${accent}22` : "transparent",
                border: `1px solid ${notifyEnabled ? accent + "44" : colors.borderFaint}`,
                color: notifyEnabled ? accent : colors.textPhantom,
                fontSize: fontSizes.sm, cursor: "pointer",
              }}
            >
              {notifyEnabled ? "🔔" : "🔕"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
