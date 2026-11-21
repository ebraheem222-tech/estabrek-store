// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { TemplateThumb, css } from "./TemplateThumb";
import { ROSE_COLOURS } from "./templates/colours";
import { buildTemplate } from "./templates/catalog";

// The gallery's small pictures draw what makes a look a look (studio/templates/dna): its faces, letters painted
// or outlined, hard shadows, toned and cut pictures, patterns and meshes.
afterEach(cleanup);
const n = (type: string, base: Record<string, unknown>, props: Record<string, unknown> = {}): PageTreeNode =>
  ({ id: type, type, props, style: { base } }) as PageTreeNode;

test("a look's features reach the small picture's style", () => {
  const head = css(n("heading", { font: "serif", caps: "upper", color: "transparent", stroke: { width: 2, color: "text" }, shadows: [{ x: 0, y: 0, blur: 28, color: "accent" }], decoration: { line: "underline", color: "accent", width: 4, offset: 16 } }), ROSE_COLOURS);
  expect(head.fontFamily).toContain("serif");
  expect(head.textTransform).toBe("uppercase");
  expect(head.WebkitTextStroke).toBe(`2px ${ROSE_COLOURS.text}`);
  expect(head.textShadow).toBe(`0px 0px 28px ${ROSE_COLOURS.accent}`);
  expect(head.textDecorationLine).toBe("underline");
  const ground = css(n("section", { bg: "surface", mesh: { colors: ["accent-soft", "surface"] }, pattern: { kind: "grid", color: "accent", size: 40, opacity: 0.1 } }), ROSE_COLOURS);
  expect(String(ground.background)).toMatch(/linear-gradient.*radial-gradient.*, #[0-9a-f]+$/i);
  const pic = css(n("image", { shape: "slant", shade: { x: 14, y: 14, blur: 0, color: "accent" }, shadow: "lg", filters: { gray: 1 }, rotateZ: -3 }), ROSE_COLOURS, true);
  expect(pic.clipPath).toContain("polygon");
  // In right-to-left the hard shadow falls to the other side, as the shop draws it.
  expect(pic.boxShadow).toContain(`-14px 14px 0px ${ROSE_COLOURS.accent}`);
  expect(pic.filter).toBe("grayscale(1)");
  expect(pic.transform).toContain("rotate(-3deg)");
});

test("a design from the section DNA draws without throwing, its words in place", () => {
  const { container } = render(<TemplateThumb build={() => buildTemplate("s:dna-hero-center-neon:dark", { ids: (p) => `${p}-${Math.random()}`, fam: "fashion", lang: "en" })} colours={ROSE_COLOURS} lang="en" width={300} />);
  expect(container.textContent).toContain("Style that speaks for you");
});
