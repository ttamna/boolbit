// ABOUTME: SectionLabel component - uppercase category divider between widget sections
// ABOUTME: Supports optional collapse/expand toggle via chevron and optional ↑↓ reorder buttons

import { useState } from "react";
import { fontSizes, colors } from "../theme";

interface SectionLabelProps {
  children: string;
  collapsed?: boolean;
  onToggle?: () => void;
  accent?: string;
  badge?: string; // optional summary shown after label, e.g. "3/4"
  onMoveUp?: () => void;   // reorder: move this section one step earlier
  onMoveDown?: () => void; // reorder: move this section one step later
}

export function SectionLabel({ children, collapsed = false, onToggle, accent, badge, onMoveUp, onMoveDown }: SectionLabelProps) {
  const [hovered, setHovered] = useState(false);
  const showMoveButtons = hovered && (onMoveUp || onMoveDown);
  const moveBtnStyle = (enabled: boolean) => ({
    background: "transparent", border: "none",
    cursor: enabled ? "pointer" : "default",
    color: enabled ? (accent ? `${accent}88` : colors.textSubtle) : colors.textLabel,
    fontSize: fontSizes.mini, padding: "0 1px", lineHeight: 1,
    opacity: enabled ? 1 : 0.3,
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggle}
      style={{
        fontSize: fontSizes.xs, fontWeight: 700,
        color: accent ? `${accent}cc` : colors.textDim,
        textTransform: "uppercase", letterSpacing: 3, marginBottom: collapsed ? 0 : 10, marginTop: 20,
        display: "flex", alignItems: "center", gap: 6,
        cursor: onToggle ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {children}
      {badge && (
        <span style={{
          fontSize: fontSizes.mini, fontWeight: 400,
          color: accent ? `${accent}66` : colors.textPhantom,
          letterSpacing: 0, textTransform: "none",
        }}>
          {badge}
        </span>
      )}
      {onToggle && (
        <span style={{
          fontSize: fontSizes.mini,
          color: accent ? `${accent}66` : undefined,
          opacity: accent ? 1 : 0.6,
          transition: "transform 0.2s",
          display: "inline-block",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>
          ▾
        </span>
      )}
      {/* Reorder buttons: hover-only, push to right edge to avoid overlap with collapse chevron */}
      {(onMoveUp || onMoveDown) && (
        <div
          style={{
            marginLeft: "auto", display: "flex", gap: 1,
            opacity: showMoveButtons ? 1 : 0,
            transition: "opacity 0.2s",
          }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onMoveUp} disabled={!onMoveUp} title="섹션 위로 이동" style={moveBtnStyle(!!onMoveUp)}>↑</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} title="섹션 아래로 이동" style={moveBtnStyle(!!onMoveDown)}>↓</button>
        </div>
      )}
    </div>
  );
}
