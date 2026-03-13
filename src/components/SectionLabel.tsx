// ABOUTME: SectionLabel component - uppercase category divider between widget sections
// ABOUTME: Supports optional collapse/expand toggle via chevron when onToggle is provided

import { fontSizes, colors } from "../theme";

interface SectionLabelProps {
  children: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SectionLabel({ children, collapsed = false, onToggle }: SectionLabelProps) {
  return (
    <div
      onClick={onToggle}
      style={{
        fontSize: fontSizes.label, fontWeight: 600, color: colors.textGhost,
        textTransform: "uppercase", letterSpacing: 3, marginBottom: collapsed ? 0 : 10, marginTop: 20,
        display: "flex", alignItems: "center", gap: 6,
        cursor: onToggle ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {children}
      {onToggle && (
        <span style={{
          fontSize: fontSizes.mini, opacity: 0.6,
          transition: "transform 0.2s",
          display: "inline-block",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>
          ▾
        </span>
      )}
    </div>
  );
}
