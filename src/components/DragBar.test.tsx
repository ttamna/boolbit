// ABOUTME: Unit tests for DragBar — calcYearProgress pure helper and component interaction tests
// ABOUTME: Covers dayOfYear/daysRemaining/pct edge cases plus opacity ±5% clamping, theme cycle wrap, pin toggle, width presets, settings toggle, year bar tooltip

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calcYearProgress, DragBar } from "./DragBar";
import type { ThemeKey } from "../theme";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(),
  currentMonitor: vi.fn(),
  PhysicalPosition: vi.fn(),
}));

import { getCurrentWindow } from "@tauri-apps/api/window";

const mockGetCurrentWindow = getCurrentWindow as ReturnType<typeof vi.fn>;

describe("calcYearProgress — non-leap year (2025)", () => {
  it("should return dayOfYear=1, daysRemaining=364, pct=0 on Jan 1 at midnight", () => {
    const result = calcYearProgress(new Date(2025, 0, 1));
    expect(result.dayOfYear).toBe(1);
    expect(result.daysRemaining).toBe(364);
    expect(result.pct).toBe(0);
  });

  it("should return dayOfYear=2 on Jan 2 at midnight", () => {
    const result = calcYearProgress(new Date(2025, 0, 2));
    expect(result.dayOfYear).toBe(2);
    expect(result.daysRemaining).toBe(363);
  });

  it("should return dayOfYear=183, daysRemaining=182 on Jul 2 (day 183 of 365, first day past halfway)", () => {
    // Jan(31)+Feb(28)+Mar(31)+Apr(30)+May(31)+Jun(30)+Jul(2) = 183rd day
    const result = calcYearProgress(new Date(2025, 6, 2));
    expect(result.dayOfYear).toBe(183);
    expect(result.daysRemaining).toBe(182);
  });

  it("should return dayOfYear=365, daysRemaining=0 on Dec 31 at midnight", () => {
    const result = calcYearProgress(new Date(2025, 11, 31));
    expect(result.dayOfYear).toBe(365);
    expect(result.daysRemaining).toBe(0);
  });

  it("should satisfy the invariant: dayOfYear + daysRemaining = 365", () => {
    const dates = [
      new Date(2025, 0, 1),   // Jan 1
      new Date(2025, 2, 15),  // Mar 15
      new Date(2025, 6, 2),   // Jul 2
      new Date(2025, 11, 31), // Dec 31
    ];
    for (const d of dates) {
      const { dayOfYear, daysRemaining } = calcYearProgress(d);
      expect(dayOfYear + daysRemaining).toBe(365);
    }
  });
});

describe("calcYearProgress — leap year (2024)", () => {
  it("should return dayOfYear=1, daysRemaining=365 on Jan 1 of a leap year", () => {
    const result = calcYearProgress(new Date(2024, 0, 1));
    expect(result.dayOfYear).toBe(1);
    expect(result.daysRemaining).toBe(365);
  });

  it("should return dayOfYear=60, daysRemaining=306 on Feb 29 (leap day)", () => {
    // Jan(31) + Feb 1-28 = 59 days elapsed; Feb 29 is the 60th day
    const result = calcYearProgress(new Date(2024, 1, 29));
    expect(result.dayOfYear).toBe(60);
    expect(result.daysRemaining).toBe(306);
  });

  it("should return dayOfYear=366, daysRemaining=0 on Dec 31 of a leap year", () => {
    const result = calcYearProgress(new Date(2024, 11, 31));
    expect(result.dayOfYear).toBe(366);
    expect(result.daysRemaining).toBe(0);
  });

  it("should satisfy the invariant: dayOfYear + daysRemaining = 366 in a leap year", () => {
    const dates = [
      new Date(2024, 0, 1),   // Jan 1
      new Date(2024, 1, 29),  // Feb 29 (leap day)
      new Date(2024, 6, 2),   // Jul 2
      new Date(2024, 11, 31), // Dec 31
    ];
    for (const d of dates) {
      const { dayOfYear, daysRemaining } = calcYearProgress(d);
      expect(dayOfYear + daysRemaining).toBe(366);
    }
  });
});

describe("calcYearProgress — Gregorian leap-year rules", () => {
  it("should treat 2000 as a leap year (divisible by 400) and return dayOfYear=366 on Dec 31", () => {
    // Gregorian rule: divisible by 400 → always leap regardless of the 100-year exception
    const result = calcYearProgress(new Date(2000, 11, 31));
    expect(result.dayOfYear).toBe(366);
    expect(result.daysRemaining).toBe(0);
  });

  it("should treat 2100 as a non-leap year (divisible by 100 but not 400) and return dayOfYear=365 on Dec 31", () => {
    // 2100 % 4 === 0 but 2100 % 100 === 0 and 2100 % 400 !== 0 → non-leap (100-year exception)
    const result = calcYearProgress(new Date(2100, 11, 31));
    expect(result.dayOfYear).toBe(365);
    expect(result.daysRemaining).toBe(0);
  });

  it("should return dayOfYear=365, daysRemaining=0 at Dec 31 23:59:59 (last second of the year)", () => {
    // pct is very close to 1 but < 1; floor(pct * 365) = 364, +1 = 365 — consistent with midnight
    const result = calcYearProgress(new Date(2025, 11, 31, 23, 59, 59));
    expect(result.dayOfYear).toBe(365);
    expect(result.daysRemaining).toBe(0);
  });
});

describe("calcYearProgress — pct accuracy", () => {
  it("should return pct=0 exactly at Jan 1 midnight", () => {
    expect(calcYearProgress(new Date(2025, 0, 1)).pct).toBe(0);
  });

  it("should return pct strictly between 0 and 1 at mid-year", () => {
    const { pct } = calcYearProgress(new Date(2025, 6, 2));
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(1);
  });

  it("should return pct > 0.99 but < 1 at Dec 31 midnight (nearly complete)", () => {
    const { pct } = calcYearProgress(new Date(2025, 11, 31));
    expect(pct).toBeGreaterThan(0.99);
    expect(pct).toBeLessThan(1);
  });

  it("should increase monotonically: Jan 1 < Jul 2 < Dec 31", () => {
    const jan1  = calcYearProgress(new Date(2025, 0, 1)).pct;
    const jul2  = calcYearProgress(new Date(2025, 6, 2)).pct;
    const dec31 = calcYearProgress(new Date(2025, 11, 31)).pct;
    expect(jan1).toBeLessThan(jul2);
    expect(jul2).toBeLessThan(dec31);
  });

  it("should return pct > 0 at noon on Jan 1 (sub-day millisecond accuracy)", () => {
    // Noon on Jan 1 = 12 * 3600 * 1000 ms into the year; pct must be > 0
    const { pct } = calcYearProgress(new Date(2025, 0, 1, 12, 0, 0));
    expect(pct).toBeGreaterThan(0);
  });
});

// ─── Component interaction tests ───────────────────────────────────────────────

const defaultProps = {
  hovered: true,
  onSettingsChange: vi.fn(),
  settingsOpen: false,
  onToggleSettings: vi.fn(),
  currentTheme: "void" as ThemeKey,
};

// Clear all mock state after every test — prevents call-count bleed across tests
afterEach(() => vi.clearAllMocks());

describe("DragBar — rendering", () => {
  it("should render VISION label", () => {
    render(<DragBar {...defaultProps} />);
    screen.getByText("VISION");
  });

  it("should render year progress bar with day-of-year tooltip", () => {
    render(<DragBar {...defaultProps} />);
    screen.getByTitle(/Day \d+ · \d+일 남음 · \d+%/);
  });
});

describe("DragBar — settings toggle button", () => {
  it("should call onToggleSettings when settings button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleSettings = vi.fn();
    render(<DragBar {...defaultProps} onToggleSettings={onToggleSettings} />);
    await user.click(screen.getByTitle("설정"));
    expect(onToggleSettings).toHaveBeenCalledTimes(1);
  });
});

describe("DragBar — theme cycle", () => {
  it("should cycle theme from void to nebula on theme button click", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} currentTheme="void" onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("테마: Void (클릭하여 전환)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ theme: "nebula" });
  });

  it("should cycle theme from rose to solarized on theme button click", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} currentTheme="rose" onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("테마: Rose (클릭하여 전환)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ theme: "solarized" });
  });

  it("should cycle theme from solarized to solarized-light on theme button click", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} currentTheme="solarized" onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("테마: Solarized (클릭하여 전환)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ theme: "solarized-light" });
  });

  it("should wrap theme cycle from solarized-light back to void", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} currentTheme="solarized-light" onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("테마: Solarized Light (클릭하여 전환)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ theme: "void" });
  });
});

describe("DragBar — opacity buttons", () => {
  it("should decrement opacity by 0.05 when minus button is clicked", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} opacity={0.75} onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("투명도 -5% (현재 75%)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ opacity: 0.7 });
  });

  it("should increment opacity by 0.05 when plus button is clicked", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} opacity={0.75} onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("투명도 +5% (현재 75%)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ opacity: 0.8 });
  });

  it("should clamp opacity at 0.20 minimum when minus is clicked at 0.20", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} opacity={0.20} onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("투명도 -5% (현재 20%)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ opacity: 0.2 });
  });

  it("should clamp opacity at 1.0 maximum when plus is clicked at 1.0", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} opacity={1.0} onSettingsChange={onSettingsChange} />);
    await user.click(screen.getByTitle("투명도 +5% (현재 100%)"));
    expect(onSettingsChange).toHaveBeenCalledWith({ opacity: 1.0 });
  });
});

describe("DragBar — width preset buttons", () => {
  it("should disable narrow button when widgetWidth is at minimum 300", () => {
    render(<DragBar {...defaultProps} widgetWidth={300} onWidthChange={vi.fn()} />);
    const narrowBtn = screen.getByRole("button", { name: "◂" }) as HTMLButtonElement;
    expect(narrowBtn.disabled).toBe(true);
  });

  it("should disable wide button when widgetWidth is at maximum 460", () => {
    render(<DragBar {...defaultProps} widgetWidth={460} onWidthChange={vi.fn()} />);
    const wideBtn = screen.getByRole("button", { name: "▸" }) as HTMLButtonElement;
    expect(wideBtn.disabled).toBe(true);
  });

  it("should call onWidthChange with 300 when narrow button clicked at 380", async () => {
    const user = userEvent.setup();
    const onWidthChange = vi.fn();
    render(<DragBar {...defaultProps} widgetWidth={380} onWidthChange={onWidthChange} />);
    await user.click(screen.getByTitle("너비 300px로 변경"));
    expect(onWidthChange).toHaveBeenCalledWith(300);
  });

  it("should call onWidthChange with 460 when wide button clicked at 380", async () => {
    const user = userEvent.setup();
    const onWidthChange = vi.fn();
    render(<DragBar {...defaultProps} widgetWidth={380} onWidthChange={onWidthChange} />);
    await user.click(screen.getByTitle("너비 460px로 변경"));
    expect(onWidthChange).toHaveBeenCalledWith(460);
  });
});

describe("DragBar — pin toggle", () => {
  let mockSetAlwaysOnTop: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetAlwaysOnTop = vi.fn().mockResolvedValue(undefined);
    mockGetCurrentWindow.mockReturnValue({ setAlwaysOnTop: mockSetAlwaysOnTop });
  });

  it("should call setAlwaysOnTop(true) and onSettingsChange({pinned:true}) when pin button clicked while unpinned", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} pinned={false} onSettingsChange={onSettingsChange} />);
    await act(async () => { await user.click(screen.getByTitle("항상 위 꺼짐 — 클릭하여 켜기")); });
    expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(true);
    expect(onSettingsChange).toHaveBeenCalledWith({ pinned: true });
  });

  it("should call setAlwaysOnTop(false) and onSettingsChange({pinned:false}) when pin button clicked while pinned", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} pinned={true} onSettingsChange={onSettingsChange} />);
    await act(async () => { await user.click(screen.getByTitle("항상 위 켜짐 — 클릭하여 끄기")); });
    expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(false);
    expect(onSettingsChange).toHaveBeenCalledWith({ pinned: false });
  });

  it("should NOT call onSettingsChange when setAlwaysOnTop throws", async () => {
    mockSetAlwaysOnTop = vi.fn().mockRejectedValue(new Error("denied"));
    mockGetCurrentWindow.mockReturnValue({ setAlwaysOnTop: mockSetAlwaysOnTop });
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(<DragBar {...defaultProps} pinned={false} onSettingsChange={onSettingsChange} />);
    await act(async () => { await user.click(screen.getByTitle("항상 위 꺼짐 — 클릭하여 켜기")); });
    expect(onSettingsChange).not.toHaveBeenCalled();
  });
});
