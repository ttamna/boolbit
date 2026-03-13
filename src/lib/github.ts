// ABOUTME: GitHub API client - fetches repo stats (commits, issues, PRs, CI) via PAT auth
// ABOUTME: All API calls run in parallel; throws on non-404 HTTP errors for caller to handle

import type { GitHubData } from "../types";

const BASE = "https://api.github.com";

function headers(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function ciStatus(conclusion: string | null): GitHubData["ciStatus"] {
  if (conclusion === null) return "pending";
  if (conclusion === "success") return "success";
  return "failure";
}

export async function verifyRepo(pat: string, repo: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const res = await fetch(`${BASE}/repos/${repo}`, { headers: headers(pat) });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, msg: `✓ ${data.full_name}` };
    }
    if (res.status === 404) return { ok: false, msg: "저장소를 찾을 수 없음" };
    if (res.status === 401) return { ok: false, msg: "PAT 인증 실패" };
    return { ok: false, msg: `오류 ${res.status}` };
  } catch {
    return { ok: false, msg: "네트워크 오류" };
  }
}

export async function fetchRepoData(pat: string, repo: string): Promise<GitHubData> {
  const h = headers(pat);
  const [repoRes, commitsRes, runsRes, pullsRes] = await Promise.all([
    fetch(`${BASE}/repos/${repo}`, { headers: h }),
    fetch(`${BASE}/repos/${repo}/commits?per_page=1`, { headers: h }),
    fetch(`${BASE}/repos/${repo}/actions/runs?per_page=1`, { headers: h }),
    fetch(`${BASE}/repos/${repo}/pulls?state=open&per_page=100`, { headers: h }),
  ]);

  if (!repoRes.ok) throw new Error(`GitHub API error ${repoRes.status} for ${repo}`);
  if (!commitsRes.ok) throw new Error(`GitHub commits error ${commitsRes.status}`);

  const repoJson = await repoRes.json();
  const commitsJson = await commitsRes.json();

  const lastCommit = Array.isArray(commitsJson) && commitsJson.length > 0 ? commitsJson[0] : null;
  const lastCommitAt = lastCommit?.commit?.committer?.date ?? lastCommit?.commit?.author?.date ?? new Date().toISOString();
  const lastCommitMsg = lastCommit?.commit?.message?.split("\n")[0] ?? "";

  // Pull requests count
  const pullsJson = pullsRes.ok ? await pullsRes.json() : [];
  const openPrs = Array.isArray(pullsJson) ? pullsJson.length : 0;

  // open_issues_count on GitHub includes PRs — subtract to get pure issue count
  const openIssues = Math.max(0, (repoJson.open_issues_count ?? 0) - openPrs);

  // CI status: 404 means Actions not enabled → null
  let ci: GitHubData["ciStatus"] = null;
  if (runsRes.ok) {
    const runsJson = await runsRes.json();
    const latest = runsJson.workflow_runs?.[0];
    if (latest) ci = ciStatus(latest.conclusion);
  }

  return {
    lastCommitAt,
    lastCommitMsg,
    openIssues,
    openPrs,
    ciStatus: ci,
    fetchedAt: new Date().toISOString(),
  };
}
