// ABOUTME: Pure helpers for computing period total-day counts from a local Date
// ABOUTME: Used by App.tsx direction-section goal rows to compute period elapsed fractions

/** Total days in the calendar month containing `date` (local time). */
export function totalDaysInMonth(date: Date): number {
  // Day 0 of next month = last day of current month; getDate() returns its day number = days in month.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Total days in the calendar quarter (Q1–Q4) containing `date` (local time). */
export function totalDaysInQuarter(date: Date): number {
  const qtr = Math.ceil((date.getMonth() + 1) / 3); // 1–4
  const qStartMonth = (qtr - 1) * 3; // 0-indexed month of the quarter's first month
  const y = date.getFullYear();
  // Sum the 3 months using totalDaysInMonth (getDate() trick) — DST-immune, consistent with totalDaysInMonth.
  return (
    totalDaysInMonth(new Date(y, qStartMonth, 1)) +
    totalDaysInMonth(new Date(y, qStartMonth + 1, 1)) +
    totalDaysInMonth(new Date(y, qStartMonth + 2, 1))
  );
}

/** Total days in the calendar year containing `date` (local time). 365 or 366. */
export function totalDaysInYear(date: Date): number {
  // Feb 29 in non-leap years wraps to Mar 1 (getMonth() === 2); in leap years it stays in Feb (getMonth() === 1).
  // Idiomatic JS leap-year check — DST-immune (no timestamp arithmetic).
  return new Date(date.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365;
}

/**
 * Fraction of a period elapsed, given `daysLeft` remaining (including today) and `totalDays`.
 * Returns a value clamped to [0, 1].
 * On the first day: daysLeft === totalDays → 0.
 * On the last day:  daysLeft === 1 → (totalDays - 1) / totalDays.
 */
export function periodElapsedFraction(daysLeft: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  return Math.max(0, Math.min(1, (totalDays - daysLeft) / totalDays));
}
