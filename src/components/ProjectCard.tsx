// ABOUTME: ProjectCard component - displays a single project with progress bar and metrics
// ABOUTME: Supports inline editing of metric_value and progress via InlineEdit

import { CSSProperties } from "react";
import type { Project } from "../types";
import { fonts, fontSizes, colors, radius } from "../theme";
import { InlineEdit } from "./InlineEdit";

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

interface ProjectCardProps {
  project: Project;
  onUpdate?: (patch: Partial<Project>) => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const color = STATUS_COLORS[project.status] || colors.statusActive;

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${colors.borderFaint}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}66` }} />
          <InlineEdit
            value={project.name}
            onSave={name => onUpdate?.({ name })}
            style={{ fontSize: fontSizes.lg, fontWeight: 600, color: colors.textHigh, letterSpacing: 0.3 }}
          />
        </div>
        <InlineEdit
          value={String(project.progress)}
          onSave={v => {
            const n = parseInt(v);
            if (!isNaN(n)) onUpdate?.({ progress: Math.min(100, Math.max(0, n)) });
          }}
          style={{ ...mono, fontSize: fontSizes.xs, color: colors.textDim }}
          inputStyle={{ ...mono, fontSize: fontSizes.xs, width: 40, textAlign: "right" }}
        />
      </div>
      <div style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 4, paddingLeft: 14 }}>
        <InlineEdit
          value={project.goal}
          onSave={goal => onUpdate?.({ goal })}
          style={{ color: colors.textMuted }}
        />
      </div>
      <div style={{ paddingLeft: 14 }}>
        <ProgressBar value={project.progress} color={color} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 14, marginTop: 6 }}>
        <span style={{ fontSize: fontSizes.xs, color: colors.textSubtle }}>{project.metric}</span>
        <span style={{ ...mono, fontSize: fontSizes.xs, color: colors.textMid }}>
          <InlineEdit
            value={project.metric_value}
            onSave={metric_value => onUpdate?.({ metric_value })}
            style={{ color: colors.textMid }}
          />
          {" "}<span style={{ color: colors.textGhost }}>/</span>{" "}
          <InlineEdit
            value={project.metric_target}
            onSave={metric_target => onUpdate?.({ metric_target })}
            style={{ color: colors.textMid }}
          />
        </span>
      </div>
    </div>
  );
}
