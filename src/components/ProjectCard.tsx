// ABOUTME: ProjectCard component - displays a single project with progress bar and metrics
// ABOUTME: Status color-codes the indicator dot (active=green, in-progress=yellow, paused=red)

import { CSSProperties } from "react";
import type { Project } from "../types";
import { fonts, fontSizes, colors, radius } from "../theme";

const mono: CSSProperties = { fontFamily: fonts.mono };

const STATUS_COLORS: Record<string, string> = {
  active: colors.statusActive,
  "in-progress": colors.statusProgress,
  paused: colors.statusPaused,
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 3, background: colors.borderSubtle, borderRadius: radius.bar, overflow: "hidden", marginTop: 6 }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        borderRadius: radius.bar, transition: "width 1s ease",
      }} />
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const color = STATUS_COLORS[project.status] || colors.statusActive;

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${colors.borderFaint}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}66` }} />
          <span style={{ fontSize: fontSizes.lg, fontWeight: 600, color: colors.textHigh, letterSpacing: 0.3 }}>{project.name}</span>
        </div>
        <span style={{ ...mono, fontSize: fontSizes.xs, color: colors.textDim }}>{project.progress}%</span>
      </div>
      <div style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 4, paddingLeft: 14 }}>{project.goal}</div>
      <div style={{ paddingLeft: 14 }}>
        <ProgressBar value={project.progress} color={color} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 14, marginTop: 6 }}>
        <span style={{ fontSize: fontSizes.xs, color: colors.textSubtle }}>{project.metric}</span>
        <span style={{ ...mono, fontSize: fontSizes.xs, color: colors.textMid }}>
          {project.metric_value} <span style={{ color: colors.textGhost }}>/</span> {project.metric_target}
        </span>
      </div>
    </div>
  );
}
