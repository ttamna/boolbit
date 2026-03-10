// ABOUTME: PomodoroTimer component - 25/5 minute focus timer with desktop notification
// ABOUTME: Sends Tauri notification when a session completes; collapses when not in use

import { useState, useEffect, useRef, CSSProperties } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { fonts, fontSizes, colors, radius } from "../theme";

type Phase = "focus" | "break";

const PHASE_DURATION: Record<Phase, number> = {
  focus: 25 * 60,
  break: 5 * 60,
};

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

export function PomodoroTimer() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(PHASE_DURATION.focus);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          const next: Phase = phase === "focus" ? "break" : "focus";
          const msg = phase === "focus"
            ? "🍅 포모도로 완료! 5분 휴식하세요."
            : "💪 휴식 종료! 다시 집중할 시간.";
          notify("Vision Widget", msg);
          setRunning(false);
          setPhase(next);
          return PHASE_DURATION[next];
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase]);

  const reset = () => {
    setRunning(false);
    setRemaining(PHASE_DURATION[phase]);
  };

  const switchPhase = (p: Phase) => {
    setRunning(false);
    setPhase(p);
    setRemaining(PHASE_DURATION[p]);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = 1 - remaining / PHASE_DURATION[phase];
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
        <span style={{ ...mono, fontSize: fontSizes.xs, color: accent }}>
          {running ? `${pad(minutes)}:${pad(seconds)}` : "▶"}
        </span>
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
                {p === "focus" ? "집중 25분" : "휴식 5분"}
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
