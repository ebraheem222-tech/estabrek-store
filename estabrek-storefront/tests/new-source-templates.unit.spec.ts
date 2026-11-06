import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { kitCtx, t, type Node } from "../src/storeThemes/kits/tree";
import { withStyle } from "../src/storeThemes/kits/lib";
import type { Template } from "../src/storeThemes/kits/templates/types";

const sources = [576,577,578,579,582,583,584,586,587,588,589,590,591,592,594];
const file = path.resolve("src/storeThemes/kits/templates/referenceTemplatesD.ts");
const load = async (): Promise<Template[]> => existsSync(file) ? (await import("../src/storeThemes/kits/templates/referenceTemplatesD")).REFERENCE_TEMPLATES_D : [];
const flatten = (nodes: Node[]): Node[] => nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
const body = (template: Template, demo = true) => template.home(withStyle(kitCtx({}, demo), template.style));
const shape = (node: Node): unknown => [node.type, (node.children ?? []).map(shape)];

test("fifteen new references retain independent editable source identities", async () => {
  const templates = await load();
  expect(templates).toHaveLength(15);
  expect(templates.map(x => x.source!.number).sort((a,b) => a-b)).toEqual(sources);
  expect(new Set(templates.map(x => x.id)).size).toBe(15);
  const shapes: string[] = [];
  for (const template of templates) {
    const sections = body(template), nodes = flatten(sections);
    expect(sections.length, template.id).toBeGreaterThanOrEqual(6);
    expect(nodes.length, template.id).toBeGreaterThanOrEqual(50);
    expect(nodes.filter(x => x.type === "heading").length, template.id).toBeGreaterThanOrEqual(6);
    expect(nodes.some(x => ["iframe", "html", "legacy", "roseBlock"].includes(x.type)), template.id).toBe(false);
    const anchors = new Set(nodes.map(x => x.props.anchor));
    for (const node of nodes) {
      const items = Array.isArray(node.props.items) ? node.props.items : [];
      for (const href of [node.props.href, ...items.map((x: any) => x.href)])
        if (typeof href === "string" && href.startsWith("#")) expect(anchors.has(href.slice(1)), `${template.id}: ${href}`).toBe(true);
    }
    shapes.push(JSON.stringify(sections.map(shape)));
    const k = withStyle(kitCtx({}, false), template.style);
    for (const region of [template.regions!.header(k, t("{{store.name}}")), template.regions!.footer(k, t("{{store.name}}"))])
      expect(JSON.stringify(region), template.id).toContain("{{store.name}}");
    expect(JSON.stringify(template.regions!.footer(k, t("Brand"))), template.id).toContain(`https://templatemo.com/tm-${template.source!.number}-`);
  }
  expect(new Set(shapes).size).toBe(15);
});

test("all source photographs are local, present and belong to the same reference", async () => {
  const templates = await load();
  expect(templates).toHaveLength(15);
  for (const template of templates) {
    const images = flatten(body(template)).filter(x => x.type === "image");
    if (template.source!.number !== 594) expect(images.length, template.id).toBeGreaterThanOrEqual(1);
    for (const image of images) {
      expect(image.props.src, template.id).toMatch(new RegExp(`^/templates/references/${template.source!.number}/`));
      expect(existsSync(path.join(process.cwd(), "public", image.props.src as string)), `${template.id}: ${image.props.src}`).toBe(true);
    }
  }
  const manifest = JSON.parse(readFileSync("public/templates/references/provenance.json", "utf8"));
  expect(sources.every(n => manifest.some((entry: any) => entry.number === n))).toBe(true);
});

test("new reusable blocks are used in their intended native compositions", async () => {
  const templates = await load();
  expect(templates).toHaveLength(15);
  for (const [number,type] of [[583,"schedule"],[586,"schedule"],[587,"comparison"],[588,"deck"],[590,"deck"]] as const) {
    const template = templates.find(x => x.source!.number === number)!;
    const nodes = flatten(body(template));
    expect(nodes.some(x => x.type === type), template.id).toBe(true);
  }
  expect(flatten(body(templates.find(x => x.source!.number === 594)!)).some(x => (x.props.scene as {kind?:string})?.kind === "matrix")).toBe(true);
  const video=flatten(body(templates.find(x=>x.source!.number===583)!)).find(x=>x.type==="video");
  expect(video?.props).toMatchObject({autoplay:true,muted:true,loop:true,controls:false});
  expect(video?.style?.base?.overlay).toMatchObject({color:"#000000",opacity:.6});
  for (const template of templates) {
    const live = JSON.stringify(body(template, false));
    expect(live, template.id).not.toMatch(/\$\d|4\.9|4\.8|1\.25 ETH|24\/7/);
  }
});
