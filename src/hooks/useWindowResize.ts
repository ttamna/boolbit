// ABOUTME: useWindowResize hook - dynamically resizes Tauri window to fit content height
// ABOUTME: Uses ResizeObserver to track container and calls setSize, capped at screen height

import { useEffect, RefObject } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { isTauri } from "../lib/tauri";

export function useWindowResize(containerRef: RefObject<HTMLElement | null>, width = 380) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isTauri()) return;

    const win = getCurrentWindow();
    let pendingRaf: number | null = null;

    const applySize = (h: number) => {
      const maxH = window.screen.availHeight;
      const finalH = Math.min(Math.ceil(h), maxH);
      win.setSize(new LogicalSize(width, finalH)).catch(() => {
        // Ignore in browser dev mode
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

      // Batch to once per frame to avoid thrashing during CSS transitions
      if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null;
        applySize(h);
      });
    });

    observer.observe(el);
    // Apply immediately (without RAF) so width changes take effect without waiting for the next
    // ResizeObserver callback (which only fires when element height changes, not on width prop change).
    // Intentionally bypasses the RAF batching used for height updates — width change is user-triggered
    // and rare, so a single synchronous setSize call here is acceptable.
    applySize(el.getBoundingClientRect().height);
    return () => {
      observer.disconnect();
      if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
    };
  }, [containerRef, width]);
}
