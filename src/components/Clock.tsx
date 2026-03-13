// ABOUTME: Clock component - displays current time and date with 12h/24h format support
// ABOUTME: Updates every second via setInterval

import { useState, useEffect } from "react";
import { fonts, fontSizes, colors } from "../theme";

const mono = { fontFamily: fonts.mono };

interface ClockProps {
  use12h?: boolean;
}

export function Clock({ use12h = false }: ClockProps) {
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

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...mono, fontSize: fontSizes.clock, fontWeight: 200, letterSpacing: 6, color: colors.textPrimary, lineHeight: 1 }}>
        {h}<span style={{ opacity: 0.4 }}>:</span>{m}
        {period && (
          <span style={{ opacity: 0.5, fontSize: fontSizes.xs, marginLeft: 6, letterSpacing: 1 }}>{period}</span>
        )}
        <span style={{ opacity: 0.2, fontSize: fontSizes.clockSec, marginLeft: 4 }}>{sec}</span>
      </div>
      <div style={{ fontSize: fontSizes.base, color: colors.textFaint, marginTop: 6, fontWeight: 300, letterSpacing: 1 }}>
        {dateStr}
      </div>
    </div>
  );
}
