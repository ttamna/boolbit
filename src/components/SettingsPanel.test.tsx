// ABOUTME: Unit tests for SettingsPanel component — section visibility toggle behavior
// ABOUTME: Covers theme switcher, clock format, GitHub refresh interval, opacity slider, export button, and lifetime stats

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "./SettingsPanel";
import type { WidgetSettings, WidgetData, SectionKey } from "../types";
import { triggerDownload } from "../lib/dataIO";

vi.mock("../lib/dataIO", () => ({
  buildExportBlob: vi.fn(() => new Blob(["{}"], { type: "application/json" })),
  triggerDownload: vi.fn(),
  parseImportedData: vi.fn(() => ({ ok: false, error: "mock" })),
}));

const baseSettings: WidgetSettings = {
  position: { x: 0, y: 0 },
  size: { width: 380, height: 700 },
  opacity: 1.0,
  theme: "void",
  clockFormat: "24h",
};

const baseWidgetData: WidgetData = {
  projects: [],
  habits: [],
  quotes: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Section visibility toggles ───────────────────────────────

describe("SettingsPanel section visibility toggles", () => {
  it("should render a section visibility toggle for the 'projects' section", () => {
    render(
      <SettingsPanel
        settings={baseSettings}
        onUpdate={vi.fn()}
        widgetData={baseWidgetData}
        hiddenSections={[]}
        onHiddenSectionsChange={vi.fn()}
      />
    );
    expect(screen.getByTitle("projects 섹션 표시/숨기기")).toBeDefined();
  });

  it("should call onHiddenSectionsChange with the section added when a visible section toggle is clicked", async () => {
    const user = userEvent.setup();
    const onHiddenSectionsChange = vi.fn();
    render(
      <SettingsPanel
        settings={baseSettings}
        onUpdate={vi.fn()}
        widgetData={baseWidgetData}
        hiddenSections={[]}
        onHiddenSectionsChange={onHiddenSectionsChange}
      />
    );
    await user.click(screen.getByTitle("streaks 섹션 표시/숨기기"));
    expect(onHiddenSectionsChange).toHaveBeenCalledWith(["streaks"]);
  });

  it("should call onHiddenSectionsChange with the section removed when a hidden section toggle is clicked", async () => {
    const user = userEvent.setup();
    const onHiddenSectionsChange = vi.fn();
    render(
      <SettingsPanel
        settings={baseSettings}
        onUpdate={vi.fn()}
        widgetData={baseWidgetData}
        hiddenSections={["streaks"] as SectionKey[]}
        onHiddenSectionsChange={onHiddenSectionsChange}
      />
    );
    await user.click(screen.getByTitle("streaks 섹션 표시/숨기기"));
    expect(onHiddenSectionsChange).toHaveBeenCalledWith([]);
  });
});

// ── Theme switcher ──────────────────────────────────────────

describe("SettingsPanel theme switcher", () => {
  it("should render a button for each theme", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    expect(screen.getByTitle("Void")).toBeDefined();
    expect(screen.getByTitle("Nebula")).toBeDefined();
    expect(screen.getByTitle("Forest")).toBeDefined();
    expect(screen.getByTitle("Ember")).toBeDefined();
    expect(screen.getByTitle("Midnight")).toBeDefined();
    expect(screen.getByTitle("Aurora")).toBeDefined();
    expect(screen.getByTitle("Rose")).toBeDefined();
  });

  it("should display active theme name as text", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    expect(screen.getByText("Void")).toBeDefined();
  });

  it("should call onUpdate with theme key when a theme button is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    await user.click(screen.getByTitle("Nebula"));
    expect(onUpdate).toHaveBeenCalledWith({ theme: "nebula" });
  });

  it("should call onUpdate with correct key when ember theme is selected", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    await user.click(screen.getByTitle("Ember"));
    expect(onUpdate).toHaveBeenCalledWith({ theme: "ember" });
  });

  it("should show the active theme name for the current theme", () => {
    render(
      <SettingsPanel
        settings={{ ...baseSettings, theme: "nebula" }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText("Nebula")).toBeDefined();
  });
});

// ── Clock format toggle ─────────────────────────────────────

describe("SettingsPanel clock format toggle", () => {
  it("should render 12h and 24h buttons", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    expect(screen.getByText("12h")).toBeDefined();
    expect(screen.getByText("24h")).toBeDefined();
  });

  it("should call onUpdate with clockFormat 12h when 12h button is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    await user.click(screen.getByText("12h"));
    expect(onUpdate).toHaveBeenCalledWith({ clockFormat: "12h" });
  });

  it("should call onUpdate with clockFormat 24h when 24h button is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <SettingsPanel
        settings={{ ...baseSettings, clockFormat: "12h" }}
        onUpdate={onUpdate}
      />
    );
    await user.click(screen.getByText("24h"));
    expect(onUpdate).toHaveBeenCalledWith({ clockFormat: "24h" });
  });
});

// ── GitHub refresh interval ──────────────────────────────────

describe("SettingsPanel GitHub refresh interval", () => {
  it("should render all refresh interval options", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    expect(screen.getByText("5m")).toBeDefined();
    expect(screen.getByText("10m")).toBeDefined();
    expect(screen.getByText("30m")).toBeDefined();
    expect(screen.getByText("60m")).toBeDefined();
  });

  it("should call onUpdate with githubRefreshInterval 5 when 5m is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    await user.click(screen.getByText("5m"));
    expect(onUpdate).toHaveBeenCalledWith({ githubRefreshInterval: 5 });
  });

  it("should call onUpdate with githubRefreshInterval 60 when 60m is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    await user.click(screen.getByText("60m"));
    expect(onUpdate).toHaveBeenCalledWith({ githubRefreshInterval: 60 });
  });

  it("should call onUpdate with githubRefreshInterval 30 when 30m is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    await user.click(screen.getByText("30m"));
    expect(onUpdate).toHaveBeenCalledWith({ githubRefreshInterval: 30 });
  });
});

// ── Opacity slider ──────────────────────────────────────────

describe("SettingsPanel opacity slider", () => {
  it("should render the opacity slider with current value", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
    expect((slider as HTMLInputElement).value).toBe("100");
  });

  it("should display the opacity percentage as text", () => {
    render(
      <SettingsPanel
        settings={{ ...baseSettings, opacity: 0.8 }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByText("80%")).toBeDefined();
  });

  it("should call onUpdate with new opacity when slider changes", () => {
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "70" } });
    expect(onUpdate).toHaveBeenCalledWith({ opacity: 0.7 });
  });

  it("should call onUpdate with opacity 0.5 when slider is set to 50", () => {
    const onUpdate = vi.fn();
    render(<SettingsPanel settings={baseSettings} onUpdate={onUpdate} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "50" } });
    expect(onUpdate).toHaveBeenCalledWith({ opacity: 0.5 });
  });
});

// ── Export button ───────────────────────────────────────────

describe("SettingsPanel export button", () => {
  it("should render the export button", () => {
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={baseWidgetData} />
    );
    expect(screen.getByText("내보내기")).toBeDefined();
  });

  it("should disable the export button when widgetData is not provided", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    // getByRole('button') guarantees HTMLButtonElement — .disabled is safe here
    const btn = screen.getByRole("button", { name: "내보내기" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("should enable the export button when widgetData is provided", () => {
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={baseWidgetData} />
    );
    const btn = screen.getByRole("button", { name: "내보내기" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("should call triggerDownload when export button is clicked with widgetData", async () => {
    const user = userEvent.setup();
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={baseWidgetData} />
    );
    await user.click(screen.getByRole("button", { name: "내보내기" }));
    expect(triggerDownload).toHaveBeenCalledOnce();
  });

  it("should render the import button", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    expect(screen.getByText("가져오기")).toBeDefined();
  });
});

// ── Lifetime stats section ──────────────────────────────────

describe("SettingsPanel lifetime stats section", () => {
  it("should not render stats section when widgetData has no lifetime data", () => {
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={baseWidgetData} />
    );
    expect(screen.queryByText("통계")).toBeNull();
  });

  it("should render stats section when widgetData has positive pomodoroLifetimeMins", () => {
    const dataWithStats: WidgetData = { ...baseWidgetData, pomodoroLifetimeMins: 150 };
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={dataWithStats} />
    );
    expect(screen.getByText("통계")).toBeDefined();
    // label rendered as "{emoji} {label}" in same span — use regex for partial match
    expect(screen.getByText(/총 집중 시간/)).toBeDefined();
  });

  it("should render habit check-in count when habitLifetimeTotalCheckins is positive", () => {
    const dataWithStats: WidgetData = { ...baseWidgetData, habitLifetimeTotalCheckins: 500 };
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={dataWithStats} />
    );
    expect(screen.getByText(/총 습관 체크인/)).toBeDefined();
    expect(screen.getByText("500회")).toBeDefined();
  });

  it("should render completed projects count when there are done projects", () => {
    const dataWithDone: WidgetData = {
      ...baseWidgetData,
      projects: [
        { id: 1, name: "A", status: "done", goal: "", progress: 100, metric: "", metric_value: "", metric_target: "" },
      ],
    };
    render(
      <SettingsPanel settings={baseSettings} onUpdate={vi.fn()} widgetData={dataWithDone} />
    );
    expect(screen.getByText(/완료한 프로젝트/)).toBeDefined();
    expect(screen.getByText("1개")).toBeDefined();
  });

  it("should not render stats section when widgetData is absent", () => {
    render(<SettingsPanel settings={baseSettings} onUpdate={vi.fn()} />);
    expect(screen.queryByText("통계")).toBeNull();
  });
});
