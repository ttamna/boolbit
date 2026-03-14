// ABOUTME: Tests for PomodoroTimer autoStart phase-transition behavior
// ABOUTME: focus→break→focus cycle must continue without stopping when autoStart=true

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PomodoroTimer } from "./PomodoroTimer";

// Mock Tauri notification plugin — not available in jsdom
vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn().mockResolvedValue(false),
  requestPermission: vi.fn().mockResolvedValue("denied"),
  sendNotification: vi.fn(),
}));

const FOCUS_MINS = 1; // 1-minute focus (60 seconds)
const BREAK_MINS = 1; // 1-minute break (60 seconds)

// Render with 1-minute durations so each phase takes 60 ticks to complete
function renderTimer(props = {}) {
  return render(
    <PomodoroTimer
      initialDurations={{ focus: FOCUS_MINS, break: BREAK_MINS }}
      initialAutoStart={true}
      initialOpen={true}
      {...props}
    />
  );
}

// Advance fake timers by the given number of seconds, ticking 1s at a time
async function advanceSecs(secs: number) {
  for (let i = 0; i < secs; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe("PomodoroTimer autoStart phase transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should auto-start break phase after focus completes", async () => {
    renderTimer();

    // Start the timer (focus phase)
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });

    // Advance past the full focus duration (60 seconds for 1-minute timer)
    await advanceSecs(62);

    // After focus ends, break should be running — "⏸ 일시정지" confirms timer is running
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    // Header indicator shows "휴식 MM:SS" when break is active
    const allBreakText = screen.queryAllByText(/휴식 \d{2}:\d{2}/);
    expect(allBreakText.length).toBeGreaterThan(0);
  });

  it("should auto-start focus phase after break completes", async () => {
    renderTimer();

    // Start the timer (focus phase)
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });

    // Advance through focus phase
    await advanceSecs(62);

    // Now in break phase — advance through it too
    await advanceSecs(62);

    // After break ends, focus should be running automatically
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    const focusIndicator = screen.queryByText(/집중 00:/);
    expect(focusIndicator).not.toBeNull();
  });

  it("should complete 3 consecutive cycles without stopping when autoStart=true", async () => {
    const onSessionComplete = vi.fn();

    renderTimer({ onSessionComplete });

    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });

    // Cycle 1: focus → break
    await advanceSecs(62);
    // Cycle 1: break → focus
    await advanceSecs(62);
    // Cycle 2: focus → break
    await advanceSecs(62);
    // Cycle 2: break → focus
    await advanceSecs(62);
    // Cycle 3: focus → break
    await advanceSecs(62);

    // 3 focus phases should have completed
    expect(onSessionComplete).toHaveBeenCalledTimes(3);

    // Timer must still be running (not stopped mid-cycle)
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
  });
});
