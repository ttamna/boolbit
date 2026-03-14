// ABOUTME: ProjectCard component - displays a single project with progress bar and metrics
// ABOUTME: Status cycles active→in-progress→paused→done; done=violet+dimmed; isFocus=★ amber priority marker; sessionsToday shows today's focus progress on ★ project

import { useState, CSSProperties } from "react";
import type { Project, GitHubData } from "../types";
import { fonts, fontSizes, colors, radius, PROJECT_STATUS_COLORS } from "../theme";
import { InlineEdit } from "./InlineEdit";
import { verifyRepo, fetchRepoData } from "../lib/github";
import { openUrl } from "@tauri-apps/plugin-opener";

function relativeTime(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return "—";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Returns a color token based on how stale the last commit is.
// Uses statusPaused for >7 days, statusProgress for 2-7 days, textDim otherwise.
function staleColor(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return colors.textDim;
  const days = Math.max(0, (Date.now() - ts) / 86400000);
  if (days > 7) return colors.statusPaused;
  if (days > 2) return colors.statusProgress;
  return colors.textDim;
}

const CI_COLOR: Record<NonNullable<GitHubData["ciStatus"]>, string> = {
  success: "#4ade80",
  failure: "#f87171",
  pending: "#facc15",
};

// Returns days remaining until deadline relative to local midnight.
// Requires strict YYYY-MM-DD format; returns null for invalid/empty strings.
// Uses T00:00:00 for local-midnight parsing (avoids UTC off-by-one).
// Uses Math.floor so DST days (23h) count as 0 remaining, not 1.
function deadlineDays(dateStr: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const ts = new Date(dateStr + "T00:00:00").getTime();
  if (isNaN(ts)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((ts - today.getTime()) / 86400000);
}

// Returns a relative deadline label: "D-5", "오늘 마감", "5d 초과", or "—" if invalid.
function deadlineRelative(dateStr: string): string {
  const days = deadlineDays(dateStr);
  if (days === null) return "—";
  if (days === 0) return "오늘 마감";
  if (days > 0) return `D-${days}`;
  return `${-days}d 초과`;
}

// Returns days elapsed since lastFocusDate relative to local midnight; null if today or invalid.
// Used to show "⊖ Nd" stale-focus indicator on project cards.
function lastFocusDaysAgo(dateStr: string | undefined): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const ts = new Date(dateStr + "T00:00:00").getTime();
  if (isNaN(ts)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - ts) / 86400000);
  return days > 0 ? days : null; // null if today (no stale indicator needed)
}

// Returns a YYYY-MM-DD date string for n days from today (local time).
function dateAfterDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv");
}

// Returns urgency color: red if today or overdue (days ≤ 0), yellow if ≤7 days, dim otherwise.
function deadlineColor(dateStr: string): string {
  const days = deadlineDays(dateStr);
  if (days === null) return colors.textPhantom;
  if (days <= 0) return colors.statusPaused;
  if (days <= 7) return colors.statusProgress;
  return colors.textSubtle;
}

// Opens a GitHub URL path under the given repo; no-op if repo is absent or malformed
function openGitHubUrl(repo: string | undefined, path = "") {
  if (repo && /^[\w.-]+\/[\w.-]+$/.test(repo))
    openUrl(`https://github.com/${repo}${path}`);
}

const mono: CSSProperties = { fontFamily: fonts.mono };

const STATUS_CYCLE: Record<Project["status"], Project["status"]> = {
  active: "in-progress",
  "in-progress": "paused",
  paused: "done",
  done: "active",
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
  sessionsToday?: number;   // focus sessions completed today (app-global, from pomodoro); shown on isFocus project only
  sessionGoal?: number;     // daily session goal (from pomodoroSessionGoal); undefined = no goal set
}

export function ProjectCard({ project, onUpdate, onDelete, pat, sessionsToday, sessionGoal }: ProjectCardProps) {
  // Neutral fallback for unknown status values from deserialized JSON
  const color = PROJECT_STATUS_COLORS[project.status] ?? colors.textDim;

  // url: true when saved URL starts with a recognized scheme; controls ⇱ open behavior
  const urlSchemeValid = !!(project.url && (project.url.startsWith("https://") || project.url.startsWith("http://")));
  // staleDays: days since last pomodoro focus session; null if focused today, never, or invalid
  const staleDays = lastFocusDaysAgo(project.lastFocusDate);

  const [repoStatus, setRepoStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [repoMsg, setRepoMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  // deadlinePickerOpen: true while the quick-set panel (presets + manual input) is visible
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);

  const handleRefresh = async () => {
    if (!pat || !project.githubRepo || !onUpdate || refreshing) return;
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const githubData = await fetchRepoData(pat, project.githubRepo);
      onUpdate({ githubData });
    } catch {
      setRefreshMsg("실패");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRepoSave = async (repo: string) => {
    onUpdate?.({ githubRepo: repo || undefined });
    setRefreshMsg(""); // clear any stale refresh error
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
              if (!next) return;
              const today = new Date().toLocaleDateString("sv");
              const patch: Partial<Project> = { status: next };
              if (next === "done") patch.completedDate = today;
              else if (project.status === "done") patch.completedDate = undefined;
              onUpdate?.(patch);
            }}
            title="클릭하여 상태 변경 (active → in-progress → paused → done → active)"
            style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}66`, cursor: "pointer", flexShrink: 0 }}
          />
          <InlineEdit
            value={project.name}
            onSave={name => onUpdate?.({ name })}
            style={{ fontSize: fontSizes.lg, fontWeight: 600, color: project.status === "done" ? colors.textMuted : colors.textHigh, letterSpacing: 0.3 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onUpdate?.({ progress: Math.max(0, project.progress - 5) })}
            disabled={project.progress <= 0}
            title="진행률 −5%"
            style={{
              background: "transparent", border: "none", cursor: project.progress > 0 ? "pointer" : "default",
              color: project.progress > 0 ? colors.textSubtle : colors.textLabel,
              fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
            }}
          >−</button>
          <InlineEdit
            value={String(project.progress)}
            onSave={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) onUpdate?.({ progress: Math.min(100, Math.max(0, n)) });
            }}
            style={{ ...mono, fontSize: fontSizes.xs, color: colors.textDim }}
            inputStyle={{ ...mono, fontSize: fontSizes.xs, width: 40, textAlign: "right" }}
          />
          <button
            onClick={() => onUpdate?.({ progress: Math.min(100, project.progress + 5) })}
            disabled={project.progress >= 100}
            title="진행률 +5%"
            style={{
              background: "transparent", border: "none", cursor: project.progress < 100 ? "pointer" : "default",
              color: project.progress < 100 ? colors.textSubtle : colors.textLabel,
              fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
            }}
          >+</button>
          {/* Pomodoro session counter: visible when at least one session has been credited */}
          {(project.pomodoroSessions ?? 0) > 0 && (
            <span
              title={`뽀모도로 ${project.pomodoroSessions}세션 투자됨`}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom, padding: "0 2px", lineHeight: 1 }}
            >
              🍅{project.pomodoroSessions}
            </span>
          )}
          {/* Today's sessions: shown on ★ focus project when at least one session was done today.
              Goal suffix: /M when daily goal is set and not yet reached; omitted when done or no goal.
              ↑ arrow mirrors the ⊖ stale indicator — "up today" vs "stale past". */}
          {project.isFocus && project.status !== "done" && (sessionsToday ?? 0) > 0 && (
            <span
              title={`오늘 ${sessionsToday}회 집중${sessionGoal != null && sessionGoal > 0 ? ` (목표 ${sessionGoal}회)` : ""}`}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textMid, padding: "0 2px", lineHeight: 1 }}
            >
              🍅{sessionsToday}{sessionGoal != null && sessionGoal > 0 && (sessionsToday ?? 0) < sessionGoal ? `/${sessionGoal}` : ""}↑
            </span>
          )}
          {/* Last focus stale indicator: visible when lastFocusDate was set on a prior day.
              Intentionally shown on all non-done projects (not just ★ focus) so the user can
              see how recently each project received attention — portfolio staleness at a glance. */}
          {project.status !== "done" && staleDays !== null && (
            <span
              title={`마지막 집중: ${staleDays}일 전 (${project.lastFocusDate ?? ""})`}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textLabel, padding: "0 2px", lineHeight: 1 }}
            >
              ⊖{staleDays}d
            </span>
          )}
          {/* Completion date: shown on done projects when recorded; slice(5) gives MM-DD */}
          {project.status === "done" && project.completedDate && (
            <span
              title={`완료: ${project.completedDate}`}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textLabel, padding: "0 2px", lineHeight: 1 }}
            >
              ✓{project.completedDate.slice(5)}
            </span>
          )}
          {/* Focus marker: hidden for done projects since they are no longer active work */}
          {project.status !== "done" && (
            <button
              onClick={() => onUpdate?.({ isFocus: project.isFocus ? undefined : true })}
              title={project.isFocus ? "집중 해제" : "오늘의 집중 프로젝트로 표시"}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: project.isFocus ? colors.statusProgress : colors.textPhantom,
                fontSize: fontSizes.xs, padding: "0 2px", lineHeight: 1,
                transition: "color 0.2s",
              }}
            >
              {project.isFocus ? "★" : "☆"}
            </button>
          )}
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
      {/* Notes — freeform memo: context, blockers, next steps; ✕ clears when set */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingLeft: 14, marginTop: 2 }}>
        <InlineEdit
          value={project.notes ?? ""}
          placeholder="+ 메모"
          onSave={v => onUpdate?.({ notes: v || undefined })} // empty string clears notes
          style={{ fontSize: fontSizes.mini, color: project.notes ? colors.textSubtle : colors.textPhantom, flex: 1 }}
          inputStyle={{ fontSize: fontSizes.mini }}
          multiline
        />
        {project.notes && (
          <button
            onClick={() => onUpdate?.({ notes: undefined })}
            title="메모 삭제"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>
      {/* External URL — quick link to project live site, docs, or production; ✕ clears when set */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 14, marginTop: 2 }}>
        <InlineEdit
          value={project.url ?? ""}
          placeholder="+ 링크"
          onSave={v => onUpdate?.({ url: v || undefined })}
          style={{ ...mono, fontSize: fontSizes.mini, color: project.url ? colors.textSubtle : colors.textPhantom }}
          inputStyle={{ ...mono, fontSize: fontSizes.mini, width: 180 }}
        />
        {project.url && (
          <>
            <button
              onClick={() => { const u = project.url; if (u && urlSchemeValid) openUrl(u); }}
              title={urlSchemeValid ? `${project.url} 열기` : "유효하지 않은 URL (http:// 또는 https:// 필요)"}
              style={{
                background: "transparent", border: "none",
                cursor: urlSchemeValid ? "pointer" : "default",
                color: urlSchemeValid ? colors.textSubtle : colors.textPhantom,
                opacity: urlSchemeValid ? 1 : 0.4,
                fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
              }}
            >⇱</button>
            <button
              onClick={() => onUpdate?.({ url: undefined })}
              title="링크 삭제"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
              }}
            >✕</button>
          </>
        )}
      </div>

      {/* Deadline — inline editable; faint placeholder when unset; urgency color when set */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 14, marginTop: 2 }}>
        {project.deadline ? (
          <>
            <span
              title={project.deadline}
              style={{ ...mono, fontSize: fontSizes.mini, color: deadlineColor(project.deadline), fontWeight: 600 }}
            >
              {deadlineRelative(project.deadline)}
            </span>
            <InlineEdit
              value={project.deadline}
              onSave={v => {
                if (deadlineDays(v) !== null) onUpdate?.({ deadline: v });
              }}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom }}
              inputStyle={{ ...mono, fontSize: fontSizes.mini, width: 90 }}
            />
            <button
              onClick={() => { onUpdate?.({ deadline: undefined }); setDeadlinePickerOpen(false); }}
              title="마감일 삭제"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
              }}
            >
              ✕
            </button>
          </>
        ) : deadlinePickerOpen ? (
          // Quick-set panel: preset buttons + manual YYYY-MM-DD input + cancel
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {([7, 14, 30] as const).map(days => {
              // Compute once per render so onClick and title always show the same date
              const target = dateAfterDays(days);
              return (
                <button
                  key={days}
                  onClick={() => { onUpdate?.({ deadline: target }); setDeadlinePickerOpen(false); }}
                  title={`오늘로부터 ${days}일 뒤: ${target}`}
                  style={{
                    ...mono, padding: "1px 5px", borderRadius: 3,
                    background: "transparent",
                    border: `1px solid ${colors.borderFaint}`,
                    color: colors.textPhantom, fontSize: fontSizes.mini, cursor: "pointer",
                  }}
                >
                  +{days === 30 ? "1달" : `${days}일`}
                </button>
              );
            })}
            <InlineEdit
              value=""
              placeholder="YYYY-MM-DD"
              onSave={v => { if (deadlineDays(v) !== null) { onUpdate?.({ deadline: v }); setDeadlinePickerOpen(false); } }}
              style={{ ...mono, fontSize: fontSizes.mini, color: colors.textPhantom }}
              inputStyle={{ ...mono, fontSize: fontSizes.mini, width: 90 }}
            />
            <button
              onClick={() => setDeadlinePickerOpen(false)}
              title="취소"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1 }}
            >✕</button>
          </div>
        ) : (
          // Collapsed: single button to open the quick-set panel
          <button
            onClick={() => setDeadlinePickerOpen(true)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textPhantom, fontSize: fontSizes.mini, padding: "0", lineHeight: 1, opacity: 0.7 }}
          >+ 마감일</button>
        )}
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
        {/* Manual refresh — visible when PAT + repo are configured; hidden only while verifying */}
        {pat && project.githubRepo && repoStatus !== 'testing' && (
          <>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="GitHub 데이터 새로고침"
              style={{
                background: "transparent", border: "none",
                cursor: refreshing ? "default" : "pointer",
                color: refreshing ? colors.textLabel : colors.textPhantom,
                fontSize: fontSizes.mini, padding: "0 2px", lineHeight: 1,
                transition: "color 0.2s",
              }}
            >
              ↺
            </button>
            {refreshMsg && (
              <span style={{ ...mono, fontSize: fontSizes.mini, color: colors.statusPaused }}>
                {refreshMsg}
              </span>
            )}
          </>
        )}
        {!repoMsg && project.githubData && (
          <div
            onClick={() => openGitHubUrl(project.githubRepo)}
            title={project.githubRepo ? `GitHub: ${project.githubRepo} 열기` : undefined}
            style={{ display: "flex", gap: 6, alignItems: "center", cursor: project.githubRepo ? "pointer" : undefined }}
          >
            <span style={{ ...mono, fontSize: fontSizes.mini, color: staleColor(project.githubData.lastCommitAt) }}>
              {relativeTime(project.githubData.lastCommitAt)}
            </span>
            {project.githubData.openIssues > 0 && (
              <span
                onClick={e => { e.stopPropagation(); openGitHubUrl(project.githubRepo, "/issues"); }}
                title={`오픈 이슈 ${project.githubData.openIssues}개 — GitHub Issues 열기`}
                style={{ ...mono, fontSize: fontSizes.mini, color: colors.textDim, cursor: project.githubRepo ? "pointer" : undefined }}
              >
                {project.githubData.openIssues} issue{project.githubData.openIssues !== 1 ? "s" : ""}
              </span>
            )}
            {project.githubData.openPrs > 0 && (
              <span
                onClick={e => { e.stopPropagation(); openGitHubUrl(project.githubRepo, "/pulls"); }}
                title={`오픈 PR ${project.githubData.openPrs}개 — GitHub Pull Requests 열기`}
                style={{ ...mono, fontSize: fontSizes.mini, color: colors.textDim, cursor: project.githubRepo ? "pointer" : undefined }}
              >
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
      {/* Last commit message */}
      {!repoMsg && project.githubData && (
        <div
          title={project.githubData.lastCommitMsg}
          style={{
            paddingLeft: 14, marginTop: 2, width: "100%",
            ...mono, fontSize: fontSizes.mini, color: colors.textPhantom,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {project.githubData.lastCommitMsg}
        </div>
      )}
    </div>
  );
}
