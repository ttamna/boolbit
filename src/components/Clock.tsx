// ABOUTME: Clock component - displays current time and date with 12h/24h format support
// ABOUTME: Updates every second via setInterval; onToggleFormat prop enables inline format toggle on the date row

import { useState, useEffect } from "react";
import { fonts, fontSizes, colors, radius } from "../theme";

const mono = { fontFamily: fonts.mono };

interface ClockProps {
  use12h?: boolean;
  accent?: string;
  onToggleFormat?: () => void;
}

export function Clock({ use12h = false, accent, onToggleFormat }: ClockProps) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rawHour = time.getHours();
  const h = use12h
    ? ((rawHour % 12) || 12).toString().padStart(2, "0")
    : rawHour.toString().padStart(2, "0");
  const period = use12h ? (rawHour >= 12 ? "PM" : "AM") : null;
  const m = time.getMinutes().toString().padStart(2, "0");
  const sec = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // Day progress: seconds elapsed since midnight / 86400 total seconds.
  // Clamped to [0,1] to guard against DST transitions (23h or 25h days).
  const dayFraction = Math.min(1, Math.max(0,
    (rawHour * 3600 + time.getMinutes() * 60 + time.getSeconds()) / 86400
  ));
  const dayPct = Math.round(dayFraction * 100);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...mono, fontSize: fontSizes.clock, fontWeight: 200, letterSpacing: 6, color: colors.textPrimary, lineHeight: 1 }}>
        {h}<span style={{ opacity: 0.4 }}>:</span>{m}
        {period && (
          <span style={{ opacity: 0.5, fontSize: fontSizes.xs, marginLeft: 6, letterSpacing: 1 }}>{period}</span>
        )}
        <span style={{ opacity: 0.2, fontSize: fontSizes.clockSec, marginLeft: 4 }}>{sec}</span>
      </div>
      {/* Date row: date string + optional inline format toggle (shows current format; click to switch) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ fontSize: fontSizes.base, color: colors.textFaint, fontWeight: 300, letterSpacing: 1 }}>
          {dateStr}
        </div>
        {onToggleFormat && (
          <button
            onClick={onToggleFormat}
            title={use12h ? "12시간 → 24시간 형식으로 전환" : "24시간 → 12시간 형식으로 전환"}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: colors.textPhantom, fontSize: fontSizes.mini,
              fontFamily: fonts.mono, padding: "0 2px", lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {use12h ? "24h" : "12h"}
          </button>
        )}
      </div>
      {/* Day progress bar — shows how much of today has elapsed */}
      <div
        title={`하루의 ${dayPct}% 경과`}
        style={{ marginTop: 8, height: 2, borderRadius: radius.bar, background: colors.borderSubtle, overflow: "hidden" }}
      >
        <div style={{
          height: "100%",
          width: `${dayFraction * 100}%`,
          background: accent ?? colors.textSubtle,
          borderRadius: radius.bar,
          transition: "width 1s linear",
        }} />
      </div>
    </div>
  );
}
