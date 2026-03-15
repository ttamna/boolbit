// ABOUTME: Unit tests for HabitStreak component rendering behavior
// ABOUTME: Covers today completion bar, notes display, sort button, personal-best indicator, milestone rendering, and targetStreak notification

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
