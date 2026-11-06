import { expect, test, type Page } from "@playwright/test";

const API = "http://127.0.0.1:4100";
const send = (page: Page, message: object) => page.evaluate(value => (window as any).send(value), message);

for (const engine of ["gsap", "anime"]) {
  test(`${engine}: clearing a running loop and hover restores rest without reloading the preview`, async ({ page }) => {
    const content = (motion = true) => ({ pageId: "motion-toggle", sections: [], rev: motion ? 1 : 2, updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [
      { id: "motions", type: "section", props: {}, children: [
        { id: "loop", type: "heading", props: { text: { en: "Loop" } }, ...(motion ? { motion: { engine, loop: { kind: "float", duration: 0.6 } } } : {}) },
        { id: "hover", type: "heading", props: { text: { en: "Hover" } }, ...(motion ? { motion: { engine, hover: { kind: "lift", amount: 2 } } } : {}) },
        { id: "spring", type: "heading", props: { text: { en: "Spring" } }, ...(motion ? { motion: { engine, hover: { kind: "jelly", amount: 2 } } } : {}) },
      ] },
    ] } } });
    await page.request.post(`${API}/__test/preview-draft`, { data: content() });
    await page.goto(`${API}/__studio-harness?src=${encodeURIComponent("/studio-frame?token=good-draft")}`);
    const frame = page.frameLocator("#f");
    const loop = frame.locator('[data-tree-node="loop"]');
    const hover = frame.locator('[data-tree-node="hover"]');
    const spring = frame.locator('[data-tree-node="spring"]');
    await expect(loop).toHaveAttribute("data-pt-engine", engine);
    await loop.evaluate(el => { (window as any).__motionToggleDocument = "same-document"; (window as any).__motionToggleElement = el; });
    const value = (node: typeof loop, name: string) => node.evaluate((el, key) => Number.parseFloat((el as HTMLElement).style.getPropertyValue(key)) || 0, name);
    await send(page, { type: "motionLive", on: true });
    await expect.poll(() => value(loop, "--pt-ly")).toBeLessThan(-1);
    await hover.dispatchEvent("pointerenter");
    await expect.poll(() => value(hover, "--pt-hy")).toBeLessThan(-2);
    await spring.dispatchEvent("pointerenter");
    await expect.poll(() => value(spring, "--pt-hs")).toBeGreaterThan(1.05);
    await page.request.post(`${API}/__test/preview-draft`, { data: content(false) });
    await send(page, { type: "refreshView", requestId: `clear-${engine}` });
    await expect(loop).not.toHaveAttribute("data-pt-motion");
    await expect(hover).not.toHaveAttribute("data-pt-motion");
    await expect(spring).not.toHaveAttribute("data-pt-motion");
    await expect.poll(() => value(loop, "--pt-ly")).toBe(0);
    await expect.poll(() => value(hover, "--pt-hy")).toBe(0);
    await expect.poll(() => spring.evaluate(el => (el as HTMLElement).style.getPropertyValue("--pt-hs"))).toBe("");
    await hover.dispatchEvent("pointerenter");
    await spring.dispatchEvent("pointerenter");
    await page.waitForTimeout(450);
    expect(await value(loop, "--pt-ly")).toBe(0);
    expect(await value(hover, "--pt-hy")).toBe(0);
    expect(await spring.evaluate(el => (el as HTMLElement).style.getPropertyValue("--pt-hs"))).toBe("");
    expect(await loop.evaluate(el => ({ document: (window as any).__motionToggleDocument, sameElement: (window as any).__motionToggleElement === el }))).toEqual({ document: "same-document", sameElement: true });
  });
}
