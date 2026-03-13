// ABOUTME: ProjectList component - renders project list with add/delete/reorder in edit mode
// ABOUTME: onRefreshAll prop enables one-click batch GitHub refresh for all linked projects

import { useState, type CSSProperties } from "react";
import type { Project } from "../types";
import { fontSizes, colors, radius } from "../theme";
import { ProjectCard } from "./ProjectCard";
import { useEditMode } from "../hooks/useEditMode";

interface ProjectListProps {
  projects: Project[];
  onUpdate: (id: number, patch: Partial<Project>) => void;
  onProjectsChange: (projects: Project[]) => void;
  pat?: string;
  onRefreshAll?: () => Promise<void>;   // batch-refresh all projects with a GitHub repo set
}

export function ProjectList({ projects, onUpdate, onProjectsChange, pat, onRefreshAll }: ProjectListProps) {
  const [newName, setNewName] = useState("");
  const [refreshingAll, setRefreshingAll] = useState(false);
  // ESC also resets the new-project draft
  const { editing, openEditing, closeEditing } = useEditMode(() => setNewName(""));

  const handleRefreshAll = async () => {
    if (!onRefreshAll || refreshingAll) return;
    setRefreshingAll(true);
    try { await onRefreshAll(); } finally { setRefreshingAll(false); }
  };

  const moveProject = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= projects.length) return;
    const next = [...projects];
    [next[from], next[to]] = [next[to], next[from]];
    onProjectsChange(next);
  };

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

  const moveBtnStyle = (disabled: boolean): CSSProperties => ({
    background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
    color: disabled ? colors.textLabel : colors.textSubtle,
    fontSize: fontSizes.mini, padding: "1px 2px", lineHeight: 1,
  });

  if (editing) {
    return (
      <div style={{ borderLeft: `2px solid ${colors.borderAccent}`, paddingLeft: 12 }}>
        {projects.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Reorder buttons — vertically centered within the card */}
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <button onClick={() => moveProject(i, -1)} disabled={i === 0} title="위로 이동" style={moveBtnStyle(i === 0)}>↑</button>
              <button onClick={() => moveProject(i, 1)} disabled={i === projects.length - 1} title="아래로 이동" style={moveBtnStyle(i === projects.length - 1)}>↓</button>
            </div>
            <div style={{ flex: 1 }}>
              <ProjectCard
                project={p}
                onUpdate={patch => onUpdate(p.id, patch)}
                onDelete={() => onProjectsChange(projects.filter(x => x.id !== p.id))}
                pat={pat}
              />
            </div>
          </div>
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
        <ProjectCard key={p.id} project={p} onUpdate={patch => onUpdate(p.id, patch)} pat={pat} />
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginTop: 4 }}>
        {/* Refresh all: visible when PAT + at least one project has a GitHub repo */}
        {onRefreshAll && pat && projects.some(p => p.githubRepo) && (
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll}
            title="모든 GitHub 데이터 새로고침"
            style={{
              background: "transparent", border: "none",
              cursor: refreshingAll ? "default" : "pointer",
              color: refreshingAll ? colors.textLabel : colors.textPhantom,
              fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
              transition: "color 0.2s",
            }}
          >
            ↺
          </button>
        )}
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
