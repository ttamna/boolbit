// ABOUTME: WeekComparisonCard — cross-domain week-over-week performance comparison card
// ABOUTME: Pure rendering component; receives WeekComparisonResult, shows per-domain deltas with trend arrows

import type { CSSProperties } from "react";
import type { WeekComparisonResult, DomainComparison, Trend } from "../lib/weekComparison";
import { fonts, fontSizes, colors } from "../theme";

// Unicode minus sign — exported so tests build assertion strings from the same source
export const MINUS = "\u2212";

export interface WeekComparisonCardProps {
  comparison: WeekComparisonResult | null;
  accent?: string;
}

// Domain metadata: key, Korean labels, and value/delta formatters
interface DomainMeta {
  key: "habits" | "pomodoro" | "intention" | "momentum";
  label: string;
  fullLabel: string;
  formatValue: (v: number) => string;
  formatDelta: (d: number) => string;
}

const DOMAINS: DomainMeta[] = [
  {
    key: "habits",
    label: "습관",
    fullLabel: "습관",
    formatValue: (v) => `${v}%`,
    formatDelta: (d) => d > 0 ? `+${d}` : d < 0 ? `${MINUS}${Math.abs(d)}` : "=",
  },
  {
    key: "pomodoro",
    label: "포모",
    fullLabel: "포모도로",
    formatValue: (v) => `${v}세션`,
    formatDelta: (d) => d > 0 ? `+${d}` : d < 0 ? `${MINUS}${Math.abs(d)}` : "=",
  },
  {
    key: "intention",
    label: "의도",
    fullLabel: "의도",
    formatValue: (v) => `${v}%`,
    formatDelta: (d) => d > 0 ? `+${d}` : d < 0 ? `${MINUS}${Math.abs(d)}` : "=",
  },
  {
    key: "momentum",
    label: "모멘텀",
    fullLabel: "모멘텀",
    formatValue: (v) => `${v}점`,
    formatDelta: (d) => d > 0 ? `+${d}` : d < 0 ? `${MINUS}${Math.abs(d)}` : "=",
  },
];

// Trend → display color
function trendColor(trend: Trend, accent?: string): string {
  if (trend === "up") return accent ?? colors.statusActive;
  if (trend === "down") return colors.statusPaused;
  return colors.textDim;
}

// Build tooltip string for a domain row
function buildTooltip(meta: DomainMeta, cmp: DomainComparison): string {
  const deltaStr = cmp.delta > 0
    ? `(+${cmp.delta})`
    : cmp.delta < 0
    ? `(${MINUS}${Math.abs(cmp.delta)})`
    : "(=)";
  return `${meta.fullLabel}: 이번 주 ${meta.formatValue(cmp.thisWeek)} → 지난 주 ${meta.formatValue(cmp.lastWeek)} ${deltaStr}`;
}

const s = {
  container: {
    padding: "4px 0 6px",
  } as CSSProperties,
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    marginBottom: 4,
    textAlign: "center",
  } as CSSProperties,
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "0 4px",
  } as CSSProperties,
  row: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "default",
  } as CSSProperties,
  domainLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    minWidth: 34,
    flexShrink: 0,
  } as CSSProperties,
  thisWeek: (color: string) => ({
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color,
    fontWeight: 600,
    minWidth: 32,
  } as CSSProperties),
  delta: (color: string) => ({
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color,
    minWidth: 24,
    textAlign: "right" as const,
  } as CSSProperties),
  lastWeek: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    flexShrink: 0,
  } as CSSProperties,
  summary: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 4,
  } as CSSProperties,
};

export function WeekComparisonCard({ comparison, accent }: WeekComparisonCardProps) {
  if (!comparison) return null;

  // Only render when at least one domain has data
  const activeDomains = DOMAINS.filter(d => comparison[d.key] !== null);
  if (activeDomains.length === 0) return null;

  return (
    <div style={s.container}>
      <div style={s.label}>주간 비교</div>
      <div style={s.rows}>
        {activeDomains.map(meta => {
          const cmp = comparison[meta.key]!;
          const color = trendColor(cmp.trend, accent);
          return (
            <div
              key={meta.key}
              style={s.row}
              title={buildTooltip(meta, cmp)}
            >
              <span style={s.domainLabel}>{meta.label}</span>
              <span style={s.thisWeek(color)}>{meta.formatValue(cmp.thisWeek)}</span>
              <span style={s.delta(color)}>{meta.formatDelta(cmp.delta)}</span>
              <span style={s.lastWeek}>{meta.formatValue(cmp.lastWeek)}</span>
            </div>
          );
        })}
      </div>
      {comparison.summary && (
        <div style={s.summary} data-testid="week-comparison-summary">{comparison.summary}</div>
      )}
    </div>
  );
}
