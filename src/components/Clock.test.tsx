// ABOUTME: Unit tests for calcDayFraction, formatHour, and Clock component — momentumStreak badge rendering
// ABOUTME: Validates day progress fraction (out-of-range clamp), 24h/12h hour formatting, edge cases, and streak badge visibility rules

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { calcDayFraction, formatHour, Clock } from "./Clock";

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

describe("Clock — momentumStreak badge", () => {
  it("should not render streak badge when momentumStreak is absent", () => {
    render(<Clock />);
    expect(screen.queryByText(/🔥/)).toBeNull();
  });

  it("should not render streak badge when momentumStreak is 1", () => {
    render(<Clock momentumStreak={1} />);
    expect(screen.queryByText(/🔥/)).toBeNull();
  });

  it("should render streak badge '🔥2d' when momentumStreak is 2", () => {
    render(<Clock momentumStreak={2} />);
    expect(screen.getByText("🔥2d")).toBeDefined();
  });

  it("should render streak badge '🔥7d' when momentumStreak is 7", () => {
    render(<Clock momentumStreak={7} />);
    expect(screen.getByText("🔥7d")).toBeDefined();
  });

  it("should render correct tooltip text for the streak badge", () => {
    render(<Clock momentumStreak={5} />);
    const badge = document.querySelector("[title='5일 연속 모멘텀 40점 이상']");
    expect(badge).not.toBeNull();
  });
});
