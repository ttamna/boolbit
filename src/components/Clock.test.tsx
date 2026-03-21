// ABOUTME: Unit tests for calcDayFraction, formatHour, and Clock component — momentumStreak badge, breakdown bar, weekAvg badge, and momentum trend arrow rendering
// ABOUTME: Validates day progress fraction (out-of-range clamp), 24h/12h hour formatting, streak badge visibility, H/P/I breakdown bar presence, 7-day average badge, and 3-day trend direction arrow (↑/↓/→)

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

describe("Clock — breakdown bars", () => {
  const breakdown = { habits: 25, pomodoro: 10, intention: 8 };

  it("renders H label when dailyScore has breakdown", () => {
    render(<Clock dailyScore={{ score: 43, tier: "mid", breakdown }} />);
    expect(screen.getByText("H")).toBeDefined();
  });

  it("renders P label when dailyScore has breakdown", () => {
    render(<Clock dailyScore={{ score: 43, tier: "mid", breakdown }} />);
    expect(screen.getByText("P")).toBeDefined();
  });

  it("renders I label when dailyScore has breakdown", () => {
    render(<Clock dailyScore={{ score: 43, tier: "mid", breakdown }} />);
    expect(screen.getByText("I")).toBeDefined();
  });

  it("does not render H/P/I labels when dailyScore is absent", () => {
    render(<Clock />);
    expect(screen.queryByText("H")).toBeNull();
    expect(screen.queryByText("P")).toBeNull();
    expect(screen.queryByText("I")).toBeNull();
  });

  it("shows tooltip describing breakdown on the container", () => {
    render(<Clock dailyScore={{ score: 43, tier: "mid", breakdown }} />);
    const el = document.querySelector("[title='모멘텀 세부: 습관 25/50 · 집중 10/30 · 의도 8/20']");
    expect(el).not.toBeNull();
  });
});

// weekAvg badge requires sparkline to be shown (momentumHistory ≥ 2 entries)
const sparklineHistory = [
  { date: "2026-03-09", score: 60, tier: "mid" as const },
  { date: "2026-03-10", score: 80, tier: "high" as const },
];

describe("Clock — weekAvg badge", () => {
  it("should not render weekAvg badge when weekAvg is absent", () => {
    render(<Clock momentumHistory={sparklineHistory} />);
    expect(document.querySelector("[title*='평균']")).toBeNull();
  });

  it("should render '7d·70' badge when weekAvg is 70 and sparkline is shown", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={70} />);
    expect(screen.getByText("7d·70")).toBeDefined();
  });

  // weekAvg=0 is intentionally shown (not hidden) — suppressing 0 would be deceptive
  // since it signals a genuinely poor week, not missing data.
  it("should render '7d·0' badge when weekAvg is 0", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={0} />);
    expect(screen.getByText("7d·0")).toBeDefined();
  });

  it("should render '7d·100' badge when weekAvg is 100", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={100} />);
    expect(screen.getByText("7d·100")).toBeDefined();
  });

  it("should show tooltip with weekAvg score on the badge", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={63} />);
    const badge = document.querySelector("[title='최근 7일 모멘텀 평균 63/100']");
    expect(badge).not.toBeNull();
  });

  it("should not render weekAvg badge when sparkline is hidden (history < 2 entries)", () => {
    render(<Clock momentumHistory={[sparklineHistory[0]]} weekAvg={60} />);
    expect(screen.queryByText("7d·60")).toBeNull();
  });
});

describe("Clock — momentum trend arrow", () => {
  it("should not render trend arrow when trend is absent", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={65} />);
    expect(screen.queryByText("↑")).toBeNull();
    expect(screen.queryByText("↓")).toBeNull();
    expect(screen.queryByText("→")).toBeNull();
  });

  it("should render '↑' when trend is rising", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={65} trend="rising" />);
    expect(screen.getByText("↑")).toBeDefined();
  });

  it("should render '↓' when trend is declining", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={42} trend="declining" />);
    expect(screen.getByText("↓")).toBeDefined();
  });

  it("should render '→' when trend is stable", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={50} trend="stable" />);
    expect(screen.getByText("→")).toBeDefined();
  });

  it("should not render trend arrow when sparkline is hidden (history < 2)", () => {
    render(<Clock momentumHistory={[sparklineHistory[0]]} weekAvg={50} trend="rising" />);
    expect(screen.queryByText("↑")).toBeNull();
  });

  it("should not render trend arrow when weekAvg is absent (trend depends on weekAvg badge)", () => {
    render(<Clock momentumHistory={sparklineHistory} trend="rising" />);
    expect(screen.queryByText("↑")).toBeNull();
  });

  it("should include trend direction in weekAvg tooltip", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={65} trend="rising" />);
    const badge = document.querySelector("[title*='상승']");
    expect(badge).not.toBeNull();
  });

  it("should show declining trend label in tooltip", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={42} trend="declining" />);
    const badge = document.querySelector("[title*='하락']");
    expect(badge).not.toBeNull();
  });

  it("should show stable trend label in tooltip", () => {
    render(<Clock momentumHistory={sparklineHistory} weekAvg={50} trend="stable" />);
    const badge = document.querySelector("[title*='유지']");
    expect(badge).not.toBeNull();
  });
});
