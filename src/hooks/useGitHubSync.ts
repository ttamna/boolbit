// ABOUTME: useGitHubSync hook - polls GitHub API for projects with a githubRepo set
// ABOUTME: Runs immediately on mount (or when PAT first appears) then on a configurable interval

import { useEffect, useRef } from "react";
import type { Project } from "../types";
import { fetchRepoData } from "../lib/github";

export function useGitHubSync(
  projects: Project[],
  pat: string | undefined,
  intervalMin: number,
  // Batch callback — receives all successful updates at once to allow atomic persist
  onBatchUpdate: (updates: Array<{ id: number; patch: Partial<Project> }>) => void,
) {
  // Refs keep the interval callback current without recreating the interval
  const projectsRef = useRef(projects);
  const onBatchUpdateRef = useRef(onBatchUpdate);
  // Track whether we've done the first sync for the current PAT to avoid
  // re-firing immediately when only the interval changes
  const hasSyncedRef = useRef(false);

  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { onBatchUpdateRef.current = onBatchUpdate; }, [onBatchUpdate]);

  useEffect(() => {
    if (!pat) {
      hasSyncedRef.current = false;
      return;
    }

    const sync = async () => {
      const targets = projectsRef.current.filter(p => p.githubRepo);
      const updates: Array<{ id: number; patch: Partial<Project> }> = [];
      await Promise.allSettled(
        targets.map(async (p) => {
          try {
            const githubData = await fetchRepoData(pat, p.githubRepo!);
            updates.push({ id: p.id, patch: { githubData } });
          } catch {
            // Silent skip — bad repo, network error, rate limit, etc.
          }
        })
      );
      // Call once with all results so the caller can apply them atomically
      if (updates.length > 0) onBatchUpdateRef.current(updates);
    };

    // Only fire immediately on mount or when PAT changes, not on interval changes
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      sync();
    }
    const id = setInterval(sync, intervalMin * 60 * 1000);
    return () => clearInterval(id);
  }, [pat, intervalMin]);
}
