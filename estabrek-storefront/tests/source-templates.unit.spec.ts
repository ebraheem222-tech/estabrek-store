import { expect, test } from "@playwright/test";
import { TEMPLATES, templateById, templatePage, type KitNode } from "../src/storeThemes/kits";
import { importDesign } from "../src/storeThemes/kits/importDesign";

const SOURCES = [597,598,599,601,602,604,605,606,614,615,616,617,618,619,621,622,623,625,633];
const all = (nodes: KitNode[]): KitNode[] => nodes.flatMap(node => [node, ...all(node.children ?? [])]);
test("nineteen supplied references are complete separate templates in the store library", () => {
  const references = TEMPLATES.filter(template => template.source && SOURCES.includes(template.source.number));
  expect(TEMPLATES).toHaveLength(2000);
  expect(references).toHaveLength(19);
  expect(references.map(template => template.source!.number).sort((a,b)=>a-b)).toEqual(SOURCES);
  for (const template of references) {
    expect(template.preview, template.id).toBe(`/templates/references/previews/${template.source!.number}.png`);
    const nodes = all(templatePage(template.id)!);
    expect(nodes.filter(node => node.type === "heading").length, template.id).toBeGreaterThanOrEqual(4);
    expect(nodes.length, template.id).toBeGreaterThan(35);
    const content = JSON.stringify(nodes);
    expect(content, template.id).not.toMatch(/\/templates\/experimental\/|\/templates\/photo-\d|kinetic-\d\.svg/);
    expect(nodes.some(node => ["legacy", "roseBlock", "block"].includes(node.type)), template.id).toBe(false);
    expect(template.regions, template.id).toBeTruthy();
    const imported = importDesign(template.id)!;
    expect(JSON.stringify(imported.design.header)).toContain("{{store.name}}");
    expect(JSON.stringify(imported.design.footer)).toContain("{{store.name}}");
    imported.design.header.root.props.ownerChanged = true;
    expect(importDesign(template.id)!.design.header.root.props).not.toHaveProperty("ownerChanged");
  }
});

test("the original thousand and three templates keep their IDs", () => {
  expect(TEMPLATES.filter(template => !template.source && !template.edition)).toHaveLength(1003);
  for (const id of ["shoes-street", "fashion-boutique", "home-lantern", "art-kinetic", "electronics-foundry"]) expect(templateById(id)).toBeTruthy();
});
test("source imports keep region and body style identities separate, and local navigation exists",()=>{
 const missing:string[]=[];
 for(const template of TEMPLATES.filter(t=>t.source)){
  const imported=importDesign(template.id)!;
  const nodes=all([...imported.sections,...imported.design.header.root.children!,...imported.design.footer.root.children!]);
  const ids=nodes.map(node=>node.id);expect(new Set(ids).size,template.id).toBe(ids.length);
  const preview=all(templatePage(template.id,"home",true)!);
  const anchors=new Set(preview.map(node=>node.props.anchor));
  for(const node of preview){
   const hrefs=[node.props.href,...(Array.isArray(node.props.items)?node.props.items.map((item:any)=>item.href):[])];
   for(const href of hrefs)if(typeof href==="string"&&href.startsWith("#")&&href!=="#"&&!anchors.has(href.slice(1)))missing.push(`${template.id}: ${href}`);
  }
 }
 expect(missing).toEqual([]);
});
