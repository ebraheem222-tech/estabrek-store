import { expect, test } from "@playwright/test";

test("the thirty-four references have unique real preview files and editable owned API imports", async ({ request }) => {
 const catalog=await (await request.get("/api/templates")).json();
 const refs=catalog.templates.filter((t:any)=>t.source);expect(refs).toHaveLength(34);
 expect(new Set(refs.map((t:any)=>t.preview)).size).toBe(34);
 for(const template of refs){
  const image=await request.get(template.preview);expect(image.ok(),template.id).toBe(true);expect(image.headers()["content-type"]).toContain("image/png");
  const imported=await(await request.get(`/api/templates/${template.id}`)).json();
  expect(imported.design.templateId).toBe(template.id);expect(JSON.stringify(imported.design.header)).toContain("{{store.name}}");
 }
});
test("Folio's nine complete panels navigate with controls, keyboard and editor reveal", async({page})=>{
 await page.goto("/en/design-frame?template=reference-folio-slideshow");
 const deck=page.locator('[data-presentation="deck"]');await expect(deck).toHaveAttribute("data-deck-ready","true");
 await expect(deck.locator('[data-deck-panel]')).toHaveCount(9);
 await page.getByRole("button",{name:"Next panel",exact:true}).click();await expect(deck).toHaveAttribute("data-deck-at","1");
 await deck.focus();await page.keyboard.press("End");await expect(deck).toHaveAttribute("data-deck-at","8");
 const target=await deck.locator('[data-deck-panel="4"] [data-tree-node]').first().getAttribute("data-tree-node");
 await page.evaluate(nodeId=>window.dispatchEvent(new CustomEvent("pt:reveal",{detail:{nodeId}})),target);await expect(deck).toHaveAttribute("data-deck-at","4");
 await page.getByRole("button",{name:"Contents",exact:true}).click();await expect(page.getByRole("navigation",{name:"Contents"})).toBeVisible();await page.keyboard.press("Escape");await expect(page.getByRole("navigation",{name:"Contents"})).toHaveCount(0);
});
test("Quantix native feature panels keep their chart contents and use keyboard tabs on mobile",async({page})=>{
 await page.goto("/en/design-frame?template=reference-quantix-saas");
 const deck=page.locator('[data-presentation="tabs"]').first();await expect(deck).toHaveAttribute("data-deck-ready","true");
 await expect(deck.getByRole("tab")).toHaveCount(5);
 await deck.getByRole("tab").nth(1).click();await expect(deck).toHaveAttribute("data-deck-at","1");await expect(deck.getByRole("tabpanel")).toBeVisible();
 await page.setViewportSize({width:390,height:844});await deck.getByRole("tab").nth(1).focus();await page.keyboard.press("ArrowRight");await expect(deck).toHaveAttribute("data-deck-at","2");
});
test("Split Index begins with a blank image canvas and piano songs remain visitor controlled",async({page})=>{
 await page.goto("/en/design-frame?template=reference-split-index");const gallery=page.locator('.pt-filter-gallery');
 await expect(gallery.locator('.pt-fg-preview img')).toHaveCount(0);await expect(gallery.locator('.pt-fg-count')).toHaveCount(0);await expect(gallery.locator('.pt-fg-filters')).toHaveCount(0);
 await gallery.locator('.pt-fg-select').first().focus();await expect(gallery.locator('.pt-fg-preview img')).toHaveCount(1);
 await page.goto("/ar/design-frame?template=reference-christmas-piano");
 const player=page.locator('[data-instrument="piano"]');await expect(player.locator('[data-instrument-sound]')).toHaveAttribute("aria-pressed","false");
 await expect(player.locator('[data-instrument-song] option')).toHaveCount(3);await player.locator('[data-instrument-song]').selectOption("silent");await expect(player.locator('[data-instrument-song]')).toHaveValue("silent");
 await player.locator('[data-instrument-play]').click();await expect(player.locator('[data-instrument-play]')).toHaveAttribute("aria-pressed","true");await player.locator('[data-instrument-stop]').click();await expect(player.locator('[data-instrument-play]')).toHaveAttribute("aria-pressed","false");
});
test("Celadon's six clay panels expand and vertical feature navigation adapts to mobile",async({page})=>{
 await page.goto("/en/design-frame?template=reference-celadon");
 const clay=page.locator('[data-look="clay"]');await expect(clay.locator('.pt-showcase-panel')).toHaveCount(6);
 await clay.locator('.pt-showcase-toggle').nth(2).click();await expect(clay.locator('.pt-showcase-panel').nth(2)).toHaveAttribute("data-expanded","true");
 await page.keyboard.press("ArrowRight");await expect(clay.locator('.pt-showcase-panel').nth(3)).toHaveAttribute("data-expanded","true");
 await page.goto("/en/design-frame?template=reference-novapay");const tabs=page.locator('[data-presentation="vertical-tabs"]');
 await expect(tabs.getByRole("tablist")).toHaveAttribute("aria-orientation","vertical");
 await page.setViewportSize({width:390,height:844});await expect(tabs.getByRole("tablist")).toHaveAttribute("aria-orientation","horizontal");
});
