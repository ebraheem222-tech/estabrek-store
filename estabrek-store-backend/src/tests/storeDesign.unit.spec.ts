import { beforeEach, describe, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("../lib/prisma.js", () => ({ prisma: { page: { findMany: m.find } } }));
vi.mock("../lib/pageBlocks.js", () => ({ withBlocks: async (tree: unknown) => tree }));
import { publishedDesignRegions } from "../lib/storeDesign.js";

const tree = (text: string) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "text", type: "text", props: { text: { ar: text } } }] }] } });
beforeEach(() => { vi.clearAllMocks(); });
describe("published independent design regions", () => {
  test("unmarked stores retain their own original rendering and perform no region lookup", async () => {
    expect(await publishedDesignRegions({})).toEqual({ header: null, footer: null });
    expect(m.find).not.toHaveBeenCalled();
  });
  test("reads configured published blocks only, ignores draft data and separates node IDs", async () => {
    m.find.mockResolvedValue([{ id: "header-id", tree: tree("Live header"), draft: { tree: tree("Secret draft") } }, { id: "footer-id", tree: tree("Live footer") }]);
    const result = await publishedDesignRegions({ storeDesign: { mode: "cms", headerId: "header-id", footerId: "footer-id" } });
    expect(m.find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["header-id", "footer-id"] }, kind: "block", status: "PUBLISHED" }, select: { id: true, tree: true } }));
    expect(JSON.stringify(result)).not.toContain("Secret draft");
    expect(result.header?.root.children?.[0].id).toBe("header_1");
    expect(result.footer?.root.children?.[0].id).toBe("footer_1");
    expect(result.header?.root.children?.[0].children?.[0].props.text).toEqual({ ar: "Live header" });
  });
});
