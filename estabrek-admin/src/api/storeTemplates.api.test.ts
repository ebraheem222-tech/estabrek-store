import { afterEach, describe, expect, it, vi } from "vitest";
import { getStoreTemplateImport } from "./storeTemplates.api";
import { motionProfileQuery } from "../studio/motionProfiles";

vi.mock("../studio/storeThemes", () => ({ shopOrigin: () => "https://shop.example.com" }));
afterEach(() => vi.unstubAllGlobals());

describe("template motion import", () => {
  it("sends the exact profile query used by previews and preserves independent design documents", async () => {
    const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [] } };
    const design = { templateId: "example", header: tree, footer: tree, theme: { id: "tpl-example" } };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sections: [], design }) });
    vi.stubGlobal("fetch", fetcher);
    const options = { engine: "anime", preset: "rich" } as const;
    const result = await getStoreTemplateImport("example", options);
    expect(fetcher).toHaveBeenCalledWith(`https://shop.example.com/api/templates/example?${motionProfileQuery(options)}`, { credentials: "omit" });
    expect(result.design).toEqual(design);
    expect(result.tree.root.children).toEqual([]);
    await getStoreTemplateImport("example");
    expect(fetcher).toHaveBeenLastCalledWith("https://shop.example.com/api/templates/example", { credentials: "omit" });
  });
});
