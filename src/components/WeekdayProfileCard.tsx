// ABOUTME: WeekdayProfileCard — cross-domain weekday productivity profile heatmap with mini bar chart
// ABOUTME: Pure rendering component; receives WeekdayProfile from calcWeekdayProfile, returns null when null or all-null composites

import type { CSSProperties } from "react";
import type { WeekdayProfile } from "../lib/weekProfile";
import { fonts, fontSizes, colors } from "../theme";

export interface WeekdayProfileCardProps {
  profile: WeekdayProfile | null;
  accent?: string;
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// Maximum bar height in pixels for the tallest composite score
const BAR_MAX_HEIGHT = 24;

// Score → color using status tokens
function scoreColor(score: number, isBest: boolean, accent?: string): string {
  if (isBest) return accent ?? colors.statusActive;
  if (score >= 70) return colors.statusActive;
  if (score >= 50) return colors.statusProgress;
  if (score >= 35) return colors.statusWarning;
  return colors.statusPaused;
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
  strip: {
    display: "flex",
    gap: 2,
    justifyContent: "center",
    alignItems: "flex-end",
  } as CSSProperties,
  daySlot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    padding: "2px 4px",
    borderRadius: 3,
    background: colors.surfaceFaint,
    minWidth: 28,
    cursor: "default",
  } as CSSProperties,
  weekday: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    lineHeight: 1,
  } as CSSProperties,
  bar: (height: number, color: string) => ({
    width: 10,
    height,
    borderRadius: 2,
    background: color,
    transition: "height 0.2s",
  } as CSSProperties),
  score: (color: string) => ({
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color,
    lineHeight: 1,
    fontWeight: 600,
  } as CSSProperties),
  noData: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textPhantom,
    lineHeight: 1,
  } as CSSProperties,
  summary: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.mini,
    color: colors.textDim,
    textAlign: "center",
    marginTop: 4,
  } as CSSProperties,
};

function buildTitle(weekday: number, composite: number | null, isBest: boolean, isWorst: boolean): string {
  const name = WEEKDAY_NAMES[weekday];
  if (composite === null) return `${name}: 데이터 없음`;
  // When bestDay === worstDay (single data day), show best only — "(최고)" takes priority
  const suffix = isBest ? " (최고)" : isWorst ? " (최저)" : "";
  return `${name} ${composite}점${suffix}`;
}

export function WeekdayProfileCard({ profile, accent }: WeekdayProfileCardProps) {
  if (!profile) return null;

  // Skip rendering when every weekday has null composite (no data at all)
  const hasAnyData = Object.values(profile.days).some(slot => slot.composite !== null);
  if (!hasAnyData) return null;

  // Find max composite for bar height scaling
  const maxComposite = Math.max(
    ...Object.values(profile.days).map(slot => slot.composite ?? 0),
    1, // floor to avoid division by zero
  );

  return (
    <div style={s.container}>
      <div style={s.label}>요일 프로필</div>
      <div style={s.strip}>
        {Array.from({ length: 7 }, (_, dow) => {
          const slot = profile.days[dow];
          const composite = slot?.composite ?? null;
          const isBest = profile.bestDay === dow;
          const isWorst = profile.worstDay === dow;
          const title = buildTitle(dow, composite, isBest, isWorst);

          return (
            <div
              key={dow}
              style={s.daySlot}
              title={title}
              data-weekday={dow}
            >
              <span style={s.weekday}>{WEEKDAY_NAMES[dow]}</span>
              {composite !== null ? (
                <>
                  <div
                    style={s.bar(
                      Math.max(2, Math.round((composite / maxComposite) * BAR_MAX_HEIGHT)),
                      scoreColor(composite, isBest, accent),
                    )}
                  />
                  <span
                    data-score
                    style={s.score(scoreColor(composite, isBest, accent))}
                  >
                    {composite}
                  </span>
                </>
              ) : (
                <span style={s.noData}>–</span>
              )}
            </div>
          );
        })}
      </div>
      {(profile.bestDay !== null || profile.worstDay !== null) && (
        <div style={s.summary}>
          {profile.bestDay !== null && `최고 ${WEEKDAY_NAMES[profile.bestDay]}`}
          {profile.bestDay !== null && profile.worstDay !== null && profile.bestDay !== profile.worstDay && " · "}
          {profile.worstDay !== null && profile.bestDay !== profile.worstDay && `최저 ${WEEKDAY_NAMES[profile.worstDay]}`}
        </div>
      )}
    </div>
  );
}
