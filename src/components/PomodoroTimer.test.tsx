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

describe("PomodoroTimer weekly trend display", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should display weekly session count with 회 suffix when sessions exist", () => {
    // cur7 = 3 + 2 = 5 sessions (both dates fall in the current 7-day window ending today)
    const sessionHistory = [
      { date: "2026-03-15", count: 3 },
      { date: "2026-03-14", count: 2 },
    ];
    render(<PomodoroTimer sessionHistory={sessionHistory} />);
    // cur7=5, prev7=0 → trend='↑', so rendered text is "5회↑"; /5회/ partial match covers this
    expect(screen.queryByText(/5회/)).not.toBeNull();
  });

  it("should NOT display weekly session count as 'N/7' (misleading fraction format)", () => {
    // Pomodoro sessions are unbounded per week — 'N/7' looks like 'N out of 7' which is wrong
    const sessionHistory = [
      { date: "2026-03-15", count: 3 },
      { date: "2026-03-14", count: 2 },
    ];
    render(<PomodoroTimer sessionHistory={sessionHistory} />);
    // cur7 = 5 — should NOT render as "5/7" which implies a 7-cap; actual is "5회↑"
    expect(screen.queryByText(/5\/7/)).toBeNull();
  });
});

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

describe("PomodoroTimer start button always starts focus phase (Bug #43)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should switch to focus phase and start timer when start button is clicked from break tab", async () => {
    // Arrange: render with break tab active
    render(
      <PomodoroTimer
        initialDurations={{ focus: FOCUS_MINS, break: BREAK_MINS }}
        initialOpen={true}
      />
    );

    // Switch to break tab manually — match exactly "휴식 N분" (not "긴 휴식 N분")
    const breakTab = screen.getByText(/^휴식 \d+분$/);
    await act(async () => { breakTab.click(); });

    // Act: click start button while on break tab
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });

    // Assert: timer should be running in focus phase, not break phase
    // "⏸ 일시정지" means running; header should show focus indicator
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    // The running phase should be focus — header shows "집중 MM:SS" pattern
    const focusIndicator = screen.queryByText(/집중 \d{2}:\d{2}/);
    expect(focusIndicator).not.toBeNull();
  });
});

describe("PomodoroTimer tab click should not stop running timer (Bug #43)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should keep timer running when break tab is clicked during focus timer", async () => {
    // Arrange: start focus timer
    renderTimer({ initialAutoStart: false });

    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });

    // Verify timer is running
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();

    // Act: click break tab while focus timer is running — match exactly "휴식 N분" (not "긴 휴식 N분")
    const breakTab = screen.getByText(/^휴식 \d+분$/);
    await act(async () => { breakTab.click(); });

    // Assert: timer must still be running — only ⏸ button should stop it
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
  });

  it("should switch to focus and start fresh when start is pressed while break timer is paused", async () => {
    // Arrange: start break timer (autoStart on, run through focus, now in break)
    renderTimer({ initialAutoStart: true });

    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });

    // Run through focus → break auto-starts
    await advanceSecs(62);

    // Pause the break timer explicitly
    const pauseBtn = screen.getByText("⏸ 일시정지");
    await act(async () => { pauseBtn.click(); });

    // Now in break phase, paused
    expect(screen.queryByText("▶ 시작")).not.toBeNull();

    // Act: press start — should switch to focus and start, not resume break
    const startBtn2 = screen.getByText("▶ 시작");
    await act(async () => { startBtn2.click(); });

    // Assert: focus timer should now be running
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    const focusIndicator = screen.queryByText(/집중 \d{2}:\d{2}/);
    expect(focusIndicator).not.toBeNull();
  });
});
