// ABOUTME: SectionLabel component - uppercase category divider between widget sections
// ABOUTME: Used for Projects, Streaks, Direction section headers

import { fontSizes, colors } from "../theme";

export function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: fontSizes.label, fontWeight: 600, color: colors.textGhost,
      textTransform: "uppercase", letterSpacing: 3, marginBottom: 10, marginTop: 20,
    }}>
      {children}
    </div>
  );
}
