import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { withMotionProfile } from "../../../shared/motionProfiles";
import path from "node:path";
import { pathToFileURL } from "node:url";

const home = () => [{ id: "s", type: "section", props: { contained: true }, children: [
  { id: "title", type: "heading", props: { text: { ar: "عنوان", en: "Title", he: "כותרת" }, level: 1 }, motion: { enter: { kind: "up", duration: 1 }, loop: { kind: "float" } } },
  { id: "photo", type: "image", props: { src: "/templates/fashion/hero.svg" } },
] }];
const tree = (children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children } });

describe("copied motion profiles", () => {
  test("an unconfigured import remains equal and detached from its source", () => {
    const source = home();
    const result = withMotionProfile(source);
    expect(result).toEqual(source);
    expect(result).not.toBe(source);
    expect(result[0].children).not.toBe(source[0].children);
  });
  test("engine selection retains original timing and affects existing motion only", () => {
    const source = home();
    const result = withMotionProfile(source, { engine: "anime", preset: "original" });
    expect(result[0].children![0].motion).toEqual({ ...source[0].children[0].motion, engine: "anime" });
    expect(result[0].children![1]).not.toHaveProperty("motion");
    expect(source[0].children[0].motion).not.toHaveProperty("engine");
  });
  test("calm and rich profiles produce valid editable motion in either engine", () => {
    for (const engine of ["gsap", "anime"] as const) for (const preset of ["calm", "rich"] as const) {
      const result = withMotionProfile(home(), { engine, preset });
      expect(result[0].children![1]).toHaveProperty("motion.engine", engine);
      expect(result[0].children![0]).toHaveProperty("motion.enter");
      expect(checkTree(tree(result)).ok).toBe(true);
    }
  });
  test("none removes movements recursively without removing merchant content", () => {
    const source = home();
    const result = withMotionProfile(source, { preset: "none" });
    expect(result[0].children![0]).not.toHaveProperty("motion");
    expect(result[0].children![0].props).toEqual(source[0].children[0].props);
    expect(source[0].children[0]).toHaveProperty("motion");
  });
  test("page and linked documents never receive their own node motion", () => {
    const result = withMotionProfile([{ id: "page", type: "page", props: {}, children: [...home(), { id: "linked", type: "block", props: { blockId: "a" } }] }], { engine: "anime", preset: "rich" });
    expect(result[0]).not.toHaveProperty("motion");
    expect(result[0].children![1]).not.toHaveProperty("motion");
  });
  test("whole-page profiles also cover edited elements inside legacy sections", () => {
    const target = "s:section1/title";
    const root = { id: "page", type: "page", props: { looks: { [target]: { kind: "text", style: { base: { color: "#123456" } }, motion: { enter: { kind: "words" } } } } }, children: [{ id: "old", type: "legacy", props: { sectionId: "section1" } }] };
    expect(checkTree({ version: 1, root }).ok).toBe(true);
    const switched = withMotionProfile([root], { engine: "anime" });
    expect(switched[0].props.looks[target].motion).toHaveProperty("engine", "anime");
    const still = withMotionProfile([root], { preset: "none" });
    expect(still[0].props.looks[target]).not.toHaveProperty("motion");
    expect(still[0].props.looks[target].style).toEqual(root.props.looks[target].style);
    expect(root.props.looks[target]).toHaveProperty("motion");
  });
});

test("motion engine, video label and a 3D poster survive tree validation", () => {
  const result = checkTree(tree([{ id: "s", type: "section", props: {}, children: [
    { id: "video", type: "video", props: { src: "/media/hero.mp4", label: { en: "Our collection" } }, style: { base: { overlay: { color: "#000000", opacity: 0.5 } } }, motion: { engine: "anime", enter: { kind: "up" } } },
    { id: "model", type: "model3d", props: { model: "phone", poster: "/templates/electronics/hero.svg", label: { en: "Phone" } } },
  ] }]));
  expect(result.ok).toBe(true);
  if (result.ok) {
    const [video, model] = result.tree.root.children![0].children!;
    expect(video.motion).toHaveProperty("engine", "anime");
    expect(video.props).toHaveProperty("label.en", "Our collection");
    expect(model.props).toHaveProperty("poster", "/templates/electronics/hero.svg");
  }
  const source = home() as any;
  source[0].children[0].motion.engine = "arbitrary-script";
  expect(checkTree(tree(source)).ok).toBe(false);
  expect(checkTree(tree([{ id: "s", type: "section", props: {}, children: [{ id: "model", type: "model3d", props: { model: "phone", poster: "javascript:alert(1)" } }] }])).ok).toBe(false);
});

test("the editor's ready video and 3D sections use valid, editable merchant nodes", async () => {
  const { makeNode } = await import(pathToFileURL(path.resolve(__dirname, "../../../estabrek-admin/src/studio/insert.ts")).href);
  for (const lang of ["ar", "en", "he"]) {
    let n = 0;
    const ids = (prefix: string) => `${prefix}-${n++}`;
    const video = makeNode("ready-video", lang, ids, "/media/merchant.webm");
    const model = makeNode("ready-model3d", lang, ids);
    const lantern = makeNode("ready-lantern", lang, ids);
    const checked = checkTree(tree([video, model, lantern]));
    expect(checked.ok, JSON.stringify(checked)).toBe(true);
    expect(JSON.stringify(video)).toContain('"opacity":0.5');
    expect(JSON.stringify(video)).not.toMatch(/editorial|estabrek|rose-campaign/);
    expect(JSON.stringify(model)).toContain('"type":"model3d"');
    expect(JSON.stringify(lantern)).toContain('"model":"lantern"');
  }
});
