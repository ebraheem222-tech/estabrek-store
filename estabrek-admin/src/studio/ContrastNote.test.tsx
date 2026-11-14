// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { contrast, neededContrast, readableColour } from "../../../shared/colour";
import { setLangForTests } from "../lib/lang";
import { ContrastNote, contrastVerdict } from "./ContrastNote";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

test("what words need to read: 4.5, or 3 when they are big or big and bold", () => {
  expect(neededContrast(16, false)).toBe(4.5);
  expect(neededContrast(16, true)).toBe(4.5);
  expect(neededContrast(18.66, false)).toBe(4.5);
  expect(neededContrast(18.66, true)).toBe(3);
  expect(neededContrast(24, false)).toBe(3);
  expect(neededContrast(60, true)).toBe(3);
});

test("the nearest colour of the same hue that reads on a ground", () => {
  // Already reading: left as it is.
  expect(readableColour("#1d1a1f", "#fbf7f4", 4.5)).toBe("#1d1a1f");
  // A pale rose on paper is darkened until it reads, and no further than it must be.
  const rose = readableColour("#e8b7cf", "#fbf7f4", 4.5)!;
  expect(contrast(rose, "#fbf7f4")!).toBeGreaterThanOrEqual(4.5);
  expect(contrast(rose, "#fbf7f4")!).toBeLessThan(5.2);
  // On a dark ground a dark colour is lightened instead.
  const onInk = readableColour("#3a2030", "#1d1a1f", 4.5)!;
  expect(contrast(onInk, "#1d1a1f")!).toBeGreaterThanOrEqual(4.5);
  expect(contrast(onInk, "#ffffff")!).toBeLessThan(contrast("#3a2030", "#ffffff")!);
  // A lower need is a smaller move.
  const big = readableColour("#e8b7cf", "#fbf7f4", 3)!;
  expect(contrast(big, "#fbf7f4")!).toBeGreaterThanOrEqual(3);
  expect(contrast(big, "#fbf7f4")!).toBeLessThan(contrast(rose, "#fbf7f4")!);
  // On a middle grey one of black or white always gets there.
  for (const ground of ["#808080", "#767676", "#959595", "#5f5f5f"]) expect(contrast(readableColour("#808080", ground, 4.5)!, ground)!).toBeGreaterThanOrEqual(4.5);
  expect(readableColour("rose", "#ffffff", 4.5)).toBeNull();
  expect(readableColour("#e8b7cf", "paper", 4.5)).toBeNull();
});

test("the verdict on what the shop says of the words", () => {
  expect(contrastVerdict(null)).toBeNull();
  expect(contrastVerdict({ unknown: "picture" })).toBeNull();
  // Dark ink on paper: it reads, nothing better to offer.
  expect(contrastVerdict({ color: "#1d1a1f", ground: "#fbf7f4", size: 16, bold: false })).toMatchObject({ ok: true, need: 4.5, better: null });
  // A pale rose: it doesn't, and a colour that would is offered.
  const pale = contrastVerdict({ color: "#e8b7cf", ground: "#fbf7f4", size: 16, bold: false })!;
  expect(pale.ok).toBe(false);
  expect(pale.ratio).toBeLessThan(2);
  expect(contrast(pale.better!, "#fbf7f4")!).toBeGreaterThanOrEqual(4.5);
  // The same rose as a big heading needs less: the store's own rose at 3.3 passes as big words, fails as small.
  expect(contrastVerdict({ color: "#c86b98", ground: "#fbf7f4", size: 40, bold: true })).toMatchObject({ ok: true, need: 3 });
  expect(contrastVerdict({ color: "#c86b98", ground: "#fbf7f4", size: 16, bold: false })).toMatchObject({ ok: false, need: 4.5 });
});

test("the note: quiet when the words read, a warning with a way out when they don't", () => {
  setLangForTests("en");
  const onFix = vi.fn();
  const { rerender } = render(<ContrastNote ink={{ color: "#1d1a1f", ground: "#fbf7f4", size: 16, bold: false }} busy={false} onFix={onFix} />);
  expect(screen.getByTestId("studio-contrast").dataset.ok).toBe("1");
  expect(screen.getByTestId("studio-contrast").textContent).toContain("read well");
  expect(screen.queryByTestId("studio-contrast-fix")).toBeNull();

  rerender(<ContrastNote ink={{ color: "#e8b7cf", ground: "#fbf7f4", size: 16, bold: false }} busy={false} onFix={onFix} />);
  const note = screen.getByTestId("studio-contrast");
  expect(note.dataset.ok).toBe("0");
  expect(note.textContent).toContain("hard to read");
  expect(note.textContent).toContain("at least 4.5");
  fireEvent.click(screen.getByTestId("studio-contrast-fix"));
  const fixed = onFix.mock.lastCall![0] as string;
  expect(fixed).toMatch(/^#[0-9a-f]{6}$/);
  expect(contrast(fixed, "#fbf7f4")!).toBeGreaterThanOrEqual(4.5);

  // Big words: the lower need is said.
  rerender(<ContrastNote ink={{ color: "#e8b7cf", ground: "#fbf7f4", size: 40, bold: false }} busy={false} onFix={onFix} />);
  expect(screen.getByTestId("studio-contrast").textContent).toContain("at least 3 (big text)");
  // Where the colour isn't this element's own to change (a button's): the warning, without the way out.
  rerender(<ContrastNote ink={{ color: "#e8b7cf", ground: "#fbf7f4", size: 16, bold: false }} busy={false} />);
  expect(screen.getByTestId("studio-contrast").dataset.ok).toBe("0");
  expect(screen.queryByTestId("studio-contrast-fix")).toBeNull();
  // Over a picture or a gradient: said, not judged. A colour it can't read, or nothing: no note.
  rerender(<ContrastNote ink={{ unknown: "picture" }} busy={false} onFix={onFix} />);
  expect(screen.getByTestId("studio-contrast").dataset.ok).toBe("unknown");
  rerender(<ContrastNote ink={{ unknown: "colour" }} busy={false} onFix={onFix} />);
  expect(screen.queryByTestId("studio-contrast")).toBeNull();
  rerender(<ContrastNote ink={null} busy={false} onFix={onFix} />);
  expect(screen.queryByTestId("studio-contrast")).toBeNull();
});
