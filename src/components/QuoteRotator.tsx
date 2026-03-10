// ABOUTME: QuoteRotator component - cycles through motivational quotes with fade transition
// ABOUTME: Rotates every 8 seconds with 600ms fade out/in animation

import { useState, useEffect } from "react";
import { fontSizes, colors } from "../theme";

export function QuoteRotator({ quotes }: { quotes: string[] }) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => { setIdx(prev => (prev + 1) % quotes.length); setOpacity(1); }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  return (
    <div style={{
      fontSize: fontSizes.sm, color: colors.textDim, fontStyle: "italic", lineHeight: 1.6,
      minHeight: 36, display: "flex", alignItems: "center",
      opacity, transition: "opacity 0.6s ease",
      borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12,
    }}>
      {quotes[idx]}
    </div>
  );
}
