// ABOUTME: Unit tests for HabitStreak pure helper functions and component rendering
// ABOUTME: Covers habitLastCheckDaysAgo, habit notes visibility, sort button behavior, and personal-best indicator

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { habitLastCheckDaysAgo, HabitStreak } from "./HabitStreak";
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
