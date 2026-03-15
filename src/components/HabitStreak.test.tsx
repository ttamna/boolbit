// ABOUTME: Unit tests for HabitStreak component rendering behavior
// ABOUTME: Covers today completion bar, notes display, sort button, personal-best indicator, milestone rendering, targetStreak notification, checkAll batch check-in, at-risk state, 14-day heatmap, and weekly trend

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitStreak } from "./HabitStreak";
import type { Habit } from "../types";

describe("HabitStreak today completion bar", () => {
  const TODAY = "2026-03-15";

  // Pin system time (UTC noon) so the component's internal getToday() matches the TODAY fixture.
  // UTC+12/UTC-12 edge cases are excluded but do not affect the project's target runtime (KST, UTC).
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("should render today completion bar tooltip when at least one habit is checked today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 1, icon: "📚" },
    ];
    render(<HabitStreak habits={habits} />);
    expect(screen.getByTitle("오늘 1/2 완료")).toBeDefined();
  });

  it("should apply 50% width to bar inner div when half done", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 1, icon: "📚" },
    ];
    render(<HabitStreak habits={habits} />);
    const container = screen.getByTitle("오늘 1/2 완료");
    const innerBar = container.firstElementChild as HTMLElement;
    expect(innerBar.style.width).toBe("50%");
  });

  it("should render today completion bar tooltip at 0% when no habits done", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃" },
    ];
    render(<HabitStreak habits={habits} />);
    expect(screen.getByTitle("오늘 0/1 완료")).toBeDefined();
  });

  it("should apply 0% width to bar inner div when no habits done", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃" },
    ];
    render(<HabitStreak habits={habits} />);
    const container = screen.getByTitle("오늘 0/1 완료");
    const innerBar = container.firstElementChild as HTMLElement;
    expect(innerBar.style.width).toBe("0%");
  });

  it("should not render today completion bar when habits array is empty", () => {
    render(<HabitStreak habits={[]} />);
    expect(screen.queryByTitle(/오늘 \d+\/\d+ 완료/)).toBeNull();
  });
});

describe("HabitStreak view mode notes display", () => {
  const baseHabit: Habit = {
    id: "h1",
    name: "Morning run",
    streak: 3,
    icon: "🏃",
  };

  it("should display notes text when habit has notes", () => {
    const habit = { ...baseHabit, notes: "Keep the momentum going!" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByText("Keep the momentum going!")).toBeDefined();
  });

  it("should show placeholder text instead of notes when habit has no notes", () => {
    render(<HabitStreak habits={[baseHabit]} />);
    // When notes is absent, InlineEdit renders the placeholder "+" 이유" (not actual notes text)
    expect(screen.getByText("+ 이유")).toBeDefined();
  });

  it("should display notes for multiple habits independently", () => {
    const habitA = { ...baseHabit, id: "h1", name: "Run", notes: "Note A" };
    const habitB = { ...baseHabit, id: "h2", name: "Read", notes: undefined };
    const habitC = { ...baseHabit, id: "h3", name: "Meditate", notes: "Note C" };
    render(<HabitStreak habits={[habitA, habitB, habitC]} />);
    expect(screen.getByText("Note A")).toBeDefined();
    expect(screen.queryByText("Note B")).toBeNull();
    expect(screen.getByText("Note C")).toBeDefined();
  });
});

describe("HabitStreak sort button", () => {
  const makeHabit = (id: string, streak: number): Habit => ({
    id, name: `Habit ${id}`, streak, icon: "⭐",
  });

  it("should render ↕ sort button when 2+ habits and onHabitsChange is provided", () => {
    const habits = [makeHabit("h1", 5), makeHabit("h2", 10)];
    render(<HabitStreak habits={habits} onHabitsChange={() => {}} />);
    expect(screen.getByTitle("스트릭 기준 내림차순 정렬")).toBeDefined();
  });

  it("should not render ↕ button when only 1 habit", () => {
    render(<HabitStreak habits={[makeHabit("h1", 5)]} onHabitsChange={() => {}} />);
    expect(screen.queryByTitle("스트릭 기준 내림차순 정렬")).toBeNull();
  });

  it("should not render ↕ button when onHabitsChange is not provided", () => {
    const habits = [makeHabit("h1", 5), makeHabit("h2", 10)];
    render(<HabitStreak habits={habits} />);
    expect(screen.queryByTitle("스트릭 기준 내림차순 정렬")).toBeNull();
  });

  it("should call onHabitsChange with habits sorted by streak descending", () => {
    const habits = [makeHabit("h1", 3), makeHabit("h2", 10), makeHabit("h3", 7)];
    const onChange = vi.fn();
    render(<HabitStreak habits={habits} onHabitsChange={onChange} />);
    fireEvent.click(screen.getByTitle("스트릭 기준 내림차순 정렬"));
    expect(onChange).toHaveBeenCalledOnce();
    const sortedArg: Habit[] = onChange.mock.calls[0][0];
    expect(sortedArg.map(h => h.streak)).toEqual([10, 7, 3]);
  });

  it("should preserve habit data when sorting", () => {
    const h1 = { ...makeHabit("h1", 3), notes: "Note A" };
    const h2 = { ...makeHabit("h2", 10), notes: "Note B" };
    const onChange = vi.fn();
    render(<HabitStreak habits={[h1, h2]} onHabitsChange={onChange} />);
    fireEvent.click(screen.getByTitle("스트릭 기준 내림차순 정렬"));
    const sortedArg: Habit[] = onChange.mock.calls[0][0];
    expect(sortedArg[0].id).toBe("h2");
    expect(sortedArg[0].notes).toBe("Note B");
    expect(sortedArg[1].id).toBe("h1");
  });

  it("should preserve relative order of habits with equal streak (stable sort)", () => {
    // New habits start with streak=0; sort must not reorder equal-streak items relative to each other.
    // ES2019+ guarantees Array.sort is stable, so equal comparator results preserve input order.
    const habits = [makeHabit("h1", 0), makeHabit("h2", 0), makeHabit("h3", 0)];
    const onChange = vi.fn();
    render(<HabitStreak habits={habits} onHabitsChange={onChange} />);
    fireEvent.click(screen.getByTitle("스트릭 기준 내림차순 정렬"));
    const sortedArg: Habit[] = onChange.mock.calls[0][0];
    expect(sortedArg.map(h => h.id)).toEqual(["h1", "h2", "h3"]);
  });
});

describe("HabitStreak personal-best indicator", () => {
  it("should show ★ when streak equals bestStreak and is ≥7", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 10, icon: "🏃", bestStreak: 10 };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByTitle("개인 최고 기록 10일 달성 중!")).toBeDefined();
  });

  it("should show ★ at exactly the 7-day threshold", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 7, icon: "🏃", bestStreak: 7 };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByTitle("개인 최고 기록 7일 달성 중!")).toBeDefined();
  });

  it("should not show ★ when streak is below bestStreak (shows ↑N instead)", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 5, icon: "🏃", bestStreak: 15 };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByTitle(/개인 최고 기록.*달성 중!/)).toBeNull();
  });

  it("should not show ★ when streak is below the 7-day threshold", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 5, icon: "🏃", bestStreak: 5 };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByTitle(/개인 최고 기록.*달성 중!/)).toBeNull();
  });

  it("should not show ★ when bestStreak is undefined", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 10, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByTitle(/개인 최고 기록.*달성 중!/)).toBeNull();
  });

  it("should not show ★ when streak is 0", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 0, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByTitle(/개인 최고 기록.*달성 중!/)).toBeNull();
  });

  it("should not show ★ when streak ≥7 but bestStreak is undefined (no tracking record)", () => {
    // streak >= 7 threshold met, but bestStreak was never set — no personal-best record to celebrate
    const habit: Habit = { id: "h1", name: "Run", streak: 7, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByTitle(/개인 최고 기록.*달성 중!/)).toBeNull();
  });
});

describe("HabitStreak milestone rendering", () => {
  it("should show milestone emoji and suppress upcoming text when both apply", () => {
    // streak=27: component renders 🔥 (milestone branch) and suppresses +3⭐ (upcoming suppressed by ternary)
    const habit: Habit = { id: "h1", name: "Run", streak: 27, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText("🔥")).not.toBeNull();
    expect(screen.queryByText("+3⭐")).toBeNull();
  });
});

describe("HabitStreak targetStreak notification", () => {
  const TODAY = "2026-03-15";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("should call onMilestoneReached with 🎯 when streak hits a non-milestone targetStreak", () => {
    // streak 13 → 14: not a preset milestone (7/30/100), targetStreak=14 → fires 🎯
    const habit: Habit = { id: "h1", name: "Run", streak: 13, icon: "🏃", targetStreak: 14 };
    const onUpdate = vi.fn();
    const onMilestoneReached = vi.fn();
    render(<HabitStreak habits={[habit]} onUpdate={onUpdate} onMilestoneReached={onMilestoneReached} />);
    fireEvent.click(screen.getByTitle("오늘 완료 체크"));
    expect(onMilestoneReached).toHaveBeenCalledWith("Run", 14, "🎯");
  });

  it("should not call onMilestoneReached with 🎯 when targetStreak coincides with preset milestone 7", () => {
    // streak 6 → 7: getMilestone(7)=🔥 fires; 🎯 should NOT fire to avoid duplicate notification
    const habit: Habit = { id: "h1", name: "Run", streak: 6, icon: "🏃", targetStreak: 7 };
    const onUpdate = vi.fn();
    const onMilestoneReached = vi.fn();
    render(<HabitStreak habits={[habit]} onUpdate={onUpdate} onMilestoneReached={onMilestoneReached} />);
    fireEvent.click(screen.getByTitle("오늘 완료 체크"));
    expect(onMilestoneReached).toHaveBeenCalledWith("Run", 7, "🔥");
    expect(onMilestoneReached).not.toHaveBeenCalledWith("Run", 7, "🎯");
  });

  it("should not call onMilestoneReached with 🎯 when targetStreak is not yet reached", () => {
    // streak 12 → 13: targetStreak=14 not yet hit → no 🎯
    const habit: Habit = { id: "h1", name: "Run", streak: 12, icon: "🏃", targetStreak: 14 };
    const onUpdate = vi.fn();
    const onMilestoneReached = vi.fn();
    render(<HabitStreak habits={[habit]} onUpdate={onUpdate} onMilestoneReached={onMilestoneReached} />);
    fireEvent.click(screen.getByTitle("오늘 완료 체크"));
    expect(onMilestoneReached).not.toHaveBeenCalledWith("Run", 13, "🎯");
  });

  it("should not call onMilestoneReached with 🎯 when no targetStreak is set", () => {
    // streak 13 → 14 but no targetStreak defined → no 🎯
    const habit: Habit = { id: "h1", name: "Run", streak: 13, icon: "🏃" };
    const onUpdate = vi.fn();
    const onMilestoneReached = vi.fn();
    render(<HabitStreak habits={[habit]} onUpdate={onUpdate} onMilestoneReached={onMilestoneReached} />);
    fireEvent.click(screen.getByTitle("오늘 완료 체크"));
    expect(onMilestoneReached).not.toHaveBeenCalledWith("Run", 14, "🎯");
  });
});

describe("HabitStreak checkAll batch check-in", () => {
  const TODAY = "2026-03-15";

  // Pin system time so the component's getToday() and yesterdayStr both match fixtures.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("should show '✓ 전체' button when at least one habit is unchecked today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 5, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 3, icon: "📚" },
    ];
    render(<HabitStreak habits={habits} onHabitsChange={vi.fn()} />);
    expect(screen.getByText("✓ 전체")).toBeDefined();
  });

  it("should not show '✓ 전체' when all habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 5, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 3, icon: "📚", lastChecked: TODAY },
    ];
    render(<HabitStreak habits={habits} onHabitsChange={vi.fn()} />);
    expect(screen.queryByText("✓ 전체")).toBeNull();
  });

  it("should not show '✓ 전체' when onHabitsChange is not provided", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 5, icon: "🏃" },
    ];
    render(<HabitStreak habits={habits} />);
    expect(screen.queryByText("✓ 전체")).toBeNull();
  });

  it("should call onHabitsChange once with all habits marked done today when '✓ 전체' is clicked", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 5, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 3, icon: "📚" },
    ];
    const onHabitsChange = vi.fn();
    render(<HabitStreak habits={habits} onHabitsChange={onHabitsChange} />);
    fireEvent.click(screen.getByText("✓ 전체"));
    expect(onHabitsChange).toHaveBeenCalledOnce();
    const updated: Habit[] = onHabitsChange.mock.calls[0][0];
    // Both habits should be checked today after batch
    expect(updated[0].lastChecked).toBe(TODAY);
    expect(updated[1].lastChecked).toBe(TODAY);
  });

  it("should not re-check habits already done today when '✓ 전체' is clicked", () => {
    // h1 is already checked today — its streak must NOT be incremented again
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 5, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 3, icon: "📚" },
    ];
    const onHabitsChange = vi.fn();
    render(<HabitStreak habits={habits} onHabitsChange={onHabitsChange} />);
    fireEvent.click(screen.getByText("✓ 전체"));
    const updated: Habit[] = onHabitsChange.mock.calls[0][0];
    expect(updated[0].streak).toBe(5); // unchanged — already done today
  });
});

describe("HabitStreak at-risk state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // today = 2026-03-15, yesterday = 2026-03-14 (UTC noon pins local midnight safely)
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("should show at-risk tooltip when habit was checked yesterday but not today and streak > 0", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 5, icon: "🏃", lastChecked: "2026-03-14" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByTitle("오늘 완료하지 않으면 자정에 스트릭 초기화")).toBeDefined();
  });

  it("should show regular check tooltip when streak is 0 (not at-risk regardless of lastChecked)", () => {
    // streak=0 → atRisk guard fails even if lastChecked is yesterday
    const habit: Habit = { id: "h1", name: "Run", streak: 0, icon: "🏃", lastChecked: "2026-03-14" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByTitle("오늘 완료 체크")).toBeDefined();
  });

  it("should show done tooltip when habit is already checked today", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 5, icon: "🏃", lastChecked: "2026-03-15" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByTitle("오늘 완료됨 — 클릭하여 취소")).toBeDefined();
  });
});

describe("HabitStreak 14-day heatmap and weekly trend", () => {
  // today = 2026-03-15; cur7 = 2026-03-09..15; prev7 = 2026-03-02..08
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("should show N/7 weekly count when habit has check history entries", () => {
    // 2 checks in cur7 → "2/7" (trend may be ↑/↓/"" depending on prev7 count)
    const habit: Habit = {
      id: "h1", name: "Run", streak: 2, icon: "🏃",
      checkHistory: ["2026-03-14", "2026-03-15"],
    };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText(/2\/7/)).not.toBeNull();
  });

  it("should not show N/7 count when checkHistory is empty", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 3, icon: "🏃", checkHistory: [] };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText(/\/7/)).toBeNull();
  });

  it("should not show N/7 count when checkHistory is undefined", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 3, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText(/\/7/)).toBeNull();
  });

  it("should show trend '↑' when current week has more checks than previous week", () => {
    // prev7 (2026-03-02..08): 1 check on 2026-03-08
    // cur7  (2026-03-09..15): 3 checks on 2026-03-13..15 → cur7=3 > prev7=1 → trend=↑
    const habit: Habit = {
      id: "h1", name: "Run", streak: 3, icon: "🏃",
      checkHistory: ["2026-03-08", "2026-03-13", "2026-03-14", "2026-03-15"],
    };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText(/3\/7↑/)).not.toBeNull();
  });

  it("should show trend '↓' when current week has fewer checks than previous week", () => {
    // prev7: 4 checks (2026-03-05..08); cur7: 1 check (2026-03-15) → cur7=1 < prev7=4 → trend=↓
    const habit: Habit = {
      id: "h1", name: "Run", streak: 1, icon: "🏃",
      checkHistory: ["2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08", "2026-03-15"],
    };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText(/1\/7↓/)).not.toBeNull();
  });
});

describe("HabitStreak target streak progress bar", () => {
  it("should show target streak progress bar when targetStreak is set and streak > 0", () => {
    // targetPct = round(5/10*100) = 50 → title "5/10일 — 50%"
    const habit: Habit = { id: "h1", name: "Run", streak: 5, icon: "🏃", targetStreak: 10 };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.getByTitle("5/10일 — 50%")).toBeDefined();
  });

  it("should not show target streak progress bar when targetStreak is not set", () => {
    const habit: Habit = { id: "h1", name: "Run", streak: 5, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    // No title matching "N/M일 — N%" pattern
    expect(screen.queryByTitle(/\d+\/\d+일 — \d+%/)).toBeNull();
  });

  it("should not show target streak progress bar when streak is 0 (calcTargetStreakPct returns undefined)", () => {
    // streak=0 → calcTargetStreakPct returns undefined → bar hidden
    const habit: Habit = { id: "h1", name: "Run", streak: 0, icon: "🏃", targetStreak: 10 };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByTitle(/\d+\/\d+일 — \d+%/)).toBeNull();
  });
});
