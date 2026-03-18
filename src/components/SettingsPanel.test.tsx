// ABOUTME: Unit tests for SettingsPanel component — section visibility toggle behavior
// ABOUTME: Covers hiddenSections on/off toggle UI for each SectionKey

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "./SettingsPanel";
import type { WidgetSettings, WidgetData, SectionKey } from "../types";

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
