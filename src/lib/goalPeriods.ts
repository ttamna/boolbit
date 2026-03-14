// ABOUTME: Pure helpers for goal period key generation — ISO week string and quarter string
// ABOUTME: Exported for unit testing; used by App.tsx to anchor goal expiry and date stamps

// Returns ISO week string "YYYY-Www" for the given date.
// ISO weeks start on Monday; week 1 contains the first Thursday of the year.
// The YYYY in the result may differ from date.getFullYear() near year boundaries
// (e.g. Dec 29–31 can be W01 of the next year; Jan 1–3 can be W52/W53 of the prior year).
export function isoWeekStr(date: Date): string {
  // Work in UTC to avoid DST distortions: move to Thursday of the ISO week
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Returns "YYYY-Q1"…"YYYY-Q4" quarter string for the given date.
export function quarterStr(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}
