// ABOUTME: ProjectCard component - displays a single project with progress bar and metrics
// ABOUTME: Supports inline editing of all fields: name, goal, progress, metric, metric_value, metric_target, status, githubRepo

import { useState, CSSProperties } from "react";
import type { Project, GitHubData } from "../types";
import { fonts, fontSizes, colors, radius } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { verifyRepo } from "../lib/github";
import { openUrl } from "@tauri-apps/plugin-opener";

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CI_COLOR: Record<NonNullable<GitHubData["ciStatus"]>, string> = {
  success: "#4ade80",
  failure: "#f87171",
  pending: "#facc15",
};

const mono: CSSProperties = { fontFamily: fonts.mono };

const STATUS_COLORS: Record<string, string> = {
  active: colors.statusActive,
  "in-progress": colors.statusProgress,
  paused: colors.statusPaused,
};

const STATUS_CYCLE: Record<string, Project["status"]> = {
  active: "in-progress",
  "in-progress": "paused",
  paused: "active",
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
  onDelete?: () => void;
  pat?: string;
}

export function ProjectCard({ project, onUpdate, onDelete, pat }: ProjectCardProps) {
  const color = STATUS_COLORS[project.status] || colors.statusActive;

  const [repoStatus, setRepoStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [repoMsg, setRepoMsg] = useState("");

  const handleRepoSave = async (repo: string) => {
    onUpdate?.({ githubRepo: repo || undefined });
    if (!repo) { setRepoStatus('idle'); setRepoMsg(""); return; }
    if (!pat) { setRepoStatus('idle'); setRepoMsg("PAT 필요"); return; }
    setRepoStatus('testing');
    setRepoMsg("확인 중...");
    const result = await verifyRepo(pat, repo);
    setRepoStatus(result.ok ? 'ok' : 'error');
    setRepoMsg(result.msg);
  };

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${colors.borderFaint}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            onClick={() => {
              const next = STATUS_CYCLE[project.status];
              if (next) onUpdate?.({ status: next });
            }}
            title="클릭하여 상태 변경 (active → in-progress → paused)"
            style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}66`, cursor: "pointer", flexShrink: 0 }}
          />
          <InlineEdit
            value={project.name}
            onSave={name => onUpdate?.({ name })}
            style={{ fontSize: fontSizes.lg, fontWeight: 600, color: colors.textHigh, letterSpacing: 0.3 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <InlineEdit
            value={String(project.progress)}
            onSave={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) onUpdate?.({ progress: Math.min(100, Math.max(0, n)) });
            }}
            style={{ ...mono, fontSize: fontSizes.xs, color: colors.textDim }}
            inputStyle={{ ...mono, fontSize: fontSizes.xs, width: 40, textAlign: "right" }}
          />
          {onDelete && (
            <button
              onClick={onDelete}
              title="프로젝트 삭제"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textSubtle, fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
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
        <InlineEdit
          value={project.metric}
          onSave={metric => onUpdate?.({ metric })}
          style={{ fontSize: fontSizes.xs, color: colors.textSubtle }}
        />
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

      {/* GitHub repo link + data badges */}
      <div style={{ paddingLeft: 14, marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <InlineEdit
          value={project.githubRepo ?? ""}
          placeholder="owner/repo"
          onSave={handleRepoSave}
          style={{ ...mono, fontSize: fontSizes.mini, color: colors.textDim }}
          inputStyle={{ ...mono, fontSize: fontSizes.mini, width: 160 }}
        />
        {repoMsg && (
          <span style={{
            ...mono, fontSize: fontSizes.mini,
            color: repoStatus === 'ok' ? colors.statusActive :
                   repoStatus === 'error' ? colors.statusPaused :
                   colors.textDim,
            whiteSpace: "nowrap",
          }}>
            {repoMsg}
          </span>
        )}
        {!repoMsg && project.githubData && (
          <div
            onClick={() => {
              if (project.githubRepo && /^[\w.-]+\/[\w.-]+$/.test(project.githubRepo)) {
                openUrl(`https://github.com/${project.githubRepo}`);
              }
            }}
            title={project.githubRepo ? `GitHub: ${project.githubRepo} 열기` : undefined}
            style={{ display: "flex", gap: 6, alignItems: "center", cursor: project.githubRepo ? "pointer" : undefined }}
          >
            <span style={{ ...mono, fontSize: fontSizes.mini, color: colors.textDim }}>
              {relativeTime(project.githubData.lastCommitAt)}
            </span>
            {project.githubData.lastCommitMsg && (
              <span
                title={project.githubData.lastCommitMsg}
                style={{
                  fontSize: fontSizes.mini, color: colors.textDim,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 140, minWidth: 0,
                }}
              >
                {project.githubData.lastCommitMsg}
              </span>
            )}
            {project.githubData.openIssues > 0 && (
              <span style={{ ...mono, fontSize: fontSizes.mini, color: colors.textDim }}>
                {project.githubData.openIssues} issue{project.githubData.openIssues !== 1 ? "s" : ""}
              </span>
            )}
            {project.githubData.openPrs > 0 && (
              <span style={{ ...mono, fontSize: fontSizes.mini, color: colors.textDim }}>
                {project.githubData.openPrs} PR{project.githubData.openPrs !== 1 ? "s" : ""}
              </span>
            )}
            {project.githubData.ciStatus != null && project.githubData.ciStatus in CI_COLOR && (
              <span
                title={`CI: ${project.githubData.ciStatus}`}
                style={{
                  display: "inline-block",
                  width: 6, height: 6,
                  borderRadius: "50%",
                  background: CI_COLOR[project.githubData.ciStatus],
                  boxShadow: `0 0 4px ${CI_COLOR[project.githubData.ciStatus]}88`,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
