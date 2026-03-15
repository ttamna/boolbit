// ABOUTME: HabitStreak component - displays habit grid with streak counts and icons
// ABOUTME: Click ✓ to check/uncheck today; ✓ 전체 batch check-in; amber ✓ = streak at risk; ⊖Nd = neglected N days; ★ = at personal best (streak=bestStreak≥7); edit mode: add/delete/reorder/targetStreak/bestStreak; 14-day dots split prev-7/cur-7 with N/7↑↓ weekly trend; today completion bar shows N/M progress; getMilestone/getUpcomingMilestone exported as pure helpers

import { useState, useEffect, useMemo, useRef, CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { useEditMode } from "../hooks/useEditMode";
import { calcHabitWeekStats } from "../lib/habits";

const mono: CSSProperties = { fontFamily: fonts.mono };

// Reorder button style — disabled state uses textLabel, enabled uses textSubtle
const moveBtnStyle = (disabled: boolean): CSSProperties => ({
  background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
  color: disabled ? colors.textLabel : colors.textSubtle,
  fontSize: fontSizes.mini, padding: "1px 2px", lineHeight: 1,
});

const getToday = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date

// Returns milestone badge emoji for notable streak lengths; null otherwise.
// Exported for unit testing; thresholds: 7🔥 / 30⭐ / 100💎.
export function getMilestone(streak: number): string | null {
  if (streak >= 100) return "💎";
  if (streak >= 30)  return "⭐";
  if (streak >= 7)   return "🔥";
  return null;
}

// Returns next unreached milestone if within threshold days away; null otherwise.
// Note: a non-null result can coexist with a non-null getMilestone result (e.g. streak=27
// has milestone 🔥 and upcoming ⭐ in 3 days). Callers must decide which to display.
// Exported for unit testing; default threshold=3.
export function getUpcomingMilestone(streak: number, threshold = 3): { days: number; badge: string } | null {
  if (streak <= 0) return null;
  const MILESTONES = [
    { at: 7, badge: "🔥" },
    { at: 30, badge: "⭐" },
    { at: 100, badge: "💎" },
  ];
  for (const { at, badge } of MILESTONES) {
    const days = at - streak;
    if (days > 0 && days <= threshold) return { days, badge };
  }
  return null;
}

// Returns percentage of habits completed today, clamped to [0, 100].
// Returns null when habits array is empty (guard against division by zero).
// Exported for unit testing; pure function with no side effects.
export function habitsTodayPct(habits: Habit[], todayStr: string): number | null {
  if (habits.length === 0) return null;
  const done = habits.filter(h => h.lastChecked === todayStr).length;
  return Math.min(100, Math.round(done / habits.length * 100));
}

// Returns days since the most recent check-in based on checkHistory (sorted ascending).
// Returns null when: no history, last check was today (0 days), or last check was yesterday (1 day — atRisk already handles this case).
// Returns N (≥2) when the habit has been neglected for N days, giving a quick "⊖Nd" indicator.
// Exported for unit testing; mirrors the pattern of ProjectCard's lastFocusDaysAgo helper.
export function habitLastCheckDaysAgo(checkHistory: string[] | undefined, today: string): number | null {
  if (!checkHistory || checkHistory.length === 0) return null;
  // checkHistory is sorted ascending (YYYY-MM-DD lexicographic = chronological); last entry is most recent
  const lastCheck = checkHistory[checkHistory.length - 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastCheck)) return null;
  const lastTs = new Date(lastCheck + "T00:00:00").getTime();
  if (isNaN(lastTs)) return null;
  const todayTs = new Date(today + "T00:00:00").getTime();
  if (isNaN(todayTs)) return null;
  const days = Math.floor((todayTs - lastTs) / 86400000);
  // Suppress for today (0) and yesterday (1) — yesterday is already shown as atRisk amber ✓
  // Future lastCheck dates (negative days) also return null safely via the days >= 2 check
  return days >= 2 ? days : null;
}

interface HabitStreakProps {
  habits: Habit[];
  onUpdate?: (i: number, patch: Partial<Habit>) => void;
  onHabitsChange?: (habits: Habit[]) => void;
  accent?: string;
  onMilestoneReached?: (habitName: string, streak: number, badge: string) => void;
}

export function HabitStreak({ habits, onUpdate, onHabitsChange, accent, onMilestoneReached }: HabitStreakProps) {
  const [newIcon, setNewIcon] = useState("⭐");
  const [newName, setNewName] = useState("");
  const { editing, openEditing, closeEditing } = useEditMode();
  // Refresh todayStr every minute so the ✓ button state updates correctly around midnight
  const [todayStr, setTodayStr] = useState(getToday);
  useEffect(() => {
    const id = setInterval(() => setTodayStr(getToday()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Last 14 days as YYYY-MM-DD strings (oldest → newest), derived from todayStr to stay consistent.
  // Using todayStr as base (not new Date()) prevents a 1-min mismatch right after midnight
  // when todayStr is still yesterday but new Date() has already advanced to the new day.
  const last14Days = useMemo(() => {
    const base = new Date(todayStr + "T00:00:00"); // local midnight of todayStr
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString("sv");
    });
  }, [todayStr]);

  // Tracks milestone badges already notified today per habit — prevents re-fires on undo+redo.
  // Key: habitId (stable) or index string; value: Set of badge strings fired today.
  // Cleared at midnight when todayStr advances so each day starts fresh.
  const milestoneNotifiedRef = useRef<Map<string, Set<string>>>(new Map());
  useEffect(() => { milestoneNotifiedRef.current.clear(); }, [todayStr]);

  // Yesterday as YYYY-MM-DD — same todayStr base as last14Days to stay consistent around midnight.
  // Explicit derivation avoids fragile dependency on last14Days array length or index.
  const yesterdayStr = useMemo(() => {
    const d = new Date(todayStr + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("sv");
  }, [todayStr]);

  const addHabit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onHabitsChange?.([...habits, { id: crypto.randomUUID(), name: trimmed, streak: 0, icon: newIcon || "⭐" }]);
    setNewName("");
    setNewIcon("⭐");
  };

  const patchHabit = (i: number, patch: Partial<Habit>) =>
    onHabitsChange?.(habits.map((h, j) => j === i ? { ...h, ...patch } : h));

  const moveHabit = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= habits.length) return;
    const next = [...habits];
    [next[from], next[to]] = [next[to], next[from]];
    onHabitsChange?.(next);
  };

  const checkHabit = (i: number) => {
    const h = habits[i];
    const history = h.checkHistory ?? [];
    if (h.lastChecked === todayStr) {
      // Undo today's check-in: decrement streak, clear lastChecked, remove today from history.
      // Use undefined (not []) so JSON.stringify omits the field — Rust serde(default) yields None.
      // bestStreak is not decremented on undo — it records the all-time high.
      const filtered = history.filter(d => d !== todayStr);
      onUpdate?.(i, {
        streak: Math.max(0, h.streak - 1),
        lastChecked: undefined,
        checkHistory: filtered.length > 0 ? filtered : undefined,
      });
    } else {
      // Check in: add today, deduplicate, sort (YYYY-MM-DD is lexicographic = chronological),
      // cap at 14 most-recent days to prevent unbounded growth.
      const newHistory = [...new Set([...history, todayStr])].sort().slice(-14);
      const newStreak = h.streak + 1;
      const prevBest = h.bestStreak ?? 0;
      // Note: streak is incremented unconditionally (pre-existing design — no consecutive-day check).
      // bestStreak inherits this assumption and tracks the max value seen via check-in.
      const patch: Partial<Habit> = {
        streak: newStreak, lastChecked: todayStr, checkHistory: newHistory,
      };
      // Only update bestStreak when the new streak surpasses the previous best
      if (newStreak > prevBest) patch.bestStreak = newStreak;
      onUpdate?.(i, patch);
      // Fire milestone notification when the check-in crosses a new milestone boundary.
      // Guard: only fire when onUpdate is defined (streak is actually being saved).
      // Dedup: milestoneNotifiedRef prevents re-fires on undo+redo within the same day.
      if (onUpdate) {
        const newBadge = getMilestone(newStreak);
        if (newBadge && newBadge !== getMilestone(h.streak)) {
          const key = h.id ?? String(i);
          const notified = milestoneNotifiedRef.current.get(key) ?? new Set<string>();
          if (!notified.has(newBadge)) {
            notified.add(newBadge);
            milestoneNotifiedRef.current.set(key, notified);
            onMilestoneReached?.(h.name, newStreak, newBadge);
          }
        }
      }
    }
  };

  // Sort habits by streak descending (highest streak first) in a single onHabitsChange call.
  const handleSort = () => {
    onHabitsChange?.([...habits].sort((a, b) => b.streak - a.streak));
  };

  // Batch check-in: marks all unchecked habits done today in a single onHabitsChange call.
  // Uses onHabitsChange (not per-habit onUpdate) to avoid parallel persist race conditions.
  const checkAll = () => {
    if (!onHabitsChange) return;
    const uncheckedCount = habits.filter(h => h.lastChecked !== todayStr).length;
    if (uncheckedCount === 0) return;
    const updatedHabits = habits.map(h => {
      if (h.lastChecked === todayStr) return h;
      const history = h.checkHistory ?? [];
      const newHistory = [...new Set([...history, todayStr])].sort().slice(-14);
      const newStreak = h.streak + 1;
      const prevBest = h.bestStreak ?? 0;
      const patch: Partial<Habit> = { streak: newStreak, lastChecked: todayStr, checkHistory: newHistory };
      if (newStreak > prevBest) patch.bestStreak = newStreak;
      return { ...h, ...patch };
    });
    onHabitsChange(updatedHabits);
    // Fire milestone notifications for habits that crossed a new milestone boundary.
    // Uses (h, idx) for the key to match checkHabit's `h.id ?? String(idx)` pattern exactly.
    habits.forEach((h, idx) => {
      if (h.lastChecked === todayStr) return;
      const newStreak = h.streak + 1;
      const newBadge = getMilestone(newStreak);
      if (newBadge && newBadge !== getMilestone(h.streak)) {
        const key = h.id ?? String(idx);
        const notified = milestoneNotifiedRef.current.get(key) ?? new Set<string>();
        if (!notified.has(newBadge)) {
          notified.add(newBadge);
          milestoneNotifiedRef.current.set(key, notified);
          onMilestoneReached?.(h.name, newStreak, newBadge);
        }
      }
    });
  };

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {habits.map((h, i) => {
          const milestone = getMilestone(h.streak);
          const upcoming = getUpcomingMilestone(h.streak);
          return (
          <div key={h.id ?? `h-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, paddingTop: 1 }}>
              <button onClick={() => moveHabit(i, -1)} disabled={i === 0} title="위로 이동" style={moveBtnStyle(i === 0)}>↑</button>
              <button onClick={() => moveHabit(i, 1)} disabled={i === habits.length - 1} title="아래로 이동" style={moveBtnStyle(i === habits.length - 1)}>↓</button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <InlineEdit
                value={h.icon}
                onSave={icon => patchHabit(i, { icon })}
                style={{ fontSize: fontSizes.lg }}
                inputStyle={{ fontSize: fontSizes.lg, width: 36, textAlign: "center" }}
              />
              <span style={{ flex: 1, minWidth: 0, fontSize: fontSizes.sm, color: colors.textLow }}>
                <InlineEdit
                  value={h.name}
                  onSave={name => patchHabit(i, { name })}
                  style={{ color: colors.textLow }}
                />
              </span>
              <span style={{ ...mono, display: "flex", alignItems: "baseline", gap: 2 }}>
                <InlineEdit
                  value={String(h.streak)}
                  onSave={v => {
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 0) {
                      const patch: Partial<Habit> = { streak: n };
                      if (n > (h.bestStreak ?? 0)) patch.bestStreak = n;
                      patchHabit(i, patch);
                    }
                  }}
                  style={{
                    fontSize: fontSizes.base, fontWeight: 700,
                    color: h.streak >= 10 ? (accent ?? colors.statusActive) : h.streak >= 5 ? colors.statusProgress : colors.textMid,
                  }}
                  inputStyle={{ ...mono, fontSize: fontSizes.base, width: 36, textAlign: "right" }}
                />
                {/* targetStreak: "+목표" button to set (default 30d); "/N ✕" when set.
                    InlineEdit does not call onSave for empty input, so clearing uses ✕ button —
                    same contract as lastChecked: undefined (JSON.stringify omits undefined, Rust gets None). */}
                {(h.targetStreak ?? 0) > 0 ? (
                  <>
                    <span style={{ fontSize: fontSizes.mini, color: colors.textPhantom }}>/</span>
                    <InlineEdit
                      value={String(h.targetStreak)}
                      onSave={v => {
                        const n = parseInt(v, 10);
                        if (!isNaN(n) && n > 0) patchHabit(i, { targetStreak: n });
                      }}
                      style={{ fontSize: fontSizes.mini, color: colors.textPhantom }}
                      inputStyle={{ ...mono, fontSize: fontSizes.mini, width: 28, textAlign: "right" }}
                    />
                    <button
                      onClick={() => patchHabit(i, { targetStreak: undefined })}
                      title="목표 해제"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 1px", lineHeight: 1 }}
                    >✕</button>
                  </>
                ) : (
                  <button
                    onClick={() => patchHabit(i, { targetStreak: 30 })}
                    title="목표 스트릭 설정 (30일로 시작)"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1, opacity: 0.5 }}
                  >+목표</button>
                )}
                {/* bestStreak: editable personal best; ✕ clears; auto-set by checkHabit */}
                {(h.bestStreak ?? 0) > 0 ? (
                  <>
                    <span style={{ fontSize: fontSizes.mini, color: colors.textPhantom, opacity: 0.6 }}>↑</span>
                    <InlineEdit
                      value={String(h.bestStreak)}
                      onSave={v => {
                        const n = parseInt(v, 10);
                        // bestStreak must be ≥ current streak to stay semantically valid
                        if (!isNaN(n) && n > 0 && n >= h.streak) patchHabit(i, { bestStreak: n });
                      }}
                      style={{ fontSize: fontSizes.mini, color: colors.textPhantom, opacity: 0.6 }}
                      inputStyle={{ ...mono, fontSize: fontSizes.mini, width: 28, textAlign: "right" }}
                    />
                    <button
                      onClick={() => patchHabit(i, { bestStreak: undefined })}
                      title="최장 기록 초기화"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 1px", lineHeight: 1, opacity: 0.6 }}
                    >✕</button>
                  </>
                ) : null}
                <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost }}>일</span>
              </span>
              {milestone ? (
                <span
                  title={h.streak >= 100 ? "💎 100일 달성!" : h.streak >= 30 ? "⭐ 30일 달성!" : "🔥 7일 달성!"}
                  style={{ fontSize: fontSizes.mini, lineHeight: 1 }}
                >
                  {milestone}
                </span>
              ) : upcoming ? (
                <span
                  title={`${upcoming.days}일 더 하면 ${upcoming.badge} 달성!`}
                  style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom }}
                >
                  +{upcoming.days}{upcoming.badge}
                </span>
              ) : null}
              <button
                onClick={() => onHabitsChange?.(habits.filter((_, j) => j !== i))}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: colors.textSubtle, fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            {/* Motivation note — inline editable; ✕ clears when set */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingLeft: 26 }}>
              <InlineEdit
                value={h.notes ?? ""}
                placeholder="+ 이유"
                onSave={v => patchHabit(i, { notes: v || undefined })} // empty string clears notes
                style={{ fontSize: fontSizes.mini, color: h.notes ? colors.textSubtle : colors.textPhantom, flex: 1 }}
                inputStyle={{ fontSize: fontSizes.mini }}
                multiline
              />
              {h.notes && (
                <button
                  onClick={() => patchHabit(i, { notes: undefined })}
                  title="메모 삭제"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                >✕</button>
              )}
            </div>
            </div>
          </div>
          );
        })}

        {/* Add new habit */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <input
            value={newIcon}
            onChange={e => setNewIcon(e.target.value)}
            placeholder="⭐"
            style={{
              width: 36,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 4, color: colors.textDim,
              fontSize: fontSizes.lg, outline: "none",
              padding: "2px 4px", textAlign: "center",
            }}
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
            placeholder="새 습관 추가..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 4, color: colors.textDim,
              fontSize: fontSizes.sm, outline: "none",
              padding: "2px 6px",
            }}
          />
          <button
            onClick={addHabit}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: colors.textMid, fontSize: fontSizes.base, padding: "0 2px", lineHeight: 1,
            }}
          >
            +
          </button>
        </div>

        {/* Done */}
        <button
          onClick={closeEditing}
          style={{
            marginTop: 8, background: "transparent",
            border: `1px solid ${colors.borderFaint}`,
            borderRadius: 4, cursor: "pointer",
            color: colors.textSubtle, fontSize: fontSizes.xs, padding: "2px 8px",
          }}
        >
          완료
        </button>
      </div>
    );
  }

  // Pre-compute today completion bar values once — avoids IIFE + non-null assertion in JSX.
  // todayDoneCount and todayBarPct are derived from the same todayStr used in the habit grid.
  const todayDoneCount = habits.filter(h => h.lastChecked === todayStr).length;
  const todayBarPct = habitsTodayPct(habits, todayStr); // null when habits is empty

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
        {habits.map((h, i) => {
          const doneToday = h.lastChecked === todayStr;
          // atRisk: streak > 0, last checked yesterday, not yet today — will reset at midnight
          const atRisk = !doneToday && h.streak > 0 && h.lastChecked === yesterdayStr;
          // neglectedDays: ⊖Nd badge for habits with streak=0 that have an unfulfilled check history.
          // Limiting to streak===0 avoids confusion with active streaks (atRisk/doneToday already
          // handle those states). Note: streak can be 0 via midnight reset (lastChecked=undefined)
          // or via manual InlineEdit — either way, checkHistory is preserved and may show neglect.
          const neglectedDays = h.streak === 0 && !doneToday && !atRisk
            ? habitLastCheckDaysAgo(h.checkHistory, todayStr)
            : null;
          const milestone = getMilestone(h.streak);
          const upcoming = getUpcomingMilestone(h.streak);
          const history = h.checkHistory ?? [];
          // targetPct: progress toward targetStreak goal, clamped to 100%; undefined when no goal or streak is 0
          const targetPct = (h.targetStreak ?? 0) > 0 && h.streak > 0
            ? Math.min(100, Math.round(h.streak / h.targetStreak! * 100))
            : undefined;
          // Weekly stats: cur7/prev7 count + trend derived from last14Days partition (see calcHabitWeekStats).
          const { cur7: checkedCount7, prev7: prevWeekCount7, trend: weekTrend } = calcHabitWeekStats(h.checkHistory, last14Days);
          return (
            <div key={h.id ?? `h-${i}`} style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <InlineEdit
                  value={h.icon}
                  onSave={icon => onUpdate?.(i, { icon })}
                  style={{ fontSize: fontSizes.lg }}
                  inputStyle={{ fontSize: fontSizes.lg, width: 36, textAlign: "center" }}
                />
                <span style={{ fontSize: fontSizes.sm, color: colors.textLow, flex: 1, minWidth: 0 }}>
                  <InlineEdit
                    value={h.name}
                    onSave={name => onUpdate?.(i, { name })}
                    style={{ color: colors.textLow }}
                  />
                </span>
                <span style={{ ...mono, display: "flex", alignItems: "baseline", gap: 2 }}>
                  <InlineEdit
                    value={String(h.streak)}
                    onSave={v => {
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 0) {
                        const patch: Partial<Habit> = { streak: n };
                        if (n > (h.bestStreak ?? 0)) patch.bestStreak = n;
                        onUpdate?.(i, patch);
                      }
                    }}
                    style={{
                      fontSize: fontSizes.base, fontWeight: 700,
                      color: h.streak >= 10 ? (accent ?? colors.statusActive) : h.streak >= 5 ? colors.statusProgress : colors.textMid,
                    }}
                    inputStyle={{ ...mono, fontSize: fontSizes.base, width: 36, textAlign: "right" }}
                  />
                  {/* Show "/target" when a goal is set; lib.rs sanitizes 0→None so (??0)>0 is safe */}
                  {(h.targetStreak ?? 0) > 0 ? (
                    <span style={{ fontSize: fontSizes.mini, color: colors.textPhantom }}>/{h.targetStreak}</span>
                  ) : null}
                  <span style={{ fontSize: fontSizes.mini, fontWeight: 400, color: colors.textGhost }}>일</span>
                  {/* Personal best slot: ↑N when below all-time high; ★ when AT all-time high (≥7) */}
                  {(h.bestStreak ?? 0) > h.streak ? (
                    <span
                      title={`최장 기록 ${h.bestStreak}일`}
                      style={{ fontSize: fontSizes.mini, color: colors.textPhantom, opacity: 0.55 }}
                    >
                      ↑{h.bestStreak}
                    </span>
                  ) : h.streak >= 7 && h.bestStreak !== undefined && h.streak === h.bestStreak ? (
                    <span
                      title={`개인 최고 기록 ${h.bestStreak}일 달성 중!`}
                      style={{ fontSize: fontSizes.mini, color: accent ?? colors.statusActive, opacity: 0.55 }}
                    >
                      ★
                    </span>
                  ) : null}
                </span>
                {/* Neglected indicator: ⊖Nd when habit hasn't been checked for N≥2 days */}
                {neglectedDays !== null && (
                  <span
                    title={`마지막 체크인: ${neglectedDays}일 전`}
                    style={{ ...mono, fontSize: fontSizes.mini, color: colors.statusPaused, opacity: 0.6 }}
                  >
                    ⊖{neglectedDays}d
                  </span>
                )}
                {milestone ? (
                  <span
                    title={h.streak >= 100 ? "💎 100일 달성!" : h.streak >= 30 ? "⭐ 30일 달성!" : "🔥 7일 달성!"}
                    style={{ fontSize: fontSizes.mini, lineHeight: 1 }}
                  >
                    {milestone}
                  </span>
                ) : upcoming ? (
                  <span
                    title={`${upcoming.days}일 더 하면 ${upcoming.badge} 달성!`}
                    style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom }}
                  >
                    +{upcoming.days}{upcoming.badge}
                  </span>
                ) : null}
                {/* Daily check-in button — click to check, click again to undo.
                    atRisk amber: checked yesterday but not today → streak resets at midnight */}
                <button
                  onClick={() => checkHabit(i)}
                  title={
                    doneToday ? "오늘 완료됨 — 클릭하여 취소"
                    : atRisk ? "오늘 완료하지 않으면 자정에 스트릭 초기화"
                    : "오늘 완료 체크"
                  }
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: doneToday ? (accent ?? colors.statusActive) : atRisk ? colors.statusProgress : colors.textPhantom,
                    fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
                    transition: "color 0.2s",
                  }}
                >
                  ✓
                </button>
              </div>
              {/* Target streak progress bar — visualizes streak/targetStreak ratio when goal is set and streak > 0 */}
              {targetPct !== undefined && (
                <div
                  title={`${h.streak}/${h.targetStreak}일 — ${targetPct}%`}
                  style={{ paddingLeft: 26, paddingRight: 2, marginTop: 4 }}
                >
                  <div style={{ height: 2, background: colors.borderSubtle, borderRadius: 1 }}>
                    <div style={{
                      width: `${targetPct}%`,
                      height: "100%",
                      background: accent ?? colors.statusActive,
                      borderRadius: 1,
                      opacity: targetPct >= 100 ? 0.85 : 0.45,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              )}
              {/* 14-day check-in dot heatmap — visible once there is any check history */}
              {history.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 2, paddingLeft: 26, marginTop: 3 }}>
                  {last14Days.map((day, di) => {
                    const checked = history.includes(day);
                    const daysAgo = 13 - di;
                    const label = daysAgo === 0 ? "오늘" : daysAgo === 1 ? "어제" : `${daysAgo}일 전`;
                    return (
                      <div
                        key={day}
                        title={label}
                        style={{
                          width: 3, height: 3, borderRadius: "50%", flexShrink: 0,
                          background: checked ? (accent ?? colors.statusActive) : colors.borderSubtle,
                          opacity: checked ? 0.85 : 0.4,
                          // Extra left margin at di===7 creates a visual week boundary (prev-7 | cur-7)
                          marginLeft: di === 7 ? 5 : 0,
                        }}
                      />
                    );
                  })}
                  {/* Weekly completion count — N/7 with trend arrow; tooltip shows both weeks for context */}
                  <span
                    title={`최근 7일 ${checkedCount7}/7 · 이전 7일 ${prevWeekCount7}/7 · 14일 합계 ${checkedCount7 + prevWeekCount7}일`}
                    style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                  >
                    {checkedCount7}/7{weekTrend}
                  </span>
                </div>
              )}
              {/* Motivation note — inline editable; ✕ clears when set */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingLeft: 26, marginTop: 1 }}>
                <InlineEdit
                  value={h.notes ?? ""}
                  placeholder="+ 이유"
                  onSave={v => onUpdate?.(i, { notes: v || undefined })} // empty string clears notes
                  style={{ fontSize: fontSizes.mini, color: h.notes ? colors.textSubtle : colors.textPhantom, flex: 1 }}
                  inputStyle={{ fontSize: fontSizes.mini }}
                  multiline
                />
                {h.notes && (
                  <button
                    onClick={() => onUpdate?.(i, { notes: undefined })}
                    title="메모 삭제"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
                  >✕</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Today completion bar — ambient 2px strip showing what fraction of habits are done today.
          Consistent visual language with Clock (day bar), DragBar (year bar), Direction (period bars).
          Always shown when habits exist (even at 0%) to signal "habits need attention" at day start. */}
      {todayBarPct !== null && (
        <div
          title={`오늘 ${todayDoneCount}/${habits.length} 완료`}
          style={{ marginTop: 6, height: 2, background: colors.borderSubtle, borderRadius: 1, overflow: "hidden" }}
        >
          <div style={{
            width: `${todayBarPct}%`,
            height: "100%",
            background: accent ?? colors.statusActive,
            borderRadius: 1,
            opacity: todayBarPct >= 100 ? 0.85 : 0.45,
            transition: "width 0.4s ease",
          }} />
        </div>
      )}
      {onHabitsChange && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          {/* "✓ 전체" — only when ≥1 habit is unchecked today; hides when all done to avoid confusion */}
          {habits.some(h => h.lastChecked !== todayStr) ? (
            <button
              onClick={checkAll}
              title={`오늘 미완료 습관 전체 체크인 (${habits.filter(h => h.lastChecked !== todayStr).length}개)`}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textPhantom, fontSize: fontSizes.mini,
                padding: "0 2px", lineHeight: 1,
              }}
            >
              ✓ 전체
            </button>
          ) : <span />}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {habits.length >= 2 && (
              <button
                onClick={handleSort}
                title="스트릭 기준 내림차순 정렬"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: colors.textPhantom, fontSize: fontSizes.mini,
                  padding: "0 2px", lineHeight: 1,
                }}
              >
                ↕
              </button>
            )}
            <button
              onClick={openEditing}
              title="습관 추가/삭제"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textPhantom, fontSize: fontSizes.mini,
                padding: "0 2px", lineHeight: 1,
              }}
            >
              ✏
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
