// ABOUTME: Unit tests for SectionLabel component — badge, toggle chevron, collapsed state, reorder buttons, and stopPropagation behavior
// ABOUTME: Covers all four prop combinations: badge, onToggle, collapsed, onMoveUp, onMoveDown; verifies callback firing and event isolation

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionLabel } from "./SectionLabel";

describe("SectionLabel rendering", () => {
  it("should render the label text", () => {
    render(<SectionLabel>Projects</SectionLabel>);
    expect(screen.getByText("Projects")).toBeDefined();
  });

  it("should render the badge when provided", () => {
    render(<SectionLabel badge="3/4">Streaks</SectionLabel>);
    expect(screen.getByText("3/4")).toBeDefined();
  });

  it("should not render the badge when absent", () => {
    render(<SectionLabel>Streaks</SectionLabel>);
    expect(screen.queryByText("3/4")).toBeNull();
  });

  it("should render the toggle chevron (▾) when onToggle is provided", () => {
    render(<SectionLabel onToggle={vi.fn()}>Direction</SectionLabel>);
    expect(screen.getByText("▾")).toBeDefined();
  });

  it("should not render the toggle chevron when onToggle is absent", () => {
    render(<SectionLabel>Direction</SectionLabel>);
    expect(screen.queryByText("▾")).toBeNull();
  });
});

describe("SectionLabel collapsed prop", () => {
  it("should apply rotate(-90deg) on the chevron when collapsed=true", () => {
    render(<SectionLabel onToggle={vi.fn()} collapsed={true}>Direction</SectionLabel>);
    const chevron = screen.getByText("▾") as HTMLElement;
    expect(chevron.style.transform).toBe("rotate(-90deg)");
  });

  it("should apply rotate(0deg) on the chevron when collapsed=false (expanded default)", () => {
    render(<SectionLabel onToggle={vi.fn()} collapsed={false}>Direction</SectionLabel>);
    const chevron = screen.getByText("▾") as HTMLElement;
    expect(chevron.style.transform).toBe("rotate(0deg)");
  });
});

describe("SectionLabel toggle behavior", () => {
  it("should call onToggle when the label area is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SectionLabel onToggle={onToggle}>Projects</SectionLabel>);
    await user.click(screen.getByText("Projects"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("should not throw when clicked without onToggle prop", async () => {
    const user = userEvent.setup();
    render(<SectionLabel>Projects</SectionLabel>);
    await expect(user.click(screen.getByText("Projects"))).resolves.not.toThrow();
  });
});

describe("SectionLabel reorder buttons", () => {
  it("should render the up button when onMoveUp is provided", () => {
    render(<SectionLabel onMoveUp={vi.fn()}>Projects</SectionLabel>);
    expect(screen.getByTitle("섹션 위로 이동")).toBeDefined();
  });

  it("should render the down button when onMoveDown is provided", () => {
    render(<SectionLabel onMoveDown={vi.fn()}>Projects</SectionLabel>);
    expect(screen.getByTitle("섹션 아래로 이동")).toBeDefined();
  });

  it("should not render reorder buttons when neither onMoveUp nor onMoveDown is provided", () => {
    render(<SectionLabel>Projects</SectionLabel>);
    expect(screen.queryByTitle("섹션 위로 이동")).toBeNull();
    expect(screen.queryByTitle("섹션 아래로 이동")).toBeNull();
  });

  it("should render disabled up button when only onMoveDown is provided", () => {
    render(<SectionLabel onMoveDown={vi.fn()}>Projects</SectionLabel>);
    const upBtn = screen.getByTitle("섹션 위로 이동") as HTMLButtonElement;
    expect(upBtn.disabled).toBe(true);
  });

  it("should render disabled down button when only onMoveUp is provided", () => {
    render(<SectionLabel onMoveUp={vi.fn()}>Projects</SectionLabel>);
    const downBtn = screen.getByTitle("섹션 아래로 이동") as HTMLButtonElement;
    expect(downBtn.disabled).toBe(true);
  });

  it("should call onMoveUp when the up button is clicked after hovering", async () => {
    const user = userEvent.setup();
    const onMoveUp = vi.fn();
    const { container } = render(<SectionLabel onMoveUp={onMoveUp}>Projects</SectionLabel>);
    await user.hover(container.firstChild as HTMLElement);
    await user.click(screen.getByTitle("섹션 위로 이동"));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
  });

  it("should call onMoveDown when the down button is clicked after hovering", async () => {
    const user = userEvent.setup();
    const onMoveDown = vi.fn();
    const { container } = render(<SectionLabel onMoveDown={onMoveDown}>Projects</SectionLabel>);
    await user.hover(container.firstChild as HTMLElement);
    await user.click(screen.getByTitle("섹션 아래로 이동"));
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it("should NOT call onToggle when a reorder button is clicked (stopPropagation)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onMoveUp = vi.fn();
    const { container } = render(<SectionLabel onToggle={onToggle} onMoveUp={onMoveUp}>Projects</SectionLabel>);
    // Hover to reveal the reorder buttons, then click — userEvent simulates real DOM event bubbling
    // so stopPropagation on the container div is genuinely exercised.
    await user.hover(container.firstChild as HTMLElement);
    await user.click(screen.getByTitle("섹션 위로 이동"));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
