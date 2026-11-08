import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PARTICLE_KINDS, particleOptions, particlesOf } from "../../../estabrek-storefront/src/pageTree/particles";
import { PARTICLE_GROUPS, PARTICLE_IDS } from "./particleKinds";
import { ParticlesPanel } from "./ShapePanels";
import { setLangForTests } from "../lib/lang";
import type { PageDraftOp } from "../api/pages.api";

afterEach(cleanup);
const SHOP = path.resolve(__dirname, "../../../estabrek-storefront/public");

describe("moving particles", () => {
  it("has a hundred kinds, every one named once in the editor", () => {
    expect(PARTICLE_KINDS).toHaveLength(100);
    expect([...PARTICLE_IDS].sort()).toEqual([...PARTICLE_KINDS].sort());
    for (const g of PARTICLE_GROUPS) for (const [, mark, name] of g.kinds) { expect(mark).toBeTruthy(); expect(name()).toBeTruthy(); }
  });

  it.each([...PARTICLE_KINDS])("%s builds bounded tsParticles options whose own shapes exist", (kind) => {
    const spec = particlesOf({ kind, amount: 3, speed: 3 })!;
    expect(spec.kind).toBe(kind);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a third-party options object
    const options = particleOptions(spec, "rgb(200, 100, 150)") as { particles: Record<string, any> };
    const p = options.particles;
    expect(p.number.value).toBeGreaterThan(0);
    expect(p.number.value).toBeLessThanOrEqual(400);
    expect(p.size.value.min).toBeLessThanOrEqual(p.size.value.max);
    for (const image of p.shape.options.image ?? []) expect(fs.existsSync(path.join(SHOP, image.src)), image.src).toBe(true);
    expect(JSON.stringify(options)).not.toMatch(/NaN|Infinity|"text"/);
  });

  it("drops unknown kinds and out-of-range numbers", () => {
    expect(particlesOf({ kind: "scripts" })).toBeNull();
    expect(particlesOf({ kind: "lanterns", amount: 99, speed: -1 })).toEqual({ kind: "lanterns", amount: 1, speed: 1 });
  });

  it("shows every kind at once with search, and saves the picked one", () => {
    setLangForTests("en");
    const edits: PageDraftOp[] = [];
    const view = render(<ParticlesPanel node={{ id: "hero", type: "section", props: { anchor: "top" } }} busy={false} onOps={(_l, ops) => edits.push(...ops)} />);
    expect(view.container.querySelectorAll("[data-particle-kind]")).toHaveLength(100);
    fireEvent.click(screen.getByRole("button", { name: /Lanterns/ }));
    expect(edits.at(-1)).toEqual({ op: "setProps", nodeId: "hero", props: { anchor: "top", particles: { kind: "lanterns" } } });
    fireEvent.change(screen.getByTestId("studio-particles-search"), { target: { value: "coin" } });
    expect([...view.container.querySelectorAll("[data-particle-kind]")].map(b => b.getAttribute("data-particle-kind"))).toEqual(["coins"]);
  });
});
