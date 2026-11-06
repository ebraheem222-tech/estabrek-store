import { expect, test } from "@playwright/test";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sources = [
  [576,"snapx-photography"],[577,"liberty-market"],[578,"first-portfolio"],[579,"cyborg-gaming"],[582,"tale-seo-agency"],
  [583,"festava-live"],[584,"pod-talk"],[586,"scholar"],[587,"tiya-golf-club"],[588,"ebook-landing"],[589,"lugx-gaming"],
  [590,"topic-listing"],[591,"villa-agency"],[592,"glossy-touch"],[594,"nexus-flow"],
] as const;

for (const width of [1440,390]) for (const [number,slug] of sources) test(`${slug} is usable at ${width}px with its own media`, async ({page}) => {
  const errors:string[]=[]; page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:"reduce"});
  const response=await page.goto(`/en/design-frame?template=reference-${slug}&motionPreset=none`,{waitUntil:"networkidle"});
  expect(response?.ok()).toBe(true);
  await expect(page.locator("h1").first()).toBeVisible();
  await page.locator("img").evaluateAll(images=>images.forEach(image=>image.loading="eager"));
  await expect.poll(()=>page.locator("img").evaluateAll(images=>images.filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.getAttribute("src"))),{timeout:15000}).toEqual([]);
  const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,screen:innerWidth}));
  expect(overflow.page,JSON.stringify(overflow)).toBeLessThanOrEqual(width+1);
  expect(errors).toEqual([]);
  if(width===1440){
    const directory=fileURLToPath(new URL("../public/templates/references/previews/",import.meta.url));mkdirSync(directory,{recursive:true});
    await page.screenshot({path:path.join(directory,`${number}.png`)});
  }
});

test("the public catalog exposes generated provenance and gives editions their own tree previews",async({request})=>{
  const response=await request.get("/api/templates");expect(response.ok()).toBe(true);
  const data=await response.json();expect(data.templates).toHaveLength(2000);
  expect(data.templates.filter((t:any)=>t.source)).toHaveLength(34);
  const editions=data.templates.filter((t:any)=>t.edition);expect(editions).toHaveLength(963);
  for(const item of [editions[0],editions[editions.length-1]]){
    expect(item.preview).toBeUndefined();
    const preview=await request.get(`/api/templates/${item.id}?view=thumbnail`);expect(preview.ok()).toBe(true);
    const imported=await request.get(`/api/templates/${item.id}`);expect(imported.ok()).toBe(true);
    const own=await imported.json();expect(own.design.templateId).toBe(item.id);
    expect(JSON.stringify(own.design.header)).toContain("{{store.name}}");
  }
});

test("new reference interactions work in the real storefront renderer",async({page})=>{
  await page.goto("/en/design-frame?template=reference-festava-live&motionPreset=none");
  const schedule=page.locator('[data-schedule-layout="table"]');
  await schedule.getByRole("button",{name:"Day two",exact:true}).click();
  await expect(schedule.getByRole("row")).toHaveCount(3);
  await schedule.getByRole("button",{name:"All days",exact:true}).click();
  await expect(schedule.getByRole("row")).toHaveCount(5);
  await page.goto("/ar/design-frame?template=reference-tiya-golf-club&motionPreset=none");
  await expect(page.getByRole("table").getByRole("columnheader")).toHaveCount(4);
  await page.goto("/en/design-frame?template=reference-ebook-landing&motionPreset=none");
  const deck=page.locator('[data-presentation="vertical-tabs"]');
  await expect(deck).toHaveAttribute("data-deck-ready","true");
  await deck.getByRole("tab").nth(1).click();await expect(deck).toHaveAttribute("data-deck-at","1");
  await page.goto("/en/design-frame?template=reference-nexus-flow&motionPreset=none");
  await expect(page.locator("canvas").first()).toBeVisible();
});
