// ABOUTME: Unit tests for QuoteRotator component rendering behavior
// ABOUTME: Covers N/M position indicator visibility based on quote count

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteRotator } from "./QuoteRotator";

const noOp = () => {};

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
