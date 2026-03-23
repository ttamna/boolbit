// ABOUTME: Tests for PomodoroTimer behavior — autoStart phase-transition, start-button-always-focus,
// ABOUTME: session completion callback, long-break interval, goal display, focus context row, lifetime badge, reset, skip

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

describe("PomodoroTimer start button always starts focus session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start focus session when start is clicked from break phase at rest", async () => {
    renderTimer();
    // Manually switch to break phase (not running)
    const breakTab = screen.getByText(/^휴식 \d+분$/);
    await act(async () => { breakTab.click(); });
    // Click Start — should start focus, not break
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });
    // Timer is running in focus phase
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    expect(screen.queryAllByText(/집중 \d{2}:\d{2}/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/휴식 \d{2}:\d{2}/)).toBeNull();
  });

  it("should start focus session when start is clicked from longBreak phase at rest", async () => {
    renderTimer();
    const longBreakTab = screen.getByText(/^긴 휴식 \d+분$/);
    await act(async () => { longBreakTab.click(); });
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    expect(screen.queryAllByText(/집중 \d{2}:\d{2}/).length).toBeGreaterThan(0);
  });
});

describe("PomodoroTimer duration change while timer is running", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should keep timer running when break tab is clicked during focus session", async () => {
    renderTimer();
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    // Click break tab while focus is running
    const breakTab = screen.getByText(/^휴식 \d+분$/);
    await act(async () => { breakTab.click(); });
    // Timer must still be running in focus phase
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    expect(screen.queryAllByText(/집중 \d{2}:\d{2}/).length).toBeGreaterThan(0);
  });

  it("should allow changing break duration while focus timer is running", async () => {
    const onDurationsChange = vi.fn();
    renderTimer({ onDurationsChange });
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });
    // Click break tab to open break presets without stopping timer
    const breakTab = screen.getByText(/^휴식 \d+분$/);
    await act(async () => { breakTab.click(); });
    // Select 10-minute break preset
    const preset10 = screen.getByText("10분");
    await act(async () => { preset10.click(); });
    // Timer still running after duration change
    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    // Duration callback fired with new break duration
    expect(onDurationsChange).toHaveBeenCalledWith(expect.objectContaining({ break: 10 }));
  });
});

describe("PomodoroTimer tab click while paused", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should NOT reset paused focus timer when break tab is clicked", async () => {
    renderTimer({ initialAutoStart: false });
    // Start focus timer
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });
    // Advance 30 seconds — remaining = 30s
    await advanceSecs(30);
    // Pause
    const pauseBtn = screen.getByText("⏸ 일시정지");
    await act(async () => { pauseBtn.click(); });
    // Header shows ⏸ 00:30 (paused mid-countdown)
    expect(screen.queryByText("⏸ 00:30")).not.toBeNull();
    // Click break tab while paused — must NOT reset the timer
    const breakTab = screen.getByText(/^휴식 \d+분$/);
    await act(async () => { breakTab.click(); });
    // Remaining must still be 30s — not reset to full break duration
    expect(screen.queryByText("⏸ 00:30")).not.toBeNull();
  });

  it("should NOT reset paused focus timer when longBreak tab is clicked", async () => {
    renderTimer({ initialAutoStart: false });
    const startBtn = screen.getByText("▶ 시작");
    await act(async () => { startBtn.click(); });
    await advanceSecs(30);
    const pauseBtn = screen.getByText("⏸ 일시정지");
    await act(async () => { pauseBtn.click(); });
    expect(screen.queryByText("⏸ 00:30")).not.toBeNull();
    const longBreakTab = screen.getByText(/^긴 휴식 \d+분$/);
    await act(async () => { longBreakTab.click(); });
    expect(screen.queryByText("⏸ 00:30")).not.toBeNull();
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

    // longBreakInterval=4 ensures 3 focus sessions cycle through regular breaks (not long break)
    renderTimer({ onSessionComplete, longBreakInterval: 4 });

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

describe("PomodoroTimer session completion callback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onSessionComplete with focus duration when focus phase expires", async () => {
    const onSessionComplete = vi.fn();
    // longBreakInterval=99 prevents long break from triggering after first session
    renderTimer({ onSessionComplete, longBreakInterval: 99 });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    await advanceSecs(62);

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith(FOCUS_MINS);
  });

  it("should NOT call onSessionComplete when break phase expires", async () => {
    const onSessionComplete = vi.fn();
    renderTimer({ onSessionComplete, longBreakInterval: 99 });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    await advanceSecs(62); // focus → 1 session fires
    await advanceSecs(62); // break → no additional session

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });
});

describe("PomodoroTimer long break interval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should trigger regular break after first focus when interval=2", async () => {
    renderTimer({ longBreakInterval: 2 });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    // First focus completes → cycleCount=1, 1 < interval=2 → regular break
    await advanceSecs(62);

    expect(screen.queryAllByText(/휴식 \d{2}:\d{2}/).length).toBeGreaterThan(0);
    // Long break must NOT be triggered yet
    expect(screen.queryAllByText(/긴 휴식 \d{2}:\d{2}/).length).toBe(0);
  });

  it("should trigger longBreak after reaching longBreakInterval focus completions", async () => {
    renderTimer({ longBreakInterval: 2 });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    await advanceSecs(62); // focus 1 → break (cycleCount=1)
    await advanceSecs(62); // break → focus 2
    await advanceSecs(62); // focus 2 → longBreak (cycleCount+1=2 >= interval=2)

    expect(screen.queryAllByText(/긴 휴식 \d{2}:\d{2}/).length).toBeGreaterThan(0);
  });
});

describe("PomodoroTimer session goal display", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show N/G세션 format when sessionGoal and sessionsToday are provided", () => {
    render(<PomodoroTimer initialOpen={true} sessionsToday={2} sessionGoal={4} />);
    expect(screen.queryByText("2/4세션")).not.toBeNull();
  });

  it("should show dash when no sessionGoal is set", () => {
    render(<PomodoroTimer initialOpen={true} sessionsToday={0} />);
    expect(screen.queryByText("—")).not.toBeNull();
    expect(screen.queryByText(/\/\d+세션/)).toBeNull();
  });
});

describe("PomodoroTimer focus context row", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show focusProject during active focus session and hide it at rest", async () => {
    renderTimer({ focusProject: "vision-widget", initialAutoStart: false });

    // At rest — context row not rendered
    expect(screen.queryByText("vision-widget")).toBeNull();

    await act(async () => { screen.getByText("▶ 시작").click(); });

    // Running in focus phase — context row visible
    expect(screen.queryByText("vision-widget")).not.toBeNull();
  });

  it("should show todayIntention during active focus session", async () => {
    renderTimer({ todayIntention: "오늘의 의도 완수", initialAutoStart: false });

    expect(screen.queryByText("오늘의 의도 완수")).toBeNull();

    await act(async () => { screen.getByText("▶ 시작").click(); });

    expect(screen.queryByText("오늘의 의도 완수")).not.toBeNull();
  });

  it("should hide focusProject when break phase begins after focus completes", async () => {
    // autoStart=true so break auto-starts after focus
    renderTimer({ focusProject: "vision-widget" });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    expect(screen.queryByText("vision-widget")).not.toBeNull();

    await advanceSecs(62); // focus → break (running && phase="break" → context row hidden)

    expect(screen.queryByText("vision-widget")).toBeNull();
  });
});

describe("PomodoroTimer lifetime minutes display", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show formatted lifetime badge in header when lifetimeMins > 0", () => {
    // 90 mins → formatLifetime(90) = "1h 30m"
    render(<PomodoroTimer lifetimeMins={90} />);
    expect(screen.queryByText("∑1h 30m")).not.toBeNull();
  });

  it("should not show lifetime badge when lifetimeMins is absent", () => {
    render(<PomodoroTimer />);
    expect(screen.queryByText(/∑/)).toBeNull();
  });
});

describe("PomodoroTimer reset button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should stop timer and restore full duration without calling onSessionComplete", async () => {
    const onSessionComplete = vi.fn();
    renderTimer({ onSessionComplete, initialAutoStart: false });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    await advanceSecs(30); // advance 30s → 30s remaining (shows ⏸ 00:30 when paused)

    await act(async () => { screen.getByTitle("현재 단계 처음으로").click(); });

    // Timer stopped and remaining reset to full duration → isPaused=false, shows "▶ 시작"
    expect(screen.queryByText("▶ 시작")).not.toBeNull();
    // "⏸ 00:30" (mid-countdown paused state) must not appear since remaining is reset
    expect(screen.queryByText("⏸ 00:30")).toBeNull();
    expect(onSessionComplete).not.toHaveBeenCalled();
  });
});

describe("PomodoroTimer skip phase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should skip to break without calling onSessionComplete when focus is running", async () => {
    const onSessionComplete = vi.fn();
    renderTimer({ onSessionComplete, initialAutoStart: false });

    await act(async () => { screen.getByText("▶ 시작").click(); });
    await act(async () => { screen.getByTitle(/다음 단계로 건너뛰기/).click(); });

    // Skip does NOT count as a completed session
    expect(onSessionComplete).not.toHaveBeenCalled();
    // Timer stopped (autoStart=false) after phase transition
    expect(screen.queryByText("▶ 시작")).not.toBeNull();
  });

  it("should auto-start focus phase when skip is pressed during running break with autoStart=true", async () => {
    renderTimer({ longBreakInterval: 99, initialAutoStart: true }); // prevent long break; explicit autoStart

    await act(async () => { screen.getByText("▶ 시작").click(); });
    await advanceSecs(62); // focus → break auto-starts

    // Break is now running — skip should transition to focus and auto-start
    await act(async () => { screen.getByTitle(/다음 단계로 건너뛰기/).click(); });

    expect(screen.queryByText("⏸ 일시정지")).not.toBeNull();
    expect(screen.queryAllByText(/집중 \d{2}:\d{2}/).length).toBeGreaterThan(0);
  });
});
