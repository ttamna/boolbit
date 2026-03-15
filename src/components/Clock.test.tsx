// ABOUTME: Unit tests for calcDayFraction and formatHour pure helper functions, and breakdown bar rendering
// ABOUTME: Validates day progress fraction (out-of-range clamp), 24h/12h hour formatting, edge cases, and momentum breakdown bars

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { calcDayFraction, formatHour } from "./Clock";
import { Clock } from "./Clock";

describe("calcDayFraction", () => {
  it("should return 0 at midnight (00:00:00)", () => {
    expect(calcDayFraction(0, 0, 0)).toBe(0);
  });

  it("should return 0.5 at noon (12:00:00)", () => {
    expect(calcDayFraction(12, 0, 0)).toBe(0.5);
  });

  it("should return a value strictly between 0 and 1 at 09:30 (morning)", () => {
    const result = calcDayFraction(9, 30, 0);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it("should return a value close to 1 but < 1 at 23:59:59", () => {
    const result = calcDayFraction(23, 59, 59);
    expect(result).toBeGreaterThan(0.99);
    expect(result).toBeLessThan(1);
  });

  it("should return a value slightly above 0 at 00:00:01", () => {
    const result = calcDayFraction(0, 0, 1);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.001);
  });

  it("should clamp to 0 for out-of-range negative hours", () => {
    expect(calcDayFraction(-1, 0, 0)).toBe(0);
  });

  it("should clamp to 1 for out-of-range hours > 24", () => {
    expect(calcDayFraction(25, 0, 0)).toBe(1);
  });

  it("should increase monotonically: midnight < morning < noon < evening", () => {
    const midnight = calcDayFraction(0, 0, 0);
    const morning  = calcDayFraction(8, 0, 0);
    const noon     = calcDayFraction(12, 0, 0);
    const evening  = calcDayFraction(20, 0, 0);
    expect(midnight).toBeLessThan(morning);
    expect(morning).toBeLessThan(noon);
    expect(noon).toBeLessThan(evening);
  });

  it("should correctly weight seconds: 00:00:30 is 30/86400 of the day", () => {
    const result = calcDayFraction(0, 0, 30);
    expect(result).toBeCloseTo(30 / 86400, 10);
  });
});

describe("formatHour — 24h mode", () => {
  it("should return '00' with period=null for hour 0 in 24h mode", () => {
    const { h, period } = formatHour(0, false);
    expect(h).toBe("00");
    expect(period).toBeNull();
  });

  it("should return '09' with period=null for hour 9 in 24h mode", () => {
    const { h, period } = formatHour(9, false);
    expect(h).toBe("09");
    expect(period).toBeNull();
  });

  it("should return '12' with period=null for noon (12) in 24h mode", () => {
    const { h, period } = formatHour(12, false);
    expect(h).toBe("12");
    expect(period).toBeNull();
  });

  it("should return '13' with period=null for 1 PM (13) in 24h mode", () => {
    const { h, period } = formatHour(13, false);
    expect(h).toBe("13");
    expect(period).toBeNull();
  });

  it("should return '23' with period=null for 11 PM (23) in 24h mode", () => {
    const { h, period } = formatHour(23, false);
    expect(h).toBe("23");
    expect(period).toBeNull();
  });
});

describe("formatHour — 12h mode", () => {
  it("should return '12' with period='AM' for midnight (0) in 12h mode", () => {
    const { h, period } = formatHour(0, true);
    expect(h).toBe("12");
    expect(period).toBe("AM");
  });

  it("should return '01' with period='AM' for 1 AM (1) in 12h mode", () => {
    const { h, period } = formatHour(1, true);
    expect(h).toBe("01");
    expect(period).toBe("AM");
  });

  it("should return '11' with period='AM' for 11 AM (11) in 12h mode", () => {
    const { h, period } = formatHour(11, true);
    expect(h).toBe("11");
    expect(period).toBe("AM");
  });

  it("should return '12' with period='PM' for noon (12) in 12h mode", () => {
    const { h, period } = formatHour(12, true);
    expect(h).toBe("12");
    expect(period).toBe("PM");
  });

  it("should return '01' with period='PM' for 1 PM (13) in 12h mode", () => {
    const { h, period } = formatHour(13, true);
    expect(h).toBe("01");
    expect(period).toBe("PM");
  });

  it("should return '11' with period='PM' for 11 PM (23) in 12h mode", () => {
    const { h, period } = formatHour(23, true);
    expect(h).toBe("11");
    expect(period).toBe("PM");
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    "should zero-pad hour %i to two digits in 12h mode",
    (hour) => {
      const { h } = formatHour(hour, true);
      expect(h).toHaveLength(2);
      expect(h.startsWith("0")).toBe(true);
    }
  );
});

describe("Clock breakdown bars", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  const fullScore = {
    score: 100,
    tier: "high" as const,
    breakdown: { habitsScore: 50, pomodoroScore: 30, intentionScore: 20 },
  };

  it("renders habits breakdown bar with correct title", () => {
    render(<Clock dailyScore={fullScore} />);
    expect(screen.getByTitle("습관 50/50")).toBeDefined();
  });

  it("renders pomodoro breakdown bar with correct title", () => {
    render(<Clock dailyScore={fullScore} />);
    expect(screen.getByTitle("집중 30/30")).toBeDefined();
  });

  it("renders intention breakdown bar with correct title", () => {
    render(<Clock dailyScore={fullScore} />);
    expect(screen.getByTitle("의도 20/20")).toBeDefined();
  });

  it("renders habits breakdown bar filled to 100% when all habits done", () => {
    render(<Clock dailyScore={fullScore} />);
    const bar = screen.getByTitle("습관 50/50").firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("renders habits breakdown bar filled to 50% when half habits done", () => {
    const halfScore = {
      score: 25,
      tier: "low" as const,
      breakdown: { habitsScore: 25, pomodoroScore: 0, intentionScore: 0 },
    };
    render(<Clock dailyScore={halfScore} />);
    const bar = screen.getByTitle("습관 25/50").firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("50%");
  });

  it("does not render breakdown bars when dailyScore is undefined", () => {
    render(<Clock />);
    expect(screen.queryByTitle(/습관/)).toBeNull();
  });
});
