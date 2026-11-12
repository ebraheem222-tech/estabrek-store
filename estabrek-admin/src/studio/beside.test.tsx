import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { PANEL_W, RESERVE, STRIP_W, besidePlace, dockPref, frameFor, saveDock, saveSections, sectionsPref, sideOf } from "./beside";
import { BesideStrips } from "./BesideStrips";
import { InspectorGroup, InspectorJump, cardsByGroup, type InspectorGroupId } from "./InspectorNav";

afterEach(() => { cleanup(); localStorage.clear(); });
const canvas = { x: 260, y: 130, w: 1180, h: 760 };

describe("where the inspector floats", () => {
  it("settings stand on the left of the element, its look on the right", () => {
    expect(sideOf("content")).toBe("left");
    expect(sideOf("behaviour")).toBe("left");
    expect(sideOf("look")).toBe("right");
    expect(sideOf("motion")).toBe("right");
    expect(sideOf(null)).toBe("right");
  });

  it("the panel stands beyond the strip on its side, at the element's height (higher when it's low down)", () => {
    const box = { x: 450, y: 100, w: 240, h: 120 }; // on the canvas
    const right = besidePlace(box, canvas, "right");
    expect(right.strips.right.left).toBe(canvas.x + 450 + 240 + 8);
    expect(right.panel.left).toBe(right.strips.right.left + STRIP_W + 8);
    expect(right.panel.top).toBe(canvas.y + 100 - 4);
    const left = besidePlace(box, canvas, "left");
    expect(left.strips.left.left).toBe(canvas.x + 450 - 8 - STRIP_W);
    expect(left.panel.left).toBe(left.strips.left.left - 8 - PANEL_W);
    expect(left.panel.top + left.panel.maxHeight).toBe(canvas.y + canvas.h - 8);
    // Low down: it rises, so it's still a good size (560 px here).
    const low = besidePlace({ x: 450, y: 600, w: 240, h: 60 }, canvas, "right");
    expect(low.panel.maxHeight).toBe(560);
    expect(low.strips.right.top).toBe(canvas.y + 600);
  });

  it("with no room it stays inside the canvas; with no element it sits at the canvas's corner", () => {
    const wide = besidePlace({ x: 20, y: 300, w: 1140, h: 300 }, canvas, "right");
    expect(wide.panel.left).toBe(canvas.x + canvas.w - PANEL_W - 4);
    expect(wide.strips.right.left).toBeLessThanOrEqual(canvas.x + canvas.w - STRIP_W - 4);
    const none = besidePlace(null, canvas, "right");
    expect(none.panel).toMatchObject({ left: canvas.x + canvas.w - PANEL_W - 4, top: canvas.y + 8 });
  });
});

describe("bringing a picked element into view", () => {
  const view = { zoom: 1, pan: { x: 0, y: 0 } };
  const size = { w: 1180, h: 760 };

  it("a small one grows (not past one and a half times its size) and comes between the two sides' room", () => {
    const to = frameFor({ x: 100, y: 500, w: 60, h: 24 }, view, size, "right")!;
    expect(to.zoom).toBe(1.5);
    // Its middle lands in the middle of the part both sides leave free.
    const mid = (100 + 30) * to.zoom + to.pan.x;
    expect(mid).toBeCloseTo(size.w / 2, 0);
  });

  it("a wide one keeps as much width as one side's room allows, away from the panel", () => {
    const to = frameFor({ x: 0, y: 100, w: 1280, h: 400 }, view, size, "right")!;
    expect(to.zoom).toBeLessThan(1);
    expect(to.zoom).toBeGreaterThan(0.5);
    // Its right edge stops before the panel's room.
    expect(1280 * to.zoom + to.pan.x).toBeLessThanOrEqual(size.w - RESERVE + 1);
    // On the other side the room is on the left.
    const left = frameFor({ x: 0, y: 100, w: 1280, h: 400 }, view, size, "left")!;
    expect(left.pan.x).toBeGreaterThanOrEqual(RESERVE - 1);
  });

  it("one that already sits well isn't moved", () => {
    // A card that takes a good part of the free room at its own size stays where it is.
    expect(frameFor({ x: 420, y: 220, w: 320, h: 240 }, view, size, "right")).toBeNull();
    // The same card zoomed far out is brought back.
    expect(frameFor({ x: 420, y: 220, w: 96, h: 72 }, { zoom: 0.3, pan: { x: 0, y: 0 } }, size, "right")?.zoom).toBeGreaterThan(1);
    expect(frameFor({ x: 0, y: 0, w: 0, h: 0 }, view, size, "right")).toBeNull();
  });
});

describe("this browser's choices", () => {
  it("beside the element with one section at a time, unless set otherwise", () => {
    expect(dockPref()).toBe("beside");
    expect(sectionsPref()).toBe(true);
    saveDock("side");
    saveSections(false);
    expect(dockPref()).toBe("side");
    expect(sectionsPref()).toBe(false);
  });
});

function Panel({ sel }: { sel: string }) {
  const [active, setActive] = useState<InspectorGroupId>("motion");
  const [sections, setSections] = useState(true);
  return (
    <aside>
      <InspectorJump watch={sel} sections={sections} active={active} onActive={setActive} onSections={setSections} />
      <div data-insp-list="">
        <div data-testid="name">Button</div>
        <div data-insp-list="">
          <div data-testid="actions">Copy Delete</div>
          <InspectorGroup id="content" />
          <div data-testid="card-words">The button's words</div>
          <InspectorGroup id="look" />
          <div data-testid="card-colour">Button colour</div>
          <InspectorGroup id="motion" />
          <div data-testid="card-motion">Motion</div>
        </div>
        <InspectorGroup id="layout" />
        <div data-testid="card-size">Size limits</div>
      </div>
    </aside>
  );
}
const off = (id: string) => screen.getByTestId(id).hasAttribute("data-insp-off");

describe("one section at a time", () => {
  it("only the open section's cards show under the element's name and actions; a tab opens another", async () => {
    render(<Panel sel="a" />);
    await waitFor(() => expect(off("card-words")).toBe(true));
    expect(off("card-motion")).toBe(false);
    expect(off("name")).toBe(false);
    expect(off("actions")).toBe(false);
    expect(off("card-size")).toBe(true);
    const tab = (g: string) => screen.getAllByTestId("studio-insp-chip").find((c) => c.dataset.group === g)!;
    expect(tab("motion").getAttribute("aria-selected")).toBe("true");
    fireEvent.click(tab("layout"));
    await waitFor(() => expect(off("card-size")).toBe(false));
    expect(off("card-motion")).toBe(true);
  });

  it("a search looks through every section; «all» lists them all again", async () => {
    render(<Panel sel="a" />);
    await waitFor(() => expect(off("card-words")).toBe(true));
    fireEvent.change(screen.getByTestId("studio-insp-find"), { target: { value: "colour" } });
    await waitFor(() => expect(off("card-colour")).toBe(false));
    expect(screen.getByTestId("card-colour").hasAttribute("data-insp-hidden")).toBe(false);
    expect(screen.getByTestId("card-motion").hasAttribute("data-insp-hidden")).toBe(true);
    fireEvent.change(screen.getByTestId("studio-insp-find"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("studio-insp-sections"));
    await waitFor(() => expect(off("card-words")).toBe(false));
    expect(off("card-size")).toBe(false);
  });

  it("each card's section is read from the page", () => {
    const view = render(<Panel sel="a" />);
    const by = Object.fromEntries(cardsByGroup(view.container.querySelector("aside")!).map((c) => [c.card.dataset.testid, c.group]));
    expect(by).toEqual({ name: "top", actions: "top", "card-words": "content", "card-colour": "look", "card-motion": "motion", "card-size": "layout" });
  });
});

describe("the strips beside the element", () => {
  it("settings on the left, look and adding on the right; the open tab pressed again is told", () => {
    const onPick = vi.fn(), onAdd = vi.fn();
    const place = besidePlace({ x: 450, y: 200, w: 240, h: 120 }, canvas, "right");
    render(<BesideStrips place={place} groups={["content", "look", "motion", "layout"]} active="look" onPick={onPick} onAdd={onAdd} />);
    const strips = screen.getAllByTestId("studio-beside-strip");
    const tabs = (side: string) => [...strips.find((s) => s.dataset.side === side)!.querySelectorAll<HTMLElement>("[data-testid=studio-beside-tab]")].map((b) => b.dataset.group);
    expect(tabs("left")).toEqual(["content", "layout"]);
    expect(tabs("right")).toEqual(["look", "motion"]);
    expect(screen.getAllByTestId("studio-beside-tab").find((b) => b.dataset.group === "look")!.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getAllByTestId("studio-beside-tab").find((b) => b.dataset.group === "content")!);
    expect(onPick).toHaveBeenCalledWith("content");
    fireEvent.click(screen.getByTestId("studio-beside-add"));
    expect(onAdd).toHaveBeenCalled();
  });
});
