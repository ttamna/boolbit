// ABOUTME: ProjectList component - renders project list with add/delete/reorder in edit mode
// ABOUTME: onRefreshAll enables batch GitHub refresh; paused+done projects are collapsible; ↕ auto-sort by focus+urgency in view mode; sessionsToday/sessionGoal forwarded to ★ focus ProjectCard; completion bar shows done/total ratio

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
  sessionsToday?: number;               // today's pomodoro focus sessions; forwarded to ★ focus card
  sessionGoal?: number;                 // daily session goal; forwarded to ★ focus card
}

export function ProjectList({ projects, onUpdate, onProjectsChange, pat, onRefreshAll, sessionsToday, sessionGoal }: ProjectListProps) {
  const [newName, setNewName] = useState("");
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // ESC also resets the new-project draft
  const { editing, openEditing, closeEditing } = useEditMode(() => setNewName(""));

  // Sort non-done projects: ★ focus first → deadline urgency (soonest first, no deadline last).
  // Done projects are excluded from sorting and kept at the end of the array unchanged.
  // Paused projects sort alongside active/in-progress — view-level filters handle visual grouping.
  // Uses stable sort so equal-priority items stay in their current manual order.
  const handleSort = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const todayMidnight = d.getTime();
    const urgency = (p: Project): number => {
      if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return Infinity;
      return Math.floor((new Date(p.deadline + "T00:00:00").getTime() - todayMidnight) / 86400000);
    };
    const active = projects.filter(p => p.status !== "done");
    const done = projects.filter(p => p.status === "done");
    const sortedActive = [...active].sort((a, b) => {
      const aFocus = a.isFocus ? 0 : 1;
      const bFocus = b.isFocus ? 0 : 1;
      if (aFocus !== bFocus) return aFocus - bFocus;
      return urgency(a) - urgency(b);
    });
    onProjectsChange([...sortedActive, ...done]);
  };

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
      createdDate: new Date().toLocaleDateString("sv"),
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
                sessionsToday={sessionsToday}
                sessionGoal={sessionGoal}
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

  const runningProjects = projects.filter(p => p.status !== "done" && p.status !== "paused");
  const pausedProjects = projects.filter(p => p.status === "paused");
  const doneProjects = projects.filter(p => p.status === "done");
  // pct: completion percentage — single source used in both tooltip and bar width
  const pct = projects.length > 0 ? Math.round(doneProjects.length / projects.length * 100) : 0;

  return (
    <div>
      {runningProjects.map(p => (
        <ProjectCard key={p.id} project={p} onUpdate={patch => onUpdate(p.id, patch)} pat={pat} sessionsToday={sessionsToday} sessionGoal={sessionGoal} />
      ))}
      {/* Paused projects: collapsed by default, expand via toggle */}
      {pausedProjects.length > 0 && (
        <button
          onClick={() => setShowPaused(v => !v)}
          title={showPaused ? "일시정지 프로젝트 접기" : "일시정지 프로젝트 펼치기"}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: colors.textPhantom, fontSize: fontSizes.mini,
            padding: "4px 0", lineHeight: 1, display: "block",
          }}
        >
          일시정지 ({pausedProjects.length}) {showPaused ? "▾" : "▸"}
        </button>
      )}
      {showPaused && pausedProjects.map(p => (
        <ProjectCard key={p.id} project={p} onUpdate={patch => onUpdate(p.id, patch)} pat={pat} sessionsToday={sessionsToday} sessionGoal={sessionGoal} />
      ))}
      {/* Done projects: collapsed by default, expand via toggle */}
      {doneProjects.length > 0 && (
        <button
          onClick={() => setShowDone(v => !v)}
          title={showDone ? "완료 프로젝트 접기" : "완료 프로젝트 펼치기"}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: colors.textPhantom, fontSize: fontSizes.mini,
            padding: "4px 0", lineHeight: 1, display: "block",
          }}
        >
          완료 ({doneProjects.length}) {showDone ? "▾" : "▸"}
        </button>
      )}
      {showDone && doneProjects.map(p => (
        <ProjectCard key={p.id} project={p} onUpdate={patch => onUpdate(p.id, patch)} pat={pat} sessionsToday={sessionsToday} sessionGoal={sessionGoal} />
      ))}
      <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
        {/* Left: completion stats — visible when at least one project is done; shows done/total mini bar + fraction */}
        {doneProjects.length > 0 && (
          <div
            title={`완료 ${doneProjects.length}개 / 전체 ${projects.length}개 (${pct}%)`}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <div style={{ width: 32, height: 2, background: colors.borderSubtle, borderRadius: 1, flexShrink: 0 }}>
              <div style={{
                width: `${pct}%`,
                height: "100%",
                background: colors.statusDone,
                borderRadius: 1,
                opacity: 0.6,
              }} />
            </div>
            <span style={{ fontSize: fontSizes.mini, color: colors.textPhantom }}>
              {doneProjects.length}/{projects.length}
            </span>
          </div>
        )}
        {/* Right: action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          {/* Sort: visible when there are 2+ non-done projects (running + paused) to sort */}
          {(runningProjects.length + pausedProjects.length) >= 2 && (
            <button
              onClick={handleSort}
              title="★ 집중 우선 → 마감일 긴박도순 정렬"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textPhantom, fontSize: fontSizes.mini,
                padding: "0 2px", lineHeight: 1,
              }}
            >
              ↕
            </button>
          )}
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
    </div>
  );
}
