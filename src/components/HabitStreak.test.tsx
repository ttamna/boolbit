// ABOUTME: Unit tests for HabitStreak pure helper functions and component rendering
// ABOUTME: Covers habitLastCheckDaysAgo, habitsTodayPct, getMilestone, getUpcomingMilestone, habit notes visibility, sort button behavior, and personal-best indicator

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { habitLastCheckDaysAgo, habitsTodayPct, getMilestone, getUpcomingMilestone, HabitStreak } from "./HabitStreak";
import type { Habit } from "../types";

describe("habitLastCheckDaysAgo", () => {
  const TODAY = "2026-03-14";

  it("should return null when checkHistory is undefined", () => {
    expect(habitLastCheckDaysAgo(undefined, TODAY)).toBeNull();
  });

  it("should return null when checkHistory is empty", () => {
    expect(habitLastCheckDaysAgo([], TODAY)).toBeNull();
  });

  it("should return null when today is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-14"], TODAY)).toBeNull();
  });

  it("should return null when yesterday is the last check (atRisk already shown)", () => {
    expect(habitLastCheckDaysAgo(["2026-03-13"], TODAY)).toBeNull();
  });

  it("should return 2 when 2 days ago is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-12"], TODAY)).toBe(2);
  });

  it("should return 7 when 7 days ago is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-07"], TODAY)).toBe(7);
  });

  it("should use the most recent (last) entry when history has multiple dates", () => {
    // checkHistory is sorted ascending — last entry is most recent
    expect(habitLastCheckDaysAgo(["2026-03-01", "2026-03-10", "2026-03-12"], TODAY)).toBe(2);
  });

  it("should return null for malformed date strings in checkHistory", () => {
    expect(habitLastCheckDaysAgo(["not-a-date"], TODAY)).toBeNull();
  });

  it("should return null when today parameter is malformed", () => {
    expect(habitLastCheckDaysAgo(["2026-03-12"], "not-a-date")).toBeNull();
  });

  it("should return null for future lastCheck dates (clock skew or manual edit)", () => {
    // Future date produces negative days; days >= 2 is false, so null is returned safely
    expect(habitLastCheckDaysAgo(["2026-03-20"], TODAY)).toBeNull();
  });
});

describe("habitsTodayPct", () => {
  const TODAY = "2026-03-15";

  it("should return null when habits array is empty", () => {
    expect(habitsTodayPct([], TODAY)).toBeNull();
  });

  it("should return 0 when no habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃" },
      { id: "h2", name: "Read", streak: 1, icon: "📚" },
    ];
    expect(habitsTodayPct(habits, TODAY)).toBe(0);
  });

  it("should return 100 when all habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 1, icon: "📚", lastChecked: TODAY },
    ];
    expect(habitsTodayPct(habits, TODAY)).toBe(100);
  });

  it("should return 50 when half the habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: TODAY },
      { id: "h2", name: "Read", streak: 1, icon: "📚" },
    ];
    expect(habitsTodayPct(habits, TODAY)).toBe(50);
  });

  it("should round to nearest integer", () => {
    // 1/3 = 33.33... → 33
    const habits: Habit[] = [
      { id: "h1", name: "A", streak: 1, icon: "A", lastChecked: TODAY },
      { id: "h2", name: "B", streak: 1, icon: "B" },
      { id: "h3", name: "C", streak: 1, icon: "C" },
    ];
    expect(habitsTodayPct(habits, TODAY)).toBe(33);
  });

  it("should not count habits checked on a different day", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: "2026-03-14" },
    ];
    expect(habitsTodayPct(habits, TODAY)).toBe(0);
  });

  it("should return 100 for a single habit done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 1, icon: "🏃", lastChecked: TODAY },
    ];
    expect(habitsTodayPct(habits, TODAY)).toBe(100);
  });
});

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

describe("getMilestone", () => {
  it("should return null when streak is 0", () => {
    expect(getMilestone(0)).toBeNull();
  });

  it("should return null when streak is negative", () => {
    expect(getMilestone(-5)).toBeNull();
  });

  it("should return null when streak is 6 (one short of first milestone)", () => {
    expect(getMilestone(6)).toBeNull();
  });

  it("should return 🔥 when streak is exactly 7", () => {
    expect(getMilestone(7)).toBe("🔥");
  });

  it("should return 🔥 when streak is between 7 and 29", () => {
    expect(getMilestone(15)).toBe("🔥");
    expect(getMilestone(29)).toBe("🔥");
  });

  it("should return ⭐ when streak is exactly 30", () => {
    expect(getMilestone(30)).toBe("⭐");
  });

  it("should return ⭐ when streak is between 30 and 99", () => {
    expect(getMilestone(50)).toBe("⭐");
    expect(getMilestone(99)).toBe("⭐");
  });

  it("should return 💎 when streak is exactly 100", () => {
    expect(getMilestone(100)).toBe("💎");
  });

  it("should return 💎 when streak exceeds 100", () => {
    expect(getMilestone(150)).toBe("💎");
    expect(getMilestone(365)).toBe("💎");
  });
});

describe("getUpcomingMilestone", () => {
  it("should return null when streak is 0", () => {
    expect(getUpcomingMilestone(0)).toBeNull();
  });

  it("should return null when streak is negative", () => {
    expect(getUpcomingMilestone(-1)).toBeNull();
  });

  it("should return 🔥 when exactly at threshold distance from 7", () => {
    // streak=4, threshold=3: days=7-4=3, within threshold
    expect(getUpcomingMilestone(4, 3)).toEqual({ days: 3, badge: "🔥" });
  });

  it("should return 🔥 when 1 day away from 7", () => {
    expect(getUpcomingMilestone(6, 3)).toEqual({ days: 1, badge: "🔥" });
  });

  it("should return null when one day beyond threshold distance (streak=3, threshold=3)", () => {
    // streak=3: days=7-3=4, exceeds threshold=3
    expect(getUpcomingMilestone(3, 3)).toBeNull();
  });

  it("should return null when streak has just reached 7 (no upcoming below 30 within threshold=3)", () => {
    // streak=7: at milestone; next=30, days=23 >> 3
    expect(getUpcomingMilestone(7, 3)).toBeNull();
  });

  it("should return ⭐ when within threshold of 30", () => {
    // streak=27: days=30-27=3, within threshold
    expect(getUpcomingMilestone(27, 3)).toEqual({ days: 3, badge: "⭐" });
    expect(getUpcomingMilestone(29, 3)).toEqual({ days: 1, badge: "⭐" });
  });

  it("should return null when streak has just reached 30 (next=100 is far)", () => {
    expect(getUpcomingMilestone(30, 3)).toBeNull();
  });

  it("should return 💎 when within threshold of 100", () => {
    expect(getUpcomingMilestone(97, 3)).toEqual({ days: 3, badge: "💎" });
    expect(getUpcomingMilestone(99, 3)).toEqual({ days: 1, badge: "💎" });
  });

  it("should return null when streak has just reached 100 (no further milestones)", () => {
    expect(getUpcomingMilestone(100, 3)).toBeNull();
  });

  it("should return null when streak exceeds all milestones", () => {
    expect(getUpcomingMilestone(200, 3)).toBeNull();
  });

  it("should return non-null for both getMilestone and getUpcomingMilestone when streak is 27", () => {
    // streak=27: already at 🔥 (≥7) and ⭐ is 3 days away — callers must decide which to display
    expect(getMilestone(27)).toBe("🔥");
    expect(getUpcomingMilestone(27, 3)).toEqual({ days: 3, badge: "⭐" });
  });

  it("should show milestone emoji and suppress upcoming text when both apply", () => {
    // streak=27: component renders 🔥 (milestone branch) and suppresses +3⭐ (upcoming suppressed by ternary)
    const habit: Habit = { id: "h1", name: "Run", streak: 27, icon: "🏃" };
    render(<HabitStreak habits={[habit]} />);
    expect(screen.queryByText("🔥")).not.toBeNull();
    expect(screen.queryByText("+3⭐")).toBeNull();
  });

  it("should respect custom threshold: streak=25 is within threshold=5 of 30", () => {
    // days=30-25=5, within threshold=5
    expect(getUpcomingMilestone(25, 5)).toEqual({ days: 5, badge: "⭐" });
    // But NOT within default threshold=3 (days=5 > 3)
    expect(getUpcomingMilestone(25, 3)).toBeNull();
  });
});
