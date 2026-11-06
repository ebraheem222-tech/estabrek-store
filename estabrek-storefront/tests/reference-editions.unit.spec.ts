import { expect, test } from "@playwright/test";
import { TEMPLATES, templatePage } from "../src/storeThemes/kits";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import { pageStructure, structuralShape, sharedStructure } from "./catalog-structure";

test("the expanded library offers 2000 independent editable designs while preserving existing IDs", () => {
  expect(TEMPLATES).toHaveLength(2000);
  expect(new Set(TEMPLATES.map(t => t.id)).size).toBe(2000);
  expect(TEMPLATES.filter(t => t.source)).toHaveLength(34);
  const editions = TEMPLATES.filter(t => "edition" in t);
  expect(editions).toHaveLength(963);
  for (const id of ["shoes-street", "fashion-boutique", "electronics-foundry", "reference-split-index", "reference-celadon"]) {
    expect(TEMPLATES.some(t => t.id === id), id).toBe(true);
  }
});

for (const demo of [true, false]) test(`generated ${demo ? "preview" : "installed"} designs differ beyond colour, content and section order`, () => {
  const editions = TEMPLATES.filter(t => "edition" in t);
  expect(editions.length).toBeGreaterThan(900);
  const seen = new Map<string, string>();
  const coarse = new Map<string, string>();
  const known: Array<{id: string; parts: string[]}> = [];
  const collisions: string[] = [];
  for (const tpl of TEMPLATES) {
    const page = templatePage(tpl.id, "home", demo)!;
    const home = demo ? page.slice(1, -1) : page;
    const shape = pageStructure(home), primitive = pageStructure(home, true);
    if ("edition" in tpl) {
      if (seen.has(shape)) collisions.push(`${tpl.id} duplicates ${seen.get(shape)}`);
      if (coarse.has(primitive)) collisions.push(`${tpl.id} repeats the primitive tree of ${coarse.get(primitive)}`);
      const parts = home.map(s => structuralShape(s));
      for (const prior of known) if (sharedStructure(parts, prior.parts) > 2 / 3) collisions.push(`${tpl.id} shares too many complete sections with ${prior.id}`);
    }
    seen.set(shape, tpl.id); coarse.set(primitive, tpl.id);
    known.push({id: tpl.id, parts: home.map(s => structuralShape(s))});
  }
  expect(collisions.slice(0, 20)).toEqual([]);
});

test("generated imports have detached customer branding and unique IDs across all regions", () => {
  const editions = TEMPLATES.filter(t => "edition" in t);
  expect(editions.length).toBeGreaterThan(900);
  const walk = (nodes: any[]): any[] => nodes.flatMap(n => [n, ...walk(n.children ?? [])]);
  for (const template of editions.filter((_, i) => i % 29 === 0)) {
    const imported = importDesign(template.id)!;
    const nodes = walk([...imported.sections, imported.design.header.root, imported.design.footer.root]);
    // The two independent page roots have reserved "page" IDs; generated element IDs must be unique.
    const ids = nodes.filter(n => n.type !== "page").map(n => n.id);
    expect(new Set(ids).size, template.id).toBe(ids.length);
    expect(JSON.stringify(imported.design.header), template.id).toContain("{{store.name}}");
    imported.sections[0].props.changed = true;
    expect(importDesign(template.id)!.sections[0].props).not.toHaveProperty("changed");
  }
});

test("generated pages never keep fragment links to discarded source sections", () => {
  const problems:string[]=[];
  const walk=(nodes:any[]):any[]=>nodes.flatMap(n=>[n,...walk(n.children??[])]);
  const hrefs=(value:any):string[]=>!value||typeof value!=="object"?[]:Object.entries(value).flatMap(([key,v])=>key==="href"&&typeof v==="string"?[v]:hrefs(v));
  for(const template of TEMPLATES.filter(t=>t.edition)){
    const imported=importDesign(template.id)!;
    const nodes=walk([...imported.sections,...imported.design.header.root.children!,...imported.design.footer.root.children!]);
    const anchors=new Set(nodes.map(n=>n.props.anchor));
    for(const href of nodes.flatMap(n=>hrefs(n.props))) if(href.startsWith("#")&&href!=="#"&&!anchors.has(href.slice(1))) problems.push(`${template.id}: ${href}`);
  }
  expect(problems).toEqual([]);
  const content=JSON.stringify(importDesign("edition-578-01"));
  expect(content).not.toContain('"href":"#projects"');
  expect(content).toContain('"href":"/shop"');
});
