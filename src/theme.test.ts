// ABOUTME: Tests for theme.ts design tokens — readability constraints for transparent dark widget
// ABOUTME: Verifies text color alpha values are locked to designer-approved values for white desktop background

import { describe, it, expect } from "vitest";
import { colors } from "./theme";

function parseAlpha(rgba: string): number {
  const match = rgba.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  if (!match) throw new Error(`Not a valid rgba string: ${rgba}`);
  return parseFloat(match[1]);
}

describe("colors text tokens — designer-approved readability values (Issue #26)", () => {
  it("shouldPreserveAlphaWhenTextMidIsRendered", () => {
    expect(parseAlpha(colors.textMid)).toBe(0.72);
  });

  it("shouldPreserveAlphaWhenTextLowIsRendered", () => {
    expect(parseAlpha(colors.textLow)).toBe(0.65);
  });

  it("shouldPreserveAlphaWhenTextMutedIsRendered", () => {
    expect(parseAlpha(colors.textMuted)).toBe(0.62);
  });

  it("shouldPreserveAlphaWhenTextFaintIsRendered", () => {
    expect(parseAlpha(colors.textFaint)).toBe(0.55);
  });

  it("shouldPreserveAlphaWhenTextDimIsRendered", () => {
    expect(parseAlpha(colors.textDim)).toBe(0.50);
  });

  it("shouldPreserveAlphaWhenTextSubtleIsRendered", () => {
    expect(parseAlpha(colors.textSubtle)).toBe(0.44);
  });

  it("shouldPreserveAlphaWhenTextGhostIsRendered", () => {
    expect(parseAlpha(colors.textGhost)).toBe(0.36);
  });

  it("shouldPreserveAlphaWhenTextPhantomIsRendered", () => {
    expect(parseAlpha(colors.textPhantom)).toBe(0.30);
  });

  it("shouldPreserveAlphaWhenTextLabelIsRendered", () => {
    expect(parseAlpha(colors.textLabel)).toBe(0.24);
  });
});
