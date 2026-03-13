// ABOUTME: useGitHubSync hook - polls GitHub API for projects with a githubRepo set
// ABOUTME: Runs immediately on mount (or when PAT first appears) then on a configurable interval

import { useEffect, useRef } from "react";
import type { Project } from "../types";
import { fetchRepoData } from "../lib/github";

export function useGitHubSync(
  projects: Project[],
  pat: string | undefined,
  intervalMin: number,
  onUpdate: (id: number, patch: Partial<Project>) => void,
) {
  // Refs keep the interval callback current without recreating the interval
  const projectsRef = useRef(projects);
  const onUpdateRef = useRef(onUpdate);
  // Track whether we've done the first sync for the current PAT to avoid
  // re-firing immediately when only the interval changes
  const hasSyncedRef = useRef(false);

  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!pat) {
      hasSyncedRef.current = false;
      return;
    }

    const sync = async () => {
      const targets = projectsRef.current.filter(p => p.githubRepo);
      await Promise.allSettled(
        targets.map(async (p) => {
          try {
            const githubData = await fetchRepoData(pat, p.githubRepo!);
            onUpdateRef.current(p.id, { githubData });
          } catch {
            // Silent skip — bad repo, network error, rate limit, etc.
          }
        })
      );
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
