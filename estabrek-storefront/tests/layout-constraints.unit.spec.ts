import { expect, test,chromium } from "@playwright/test";
import { geometryPreviewCss } from "../src/pageTree/geometryPreview";
import { BASE_CSS,declarations, nodeCss } from "../src/pageTree/css";
import type { ScreenStyle, TreeNode } from "../src/pageTree/tree";

const node = (style: TreeNode["style"]): TreeNode => ({ id: "card", type: "stack", props: {}, style });
const rules = (css: string) => [...css.matchAll(/\.pt-card\{([^}]*)\}/g)].map(match => Object.fromEntries(match[1].split(";").map(decl => decl.split(":"))));

test("six-decimal analytic sizes are rendered in saved and temporary geometry",()=>{
 expect(declarations({width:"259.123455px",height:"124.181898px"},"image")).toEqual(expect.arrayContaining(["width:259.123455px","height:124.181898px"]));
 expect(geometryPreviewCss([{...node({base:{width:"259.123455px"}}),type:"image"}])).toContain("width:259.123455px");
});

test("required ratios survive definite dimensions, responsive overrides and tall content in a real browser",async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const css=nodeCss(node({base:{width:"300px",height:"100px",constraints:{aspectRatio:2,minHeight:40,maxHeight:200}},tablet:{width:"250px",height:"70px"},mobile:{width:"180px",height:"60px"}}),"card");
  await page.setContent(`<style>.pt{box-sizing:border-box}${css}</style><div class="pt pt-stack pt-card"><div style="height:500px">Content</div></div>`);
  for(const width of [1200,800,400]){await page.setViewportSize({width,height:800});const size=await page.locator('.pt-card').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));expect(size.w/size.h).toBeCloseTo(2,5);expect(size.h).toBeGreaterThanOrEqual(40);expect(size.h).toBeLessThanOrEqual(200);}
 }finally{await browser.close();}
});

test("an image's required bounds and ratio beat the structural cell defaults",async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{const page=await browser.newPage();const css=nodeCss({...node({base:{width:"600px",height:"100px",constraints:{aspectRatio:2,maxWidth:200,maxHeight:100}}}),type:"image"},"card");
  await page.setContent(`<style>${BASE_CSS}${css}</style><div class="pt-cell" style="width:800px"><img class="pt pt-image pt-card" alt="fixture" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='100'/%3E"></div>`);
  const size=await page.locator('.pt-card').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));expect(size.w).toBeCloseTo(200);expect(size.h).toBeCloseTo(100);
 }finally{await browser.close();}
});

test("dimension bounds and required ratio coexist with the existing size and look controls", () => {
  const result = declarations({ width: "200px", height: "100px", maxWidth: "80%", minHeight: "50px", aspect: "3 / 2", gap: 12, color: "accent", constraints: { minWidth: 80, maxWidth: 400, minHeight: 40, maxHeight: 600, aspectRatio: 2 } }, "stack");
  expect(result).toEqual(expect.arrayContaining(["width:200px", "height:100px", "gap:12px", "color:var(--accent)", "min-width:80px", "max-width:400px", "min-height:40px", "max-height:600px", "aspect-ratio:2"]));
  expect(Object.fromEntries(result.map(decl => decl.split(":")))).toMatchObject({ "max-width": "400px", "min-height": "40px", "aspect-ratio": "2" });
});

test("partial responsive constraints inherit across both breakpoints and beat unrelated dimension controls", () => {
  const css = nodeCss(node({
    base: { constraints: { minWidth: 80, maxWidth: 600, minHeight: 40, aspectRatio: 2 } },
    tablet: { constraints: { maxWidth: 400 }, minHeight: "10px" },
    mobile: { constraints: { maxHeight: 300 }, maxWidth: "100%", aspect: "1 / 1" },
  }), "card");
  const [base, tablet, mobile] = rules(css);
  expect(base).toMatchObject({ "min-width": "80px", "max-width": "600px", "min-height": "40px", "aspect-ratio": "2" });
  expect(tablet).toMatchObject({ "min-width": "80px", "max-width": "400px", "min-height": "40px", "aspect-ratio": "2" });
  expect(mobile).toMatchObject({ "min-width": "80px", "max-width": "400px", "min-height": "40px", "max-height": "300px", "aspect-ratio": "2" });
});

test("removing bounds regenerates CSS without stale restrictions or erasing existing size settings", () => {
  expect(rules(nodeCss(node({ base: { maxWidth: "70%", minHeight: "50px", constraints: { maxWidth: 400, minHeight: 80 } } }), "card"))[0]).toMatchObject({ "max-width": "400px", "min-height": "80px" });
  const reset = rules(nodeCss(node({ base: { maxWidth: "70%", minHeight: "50px", constraints: {} } }), "card"))[0];
  expect(reset).toMatchObject({ "max-width": "70%", "min-height": "50px" });
  expect(reset["min-width"]).toBeUndefined();
  expect(reset["max-height"]).toBeUndefined();
  // An empty mobile override restores the inherited bound, not an unconstrained size.
  expect(rules(nodeCss(node({ base: { constraints: { maxWidth: 600 } }, tablet: { constraints: { maxWidth: 400 } }, mobile: { constraints: {} } }), "card"))[2]["max-width"]).toBe("400px");
});

test("malformed saved constraint data cannot inject CSS or replace valid inherited bounds", () => {
  for (const constraints of [null, [], "min-width:0;color:red", { minWidth: "80px;color:red", maxWidth: Infinity, minHeight: 7, maxHeight: 10000, aspectRatio: 0 }, { minWidth: NaN, aspectRatio: 101 }]) {
    expect(declarations({ constraints } as unknown as ScreenStyle, "stack")).toEqual([]);
  }
  const css = nodeCss(node({ base: { constraints: { maxWidth: 600 } }, tablet: { constraints: { maxWidth: "0;color:red" } as unknown as ScreenStyle["constraints"] }, mobile: { maxWidth: "100%" } }), "card");
  const [, tablet, mobile] = rules(css);
  expect(tablet["max-width"]).toBe("600px");
  expect(mobile["max-width"]).toBe("600px");
  expect(css).not.toContain("color:red");
});
