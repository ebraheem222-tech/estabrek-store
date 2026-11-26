// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { elementTools, TOOL_GUIDE, type ElementTool } from "./elementTools";
import { ElementToolsCard, ToolsGuide } from "./ElementToolsCard";
import { cardMatches } from "./InspectorNav";
import { NEW_WORLD, worldOfNode, worldOnOps } from "./PhysicsPanels";
import { sceneFromVideo } from "./scrollScene";

// An element's tools by name (elementTools.ts): the editors that sit one step away from the inspector's list.

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
const node = (type: string, props: Record<string, unknown> = {}, children?: PageTreeNode[]): PageTreeNode => ({ id: type, type, props, ...(children ? { children } : {}) } as PageTreeNode);
const ids = (tools: ElementTool[]) => tools.map((t) => t.id);
const every = ["motion", "recipes", "maths"];
const makeIds = () => { let n = 0; return (p: string) => `${p}-${n++}`; };

test("a picture, a video, a 3D model and words say where their own editors are", () => {
  setLangForTests("en");
  expect(ids(elementTools(node("image")))).toEqual(["image-edit", "image-colours", "ai-alt", "image-fx", "image-3d", "image-popout", "image-sparkle", ...every]);
  expect(elementTools(node("image")).find((t) => t.id === "image-fx")!.go).toEqual({ kind: "group", group: "motion", card: "studio-picture-fx" });
  expect(ids(elementTools(node("video")))).toEqual(["video-editor", "video-scenes", ...every]);
  expect(ids(elementTools(node("model3d")))).toEqual(["model-stage", "model-views", "model-spots", "model-parts", ...every]);
  expect(ids(elementTools(node("heading")))).toEqual(["ai-words", "text-curve", ...every]);
  expect(ids(elementTools(node("text")))).toEqual(["ai-words", "text-curve", ...every]);
  expect(ids(elementTools(node("svg")))).toEqual(["svg-parts", ...every]);
  expect(ids(elementTools(node("slider")))).toEqual(["slider-fx", "slider-slides", ...every]);
  expect(ids(elementTools(node("scrollScene")))).toEqual(["scene-chapters", ...every]);
  expect(ids(elementTools(node("button")))).toEqual(["ai-words", ...every]);
  expect(ids(elementTools(node("icon")))).toEqual(every);
  // The words helper is the same card for words and for a picture's description.
  expect(elementTools(node("button"))[0].go).toEqual({ kind: "aiWords" });
  expect(elementTools(node("image")).find((t) => t.id === "ai-alt")!.go).toEqual({ kind: "aiWords" });
  // The page itself has none.
  expect(elementTools(node("page"))).toEqual([]);
  // Where each one goes: an editor inside the element opened on its own, the video editor, a new scene.
  const video = elementTools(node("video"));
  expect(video[0]).toMatchObject({ label: "The video editor", go: { kind: "videoEditor" } });
  expect(video[1].go).toEqual({ kind: "sceneFromVideo" });
  expect(video[1].hint).toContain("any element");
  expect(elementTools(node("image"))[0]).toMatchObject({ label: "Edit the picture", go: { kind: "focus", card: "studio-image-edit" } });
  expect(elementTools(node("model3d")).find((t) => t.id === "model-views")!.go).toEqual({ kind: "focus", card: "studio-model-views" });
  // What every element has is small, and goes to a group of the inspector or to the variables.
  const small = elementTools(node("icon"));
  expect(small.every((t) => t.small)).toBe(true);
  expect(small.map((t) => t.go)).toEqual([{ kind: "group", group: "motion" }, { kind: "group", group: "behaviour", card: "studio-triggers" }, { kind: "variables" }]);
});

test("physics is offered on what holds others and on what they hold", () => {
  setLangForTests("en");
  const part = node("section");
  const world = node("section", { world: { start: "drop" } });
  // A holder: made a world in one press, or taken to the world's settings.
  expect(elementTools(part)[0]).toMatchObject({ id: "world-on", go: { kind: "worldOn", hostId: "section", card: "studio-world" } });
  expect(elementTools(world)[0]).toMatchObject({ id: "world", go: { kind: "group", group: "motion", card: "studio-world" } });
  // What a holder holds: its holder becomes the world (said by name), or its own body's settings.
  const lone = elementTools(node("heading"), part, "Hero part").find((t) => t.id === "body-on")!;
  expect(lone.go).toEqual({ kind: "worldOn", hostId: "section", card: "studio-body" });
  expect(lone.hint).toContain("«Hero part»");
  expect(ids(elementTools(node("heading"), part))).toEqual(["ai-words", "text-curve", "body-on", ...every]);
  expect(elementTools(node("heading"), world).find((t) => t.id === "body")!.go).toEqual({ kind: "group", group: "motion", card: "studio-body" });
  // A holder inside a holder: its own world first; a body only when what holds it is already a world.
  expect(ids(elementTools(node("stack"), part))).toEqual(["world-on", ...every]);
  expect(ids(elementTools(node("stack"), world))).toEqual(["world-on", "body", ...every]);
  // A scroll scene (it holds the screen still) and a popup are never offered as bodies.
  expect(ids(elementTools(node("scrollScene"), part))).toEqual(["scene-chapters", ...every]);
  expect(ids(elementTools(node("popup"), world))).toEqual(["world-on", ...every]);
  // What can't hold a world offers nothing for what it holds.
  expect(ids(elementTools(node("icon"), node("slider")))).toEqual(["motion", "recipes", "maths"]);

  // The change itself: the holder's other settings stay, and each world is its own copy.
  const ops = worldOnOps(node("section", { contained: false }));
  expect(ops).toEqual([{ op: "setProps", nodeId: "section", props: { contained: false, world: { start: "drop", walls: "open", bounce: 0.4, drag: true } } }]);
  const made = (ops[0] as unknown as { props: { world: Record<string, unknown> } }).props;
  made.world.walls = "box";
  expect(NEW_WORLD.walls).toBe("open");
  expect(worldOfNode(node("section", made))).toMatchObject({ start: "drop", drag: true });
});

test("a scroll scene is made of a video already on the page", () => {
  setLangForTests("en");
  const part = sceneFromVideo("en", makeIds(), node("video", { src: " /editorial/clip.mp4 ", poster: "/editorial/poster.webp", controls: true }));
  expect(part).toMatchObject({ type: "section", props: { contained: false } });
  expect(part.children).toHaveLength(1);
  const scene = part.children![0];
  expect(scene.type).toBe("scrollScene");
  expect(scene.props).toMatchObject({ media: { kind: "video", src: "/editorial/clip.mp4", poster: "/editorial/poster.webp" }, mode: "pin", chapters: 10 });
  // Three things on it, each at its own moment.
  expect(scene.children!.map((c) => [c.type, (c.motion as { cue: { from: number; to: number } }).cue.from])).toEqual([["heading", 0], ["text", 35], ["button", 75]]);
  // A video with no clip yet: a scene waiting for one.
  const empty = sceneFromVideo("en", makeIds(), node("video", { poster: "/editorial/poster.webp" })).children![0];
  expect(empty.props.media).toEqual({ kind: "none" });
});

test("the card: big buttons for the element's own tools, small ones for the rest, found by the inspector's search", () => {
  setLangForTests("en");
  const tools = elementTools(node("video"), node("section"), "Hero part");
  const onGo = vi.fn();
  const view = render(<div data-card=""><ElementToolsCard tools={tools} busy={false} onGo={onGo} /></div>);
  const buttons = screen.getAllByTestId("studio-tool");
  expect(buttons.map((b) => b.dataset.tool)).toEqual(["video-editor", "video-scenes", "body-on", "motion", "recipes", "maths"]);
  expect(buttons[0].textContent).toContain("The video editor");
  // What a tool does is its tooltip, and in its words for the search.
  expect(buttons[0].getAttribute("title")).toContain("Cut, order the clips");
  expect(buttons[0].textContent).toContain("Cut, order the clips");
  expect(buttons[3].getAttribute("title")).toContain("Entrance");
  expect(buttons.map((b) => b.textContent!.split(" · ")[0].replace(/^\S+\s/, ""))).toEqual(["The video editor", "Split it into scenes that follow the scroll", "Physics for this element", "Motion", "When something happens", "Maths"]);
  fireEvent.click(buttons[1]);
  expect(onGo).toHaveBeenCalledWith(tools[1]);
  // While a change is being saved, only the tools that change the page wait.
  view.rerender(<div data-card=""><ElementToolsCard tools={tools} busy onGo={onGo} /></div>);
  expect(screen.getAllByTestId("studio-tool").map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, true, true, false, false, false]);
  // The inspector's search reads the card's words.
  const card = screen.getByTestId("studio-tools");
  expect(cardMatches(card, "video editor")).toBe(true);
  expect(cardMatches(card, "physics")).toBe(true);
  expect(cardMatches(card, "scroll scenes")).toBe(true);
  expect(cardMatches(card, "contrast")).toBe(true);
  expect(cardMatches(card, "zebra")).toBe(false);
  // No tools, no row; the studio's own button alone still gets one, and comes first.
  cleanup();
  render(<ElementToolsCard tools={[]} busy={false} onGo={onGo} />);
  expect(screen.queryByTestId("studio-tools")).toBeNull();
  render(<ElementToolsCard tools={tools.slice(0, 1)} busy={false} onGo={onGo}><button type="button" data-testid="open">Open</button></ElementToolsCard>);
  expect([...screen.getByTestId("studio-tools").querySelectorAll("button")].map((b) => b.dataset.testid)).toEqual(["open", "studio-tool"]);
  cleanup();
  render(<ElementToolsCard tools={[]} busy={false} onGo={onGo}><button type="button" data-testid="open">Open</button></ElementToolsCard>);
  expect(screen.getByTestId("studio-tools").querySelectorAll("button")).toHaveLength(1);
});

test("in Arabic the card and the guide speak Arabic", () => {
  setLangForTests("ar");
  render(<><ElementToolsCard tools={elementTools(node("image"))} busy={false} onGo={() => {}} /><ToolsGuide /></>);
  expect(cardMatches(screen.getByTestId("studio-tools"), "عدّل الصورة")).toBe(true);
  const guide = screen.getByTestId("studio-tools-guide");
  expect(guide.querySelectorAll("li")).toHaveLength(TOOL_GUIDE.length);
  expect(guide.textContent).toContain("محرّر الفيديو");
  expect(guide.textContent).toContain("الفيزياء");
});
