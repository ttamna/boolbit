// ABOUTME: HabitStreak component - displays habit grid with streak counts and icons
// ABOUTME: Click ✓ to check/uncheck today; amber ✓ = streak at risk (checked yesterday, not today); edit mode: add/delete/reorder/targetStreak/bestStreak; 14-day dot heatmap

import { useState, useEffect, useMemo, CSSProperties } from "react";
import type { Habit } from "../types";
import { fonts, fontSizes, colors } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { useEditMode } from "../hooks/useEditMode";

const mono: CSSProperties = { fontFamily: fonts.mono };

// Reorder button style — disabled state uses textLabel, enabled uses textSubtle
const moveBtnStyle = (disabled: boolean): CSSProperties => ({
  background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
  color: disabled ? colors.textLabel : colors.textSubtle,
  fontSize: fontSizes.mini, padding: "1px 2px", lineHeight: 1,
});

const getToday = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD local date

// Returns milestone badge emoji for notable streak lengths; null otherwise
function getMilestone(streak: number): string | null {
  if (streak >= 100) return "💎";
  if (streak >= 30)  return "⭐";
  if (streak >= 7)   return "🔥";
  return null;
}

// Returns next unreached milestone if within threshold days away; null otherwise.
// Note: a non-null result can coexist with a non-null getMilestone result (e.g. streak=27
// has milestone 🔥 and upcoming ⭐ in 3 days). Callers must decide which to display.
function getUpcomingMilestone(streak: number, threshold = 3): { days: number; badge: string } | null {
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

interface HabitStreakProps {
  habits: Habit[];
  onUpdate?: (i: number, patch: Partial<Habit>) => void;
  onHabitsChange?: (habits: Habit[]) => void;
  accent?: string;
}

export function HabitStreak({ habits, onUpdate, onHabitsChange, accent }: HabitStreakProps) {
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
    }
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

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
        {habits.map((h, i) => {
          const doneToday = h.lastChecked === todayStr;
          // atRisk: streak > 0, last checked yesterday, not yet today — will reset at midnight
          const atRisk = !doneToday && h.streak > 0 && h.lastChecked === yesterdayStr;
          const milestone = getMilestone(h.streak);
          const upcoming = getUpcomingMilestone(h.streak);
          const history = h.checkHistory ?? [];
          // targetPct: progress toward targetStreak goal, clamped to 100%; undefined when no goal or streak is 0
          const targetPct = (h.targetStreak ?? 0) > 0 && h.streak > 0
            ? Math.min(100, Math.round(h.streak / h.targetStreak! * 100))
            : undefined;
          // checkedCount14: number of the last 14 days that were checked; last14Days is always length 14
          const checkedCount14 = last14Days.filter(day => history.includes(day)).length;
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
                  {/* Personal best: shown only when current streak is below the all-time high */}
                  {(h.bestStreak ?? 0) > h.streak && (
                    <span
                      title={`최장 기록 ${h.bestStreak}일`}
                      style={{ fontSize: fontSizes.mini, color: colors.textPhantom, opacity: 0.55 }}
                    >
                      ↑{h.bestStreak}
                    </span>
                  )}
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
                        }}
                      />
                    );
                  })}
                  {/* 14-day completion count: compact N/14 summary so user doesn't have to count dots */}
                  <span
                    title={`최근 14일 중 ${checkedCount14}일 체크`}
                    style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom, marginLeft: 3, opacity: 0.7 }}
                  >
                    {checkedCount14}/14
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
      {onHabitsChange && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
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
      )}
    </div>
  );
}
