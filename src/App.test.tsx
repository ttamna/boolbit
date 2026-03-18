// ABOUTME: Integration tests for App component — section visibility via hiddenSections state
// ABOUTME: Verifies that sections hidden via SettingsPanel are removed from the rendered output

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke as mockInvoke } from "@tauri-apps/api/core";

// ── Tauri API mocks ──────────────────────────────────────
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
    listen: vi.fn().mockResolvedValue(() => {}),
    onMoved: vi.fn().mockResolvedValue(() => {}),
    setPosition: vi.fn().mockResolvedValue(undefined),
    setSize: vi.fn().mockResolvedValue(undefined),
    innerSize: vi.fn().mockResolvedValue({ width: 380, height: 700 }),
  })),
  PhysicalPosition: class { constructor(public x: number, public y: number) {} },
  LogicalSize: class { constructor(public width: number, public height: number) {} },
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn().mockResolvedValue(false),
  requestPermission: vi.fn().mockResolvedValue("denied"),
  sendNotification: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

import App from "./App";

describe("App section visibility via hiddenSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should hide the 'streaks' section when it is toggled off in SettingsPanel", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for the app to finish loading — Streaks section must be visible initially
    await waitFor(() => {
      expect(screen.getByText("Streaks")).toBeTruthy();
    });

    // Open settings panel
    const settingsButton = screen.getByTitle(/설정/i);
    await user.click(settingsButton);

    // Click the 'streaks' section toggle to hide it
    const streaksToggle = screen.getByTitle("streaks 섹션 표시/숨기기");
    await user.click(streaksToggle);

    // The Streaks section label should no longer be visible
    expect(screen.queryByText("Streaks")).toBeNull();
  });
});

describe("moveSection — hidden section boundary bug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // load_data returns sectionOrder with streaks in position 1
    // load_settings returns null (defaults used)
    vi.mocked(mockInvoke).mockImplementation((cmd: string) => {
      if (cmd === "load_data") {
        return Promise.resolve({
          projects: [],
          habits: [],
          quotes: [],
          sectionOrder: ["projects", "streaks", "pomodoro", "direction"],
        });
      }
      return Promise.resolve(null);
    });
  });

  it("should swap pomodoro with the nearest visible section (projects), not with the hidden streaks section", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for initial load — both Projects and Pomodoro must be visible
    await waitFor(() => {
      expect(screen.getByText("Projects")).toBeTruthy();
    });

    // Hide streaks via SettingsPanel so the visible order becomes:
    // projects, pomodoro, direction
    const settingsButton = screen.getByTitle(/설정/i);
    await user.click(settingsButton);

    const streaksToggle = screen.getByTitle("streaks 섹션 표시/숨기기");
    await user.click(streaksToggle);

    // Close settings panel so section move buttons become accessible
    await user.click(settingsButton);

    // Click "위로" (move up) on the Pomodoro section header
    // At this point the visible order is: projects(idx=0), pomodoro(idx=2), direction(idx=3)
    // The bug: moveSection uses the raw sectionOrder index, so pomodoro(idx=2) swaps with
    //          sectionOrder[1] = streaks (hidden), not with projects.
    const moveUpButtons = screen.getAllByTitle("섹션 위로 이동");
    // The second "섹션 위로 이동" button belongs to pomodoro (first visible one after projects)
    await user.click(moveUpButtons[1]);

    // After moving up, save_data must have been called with a sectionOrder where
    // pomodoro appears BEFORE projects — i.e., streaks must NOT appear between projects and pomodoro.
    // The correct result is ["pomodoro","projects","streaks","direction"] or equivalent where
    // pomodoro comes before projects.
    // The bug produces ["projects","pomodoro","streaks","direction"] — streaks swapped into position 1
    // but pomodoro stayed at position 2, which is wrong; actually the bug swaps pomodoro & streaks →
    // ["projects","pomodoro","streaks","direction"], so pomodoro goes to index 1 but streaks to index 2
    // — visually pomodoro appears to have moved but streaks was shuffled silently.
    //
    // The correct behavior: pomodoro should swap with projects (the previous VISIBLE section),
    // yielding sectionOrder where pomodoro precedes projects in the order.
    const saveDataCalls = vi.mocked(mockInvoke).mock.calls.filter(
      ([cmd]) => cmd === "save_data"
    );
    const lastSave = saveDataCalls[saveDataCalls.length - 1];
    const savedOrder = (lastSave[1] as { data: { sectionOrder: string[] } }).data.sectionOrder;

    const pomodoroIdx = savedOrder.indexOf("pomodoro");
    const projectsIdx = savedOrder.indexOf("projects");

    // pomodoro must come before projects in the saved order (the move-up succeeded past the hidden section)
    expect(pomodoroIdx).toBeLessThan(projectsIdx);
  });
});

describe("hiddenSections — save_data called with hiddenSections on toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call save_data with hiddenSections when a section is toggled off in SettingsPanel", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for the app to finish loading
    await waitFor(() => {
      expect(screen.getByText("Streaks")).toBeTruthy();
    });

    // Open settings panel
    const settingsButton = screen.getByTitle(/설정/i);
    await user.click(settingsButton);

    // Toggle streaks section off
    const streaksToggle = screen.getByTitle("streaks 섹션 표시/숨기기");
    await user.click(streaksToggle);

    // save_data must have been called with hiddenSections: ["streaks"]
    const saveDataCalls = vi.mocked(mockInvoke).mock.calls.filter(
      ([cmd]) => cmd === "save_data"
    );
    expect(saveDataCalls.length).toBeGreaterThan(0);
    const lastSave = saveDataCalls[saveDataCalls.length - 1];
    const savedHidden = (lastSave[1] as { data: { hiddenSections?: string[] } }).data.hiddenSections;
    expect(savedHidden).toContain("streaks");
  });
});

describe("arrow buttons — disabled for first/last visible section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // streaks is first in order; projects is second
    vi.mocked(mockInvoke).mockImplementation((cmd: string) => {
      if (cmd === "load_data") {
        return Promise.resolve({
          projects: [],
          habits: [],
          quotes: [],
          sectionOrder: ["streaks", "projects", "pomodoro", "direction"],
        });
      }
      return Promise.resolve(null);
    });
  });

  it("should disable the up button for projects when streaks (first in order) is hidden", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for app load
    await waitFor(() => {
      expect(screen.getByText("Projects")).toBeTruthy();
    });

    // Hide streaks via SettingsPanel — projects becomes the first visible section
    const settingsButton = screen.getByTitle(/설정/i);
    await user.click(settingsButton);

    const streaksToggle = screen.getByTitle("streaks 섹션 표시/숨기기");
    await user.click(streaksToggle);

    // Close settings panel
    await user.click(settingsButton);

    // The "위로" button for projects (now the first visible section) must be disabled
    // Bug: idx=1 in the full order, so up is defined and button is enabled
    const moveUpButtons = screen.getAllByTitle("섹션 위로 이동");
    // moveUpButtons[0] belongs to projects (the first visible section)
    expect((moveUpButtons[0] as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("hiddenSections — import syncs UI state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should hide the 'streaks' section in the UI after importing data that contains hiddenSections: ['streaks']", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for the app to finish loading — Streaks must be visible initially
    await waitFor(() => {
      expect(screen.getByText("Streaks")).toBeTruthy();
    });

    // Open settings panel
    const settingsButton = screen.getByTitle(/설정/i);
    await user.click(settingsButton);

    // Prepare import JSON that includes hiddenSections: ["streaks"]
    const importData = JSON.stringify({
      projects: [],
      habits: [],
      quotes: [],
      hiddenSections: ["streaks"],
    });
    const file = new File([importData], "backup.json", { type: "application/json" });

    // Trigger the hidden file input inside SettingsPanel
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // After import, the Streaks section must be hidden because hiddenSections was imported
    // BUG: onImport={persist} only calls persist() which calls setData(),
    //      but setHiddenSections() is never called — so Streaks remains visible.
    await waitFor(() => {
      expect(screen.queryByText("Streaks")).toBeNull();
    });
  });
});

describe("hiddenSections — persistence across app restart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should restore hiddenSections after remount when it was persisted in load_data", async () => {
    // Arrange: load_data returns data that includes hiddenSections: ["streaks"]
    // This simulates a user who previously hid the streaks section and the value was saved.
    vi.mocked(mockInvoke).mockImplementation((cmd: string) => {
      if (cmd === "load_data") {
        return Promise.resolve({
          projects: [],
          habits: [],
          quotes: [],
          // hiddenSections persisted from a previous session
          hiddenSections: ["streaks"],
        });
      }
      return Promise.resolve(null);
    });

    const { unmount } = render(<App />);

    // Streaks should NOT appear after load because hiddenSections was persisted
    await waitFor(() => {
      // Projects section must be visible to confirm the app has loaded
      expect(screen.getByText("Projects")).toBeTruthy();
    });

    // Streaks must be hidden — it was in the persisted hiddenSections list
    expect(screen.queryByText("Streaks")).toBeNull();

    unmount();
  });
});
