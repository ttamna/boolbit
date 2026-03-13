// ABOUTME: ProjectList component - renders project list with add/delete in edit mode
// ABOUTME: Encapsulates editing state, mirrors HabitStreak/QuoteRotator CRUD pattern

import { useState } from "react";
import type { Project } from "../types";
import { fontSizes, colors, radius } from "../theme";
import { ProjectCard } from "./ProjectCard";
import { useEditMode } from "../hooks/useEditMode";

interface ProjectListProps {
  projects: Project[];
  onUpdate: (id: number, patch: Partial<Project>) => void;
  onProjectsChange: (projects: Project[]) => void;
}

export function ProjectList({ projects, onUpdate, onProjectsChange }: ProjectListProps) {
  const [newName, setNewName] = useState("");
  // ESC also resets the new-project draft
  const { editing, openEditing, closeEditing } = useEditMode(() => setNewName(""));

  const addProject = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const maxId = projects.reduce((m, p) => Math.max(m, p.id), 0);
    const newProject: Project = {
      id: maxId + 1,
      name: trimmed,
      status: "active",
      goal: "목표를 입력하세요",
      progress: 0,
      metric: "지표",
      metric_value: "0",
      metric_target: "100",
    };
    onProjectsChange([...projects, newProject]);
    setNewName("");
  };

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {projects.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            onUpdate={patch => onUpdate(p.id, patch)}
            onDelete={() => onProjectsChange(projects.filter(x => x.id !== p.id))}
          />
        ))}
        {/* Add new project */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addProject(); }}
            placeholder="새 프로젝트 추가..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radius.chip, color: colors.textDim,
              fontSize: fontSizes.sm, outline: "none",
              padding: "2px 6px",
            }}
          />
          <button
            onClick={addProject}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: colors.textMid, fontSize: fontSizes.base, padding: "0 2px", lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
        <button
          onClick={closeEditing}
          style={{
            marginTop: 4, background: "transparent",
            border: `1px solid ${colors.borderFaint}`,
            borderRadius: radius.chip, cursor: "pointer",
            color: colors.textSubtle, fontSize: fontSizes.xs, padding: "2px 8px",
          }}
        >
          완료
        </button>
      </div>
    );
  }

  return (
    <div>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} onUpdate={patch => onUpdate(p.id, patch)} />
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button
          onClick={openEditing}
          title="프로젝트 추가/삭제"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: colors.textPhantom, fontSize: fontSizes.mini,
            padding: "0 2px", lineHeight: 1,
          }}
        >
          ✏
        </button>
      </div>
    </div>
  );
}
