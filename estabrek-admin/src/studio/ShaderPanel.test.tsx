import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PageTreeNode } from "../api/pages.api";
import { SHADERS } from "../../../estabrek-storefront/src/pageTree/shaderGlsl";
import { SHADER_KIND_LIST, shaderOf } from "../../../estabrek-storefront/src/pageTree/shader";
import { FX_ENGINES } from "../../../estabrek-storefront/src/pageTree/fxEngines";
import { SHADER_NAMES, ShaderPanel } from "./ShaderPanel";

afterEach(cleanup);

// The theme library's WebGL backgrounds (docs/themes-library-plan.ar.md, phase 3).
describe("the library's shaders", () => {
  it("are the same list in the shop's settings, its GLSL and canvases, and the server's rules, each named, its colours 6-digit", () => {
    expect([...SHADER_KIND_LIST].sort()).toEqual([...Object.keys(SHADERS), ...Object.keys(FX_ENGINES)].sort());
    expect(Object.keys(SHADERS)).toHaveLength(22);
    expect(Object.keys(FX_ENGINES)).toHaveLength(14);
    const server = readFileSync(resolve(process.cwd(), "../estabrek-store-backend/src/lib/pageTree.ts"), "utf8");
    const listed = /export const SHADER_KINDS = \[([^\]]*)\]/.exec(server)![1].match(/"([a-z]+)"/g)!.map((s) => s.slice(1, -1));
    expect(listed).toEqual([...SHADER_KIND_LIST]);
    for (const k of SHADER_KIND_LIST) {
      expect(SHADER_NAMES[k].split("|")).toHaveLength(3);
      const def = SHADERS[k] ?? FX_ENGINES[k];
      for (const c of ["bg", "c1", "c2", "c3"] as const) expect(def[c]).toMatch(/^#[0-9a-f]{6}$/);
      if (SHADERS[k]) expect(SHADERS[k].frag).toContain("gl_FragColor");
      else expect(typeof FX_ENGINES[k].draw).toBe("function");
    }
  });

  it("reads only what's safe: a known shader, colours that are colours, numbers in their range", () => {
    expect(shaderOf({ kind: "aurora" })).toEqual({ kind: "aurora", speed: 1, mouse: true, grain: 0, veil: 0 });
    expect(shaderOf({ kind: "tunnel", c1: "accent", c2: "#1AD9FF", bg: "url(x)", rainbow: false, speed: 2, mouse: false, grain: 0.1, veil: 0.5 })).toEqual({ kind: "tunnel", c1: "accent", c2: "#1AD9FF", rainbow: false, speed: 2, mouse: false, grain: 0.1, veil: 0.5 });
    expect(shaderOf({ kind: "lava" })).toBeNull();
    expect(shaderOf({ kind: "aurora", speed: 9, veil: 2 })).toMatchObject({ speed: 1, veil: 0 });
  });
});

describe("a section's WebGL background panel", () => {
  const section = (props: Record<string, unknown> = {}): PageTreeNode => ({ id: "s1", type: "section", props: { contained: true, ...props }, children: [] });
  const last = (onOps: ReturnType<typeof vi.fn>) => (onOps.mock.calls.at(-1)![1] as Array<{ props: Record<string, unknown> }>)[0].props;

  it("picks one of the 36 (22 shaders, 14 canvases), keeping the section's other settings", () => {
    const onOps = vi.fn();
    render(<ShaderPanel node={section()} busy={false} onOps={onOps} />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getAllByTestId("studio-shader-kind")).toHaveLength(36);
    fireEvent.click(screen.getAllByTestId("studio-shader-kind").find((el) => el.dataset.kind === "ocean")!);
    expect(last(onOps)).toEqual({ contained: true, shader: { kind: "ocean" } });
    fireEvent.click(screen.getAllByTestId("studio-shader-kind").find((el) => el.dataset.kind === "koi")!);
    expect(last(onOps)).toEqual({ contained: true, shader: { kind: "koi" } });
  });

  it("its colours, speed, pointer, grain and veil; rainbow only for the ones drawn in one; removed in one click", () => {
    const onOps = vi.fn();
    const { rerender } = render(<ShaderPanel node={section({ shader: { kind: "aurora" } })} busy={false} onOps={onOps} />);
    const settings = screen.getByTestId("studio-shader-settings");
    expect(within(settings).queryByTestId("studio-shader-rainbow")).toBeNull();
    fireEvent.change(within(settings).getByTestId("studio-shader-c1"), { target: { value: "accent" } });
    expect(last(onOps)).toEqual({ contained: true, shader: { kind: "aurora", c1: "accent" } });
    fireEvent.click(within(settings).getByTestId("studio-shader-mouse"));
    expect(last(onOps).shader).toEqual({ kind: "aurora", mouse: false });
    rerender(<ShaderPanel node={section({ shader: { kind: "tunnel", mouse: false } })} busy={false} onOps={onOps} />);
    const rainbow = screen.getByTestId("studio-shader-rainbow") as HTMLInputElement;
    expect(rainbow.checked).toBe(true);
    fireEvent.click(rainbow);
    expect(last(onOps).shader).toEqual({ kind: "tunnel", mouse: false, rainbow: false });
    fireEvent.click(screen.getByTestId("studio-shader-remove"));
    expect(last(onOps)).toEqual({ contained: true, shader: undefined });
  });
});
