import { beforeEach, describe, expect, it } from "vitest";
import { applySkin, readSkin, setSkin } from "./skin";

describe("admin skin", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-skin");
  });

  it("defaults to the rose look", () => {
    expect(readSkin()).toBe("rose");
  });

  it("remembers the choice and paints it on <html>", () => {
    setSkin("rose-night");
    expect(readSkin()).toBe("rose-night");
    expect(document.documentElement.getAttribute("data-skin")).toBe("rose-night");
  });

  it("classic removes the skin and leaves settings presets alone", () => {
    document.documentElement.setAttribute("data-admin-theme", "luxury_gold");
    applySkin("classic");
    expect(document.documentElement.hasAttribute("data-skin")).toBe(false);
    expect(document.documentElement.getAttribute("data-admin-theme")).toBe("luxury_gold");
    applySkin("rose");
    expect(document.documentElement.hasAttribute("data-admin-theme")).toBe(false);
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem("estabrek_admin_skin_v1", "neon");
    expect(readSkin()).toBe("rose");
  });
});
