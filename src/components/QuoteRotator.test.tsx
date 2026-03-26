// ABOUTME: Unit tests for QuoteRotator component rendering and interaction behavior
// ABOUTME: Covers N/M position indicator, empty state, navigation buttons, edit mode lifecycle, interval preset callbacks, and mutation callbacks (delete/add/reorder)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuoteRotator } from "./QuoteRotator";

const noOp = () => {};

// QuoteRotator uses setInterval (auto-rotation) and setTimeout (fade transitions).
// Fake timers prevent these from firing after test cleanup, keeping test output pristine.
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("QuoteRotator N/M position indicator", () => {
  it("should show position indicator when multiple quotes are provided", () => {
    render(<QuoteRotator quotes={["Quote A", "Quote B", "Quote C"]} onUpdate={noOp} />);
    expect(screen.getByText("1/3")).toBeDefined();
  });

  it("should not show position indicator when there is only one quote", () => {
    render(<QuoteRotator quotes={["Single quote"]} onUpdate={noOp} />);
    expect(screen.queryByText("1/1")).toBeNull();
  });

  it("should not show position indicator when there are no quotes", () => {
    render(<QuoteRotator quotes={[]} onUpdate={noOp} />);
    // quotes.length > 1 guard prevents rendering; "1/0" would appear if guard were weakened to >= 1
    expect(screen.queryByText("1/0")).toBeNull();
  });
});

describe("QuoteRotator static rendering", () => {
  it("should show em dash fallback when quotes array is empty", () => {
    render(<QuoteRotator quotes={[]} onUpdate={noOp} />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("should show quote text when a single quote is provided", () => {
    render(<QuoteRotator quotes={["The only way is forward."]} onUpdate={noOp} />);
    expect(screen.getByText("The only way is forward.")).toBeDefined();
  });

  it("should show the first quote by default when multiple quotes are provided", () => {
    render(<QuoteRotator quotes={["First quote", "Second quote"]} onUpdate={noOp} />);
    expect(screen.getByText("First quote")).toBeDefined();
  });

  it("should show navigation buttons when multiple quotes are provided", () => {
    render(<QuoteRotator quotes={["Quote A", "Quote B"]} onUpdate={noOp} />);
    expect(screen.getByTitle("이전 인용구")).toBeDefined();
    expect(screen.getByTitle("다음 인용구")).toBeDefined();
  });

  it("should not show navigation buttons when only one quote exists", () => {
    render(<QuoteRotator quotes={["Only quote"]} onUpdate={noOp} />);
    expect(screen.queryByTitle("이전 인용구")).toBeNull();
    expect(screen.queryByTitle("다음 인용구")).toBeNull();
  });

  it("should not show navigation buttons when quotes array is empty", () => {
    render(<QuoteRotator quotes={[]} onUpdate={noOp} />);
    expect(screen.queryByTitle("이전 인용구")).toBeNull();
    expect(screen.queryByTitle("다음 인용구")).toBeNull();
  });

  it("should show the edit button when there are no quotes", () => {
    render(<QuoteRotator quotes={[]} onUpdate={noOp} />);
    expect(screen.getByTitle("인용구 편집")).toBeDefined();
  });

  it("should show the edit button when there is one quote", () => {
    render(<QuoteRotator quotes={["A"]} onUpdate={noOp} />);
    expect(screen.getByTitle("인용구 편집")).toBeDefined();
  });

  it("should show the edit button when there are multiple quotes", () => {
    render(<QuoteRotator quotes={["A", "B", "C"]} onUpdate={noOp} />);
    expect(screen.getByTitle("인용구 편집")).toBeDefined();
  });
});

describe("QuoteRotator edit mode", () => {
  it("should enter edit mode and show done button when edit button is clicked", () => {
    render(<QuoteRotator quotes={["A"]} onUpdate={noOp} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    expect(screen.getByText("완료")).toBeDefined();
  });

  it("should hide navigation buttons after entering edit mode", () => {
    render(<QuoteRotator quotes={["A", "B"]} onUpdate={noOp} />);
    // Nav buttons visible in view mode
    expect(screen.getByTitle("이전 인용구")).toBeDefined();
    fireEvent.click(screen.getByTitle("인용구 편집"));
    // Nav buttons gone in edit mode
    expect(screen.queryByTitle("이전 인용구")).toBeNull();
    expect(screen.queryByTitle("다음 인용구")).toBeNull();
  });

  it("should show rotation interval preset buttons in edit mode when onIntervalChange is provided", () => {
    render(<QuoteRotator quotes={["A"]} onUpdate={noOp} onIntervalChange={vi.fn()} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    expect(screen.getByText("5s")).toBeDefined();
    expect(screen.getByText("8s")).toBeDefined();
    expect(screen.getByText("15s")).toBeDefined();
    expect(screen.getByText("30s")).toBeDefined();
  });

  it("should not show rotation interval presets in edit mode when onIntervalChange is absent", () => {
    render(<QuoteRotator quotes={["A"]} onUpdate={noOp} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    expect(screen.queryByText("8s")).toBeNull();
  });

  it("should call onIntervalChange with the selected preset value when clicked", () => {
    const onIntervalChange = vi.fn();
    render(<QuoteRotator quotes={["A"]} onUpdate={noOp} onIntervalChange={onIntervalChange} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    fireEvent.click(screen.getByText("15s"));
    expect(onIntervalChange).toHaveBeenCalledWith(15);
  });

  it("should exit edit mode and restore view when done button is clicked", () => {
    render(<QuoteRotator quotes={["Test quote"]} onUpdate={noOp} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    expect(screen.getByText("완료")).toBeDefined();
    fireEvent.click(screen.getByText("완료"));
    // Back in view mode: edit button restored, done button gone
    expect(screen.queryByText("완료")).toBeNull();
    expect(screen.getByTitle("인용구 편집")).toBeDefined();
  });

  it("should show the new quote input field in edit mode", () => {
    render(<QuoteRotator quotes={["A"]} onUpdate={noOp} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    expect(screen.getByPlaceholderText("새 인용구 추가...")).toBeDefined();
  });
});

describe("QuoteRotator edit mode mutations", () => {
  it("should call onUpdate without the deleted quote when ✕ button is clicked", () => {
    const onUpdate = vi.fn();
    render(<QuoteRotator quotes={["First", "Second"]} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    const deleteButtons = screen.getAllByText("✕");
    fireEvent.click(deleteButtons[0]);
    expect(onUpdate).toHaveBeenCalledWith(["Second"]);
  });

  it("should call onUpdate with appended quote when + button is clicked with non-empty draft", () => {
    const onUpdate = vi.fn();
    render(<QuoteRotator quotes={["Existing"]} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    fireEvent.change(screen.getByPlaceholderText("새 인용구 추가..."), { target: { value: "New quote" } });
    fireEvent.click(screen.getByText("+"));
    expect(onUpdate).toHaveBeenCalledWith(["Existing", "New quote"]);
  });

  it("should NOT call onUpdate when + is clicked with whitespace-only draft", () => {
    const onUpdate = vi.fn();
    render(<QuoteRotator quotes={["Existing"]} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    fireEvent.change(screen.getByPlaceholderText("새 인용구 추가..."), { target: { value: "   " } });
    fireEvent.click(screen.getByText("+"));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("should call onUpdate with quotes swapped when ↑ button is clicked on second quote", () => {
    const onUpdate = vi.fn();
    render(<QuoteRotator quotes={["Alpha", "Beta"]} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTitle("인용구 편집"));
    // Two "위로 이동" buttons: first is disabled (idx=0), second is enabled (idx=1)
    const moveUpBtns = screen.getAllByTitle("위로 이동");
    fireEvent.click(moveUpBtns[1]);
    expect(onUpdate).toHaveBeenCalledWith(["Beta", "Alpha"]);
  });
});
