import { expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("../lib/prisma.js", () => ({ prisma: { page: { findMany: m.find } } }));
import { publishedDesignRegions } from "../lib/storeDesign.js";

test("a published region cannot expose a linked unpublished block", async () => {
  const header = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "linked", type: "block", props: { blockId: "private-block" } }] } };
  const hidden = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "t", type: "text", props: { text: { en: "Unpublished offer" } } }] }] } };
  m.find.mockImplementation(async ({ where }) => {
    if (where.id.in.includes("header")) return [{ id: "header", tree: header }];
    return where.status === "PUBLISHED" ? [] : [{ id: "private-block", tree: hidden }];
  });
  const result = await publishedDesignRegions({ storeDesign: { mode: "cms", headerId: "header" } });
  expect(JSON.stringify(result)).not.toContain("Unpublished offer");
  expect(m.find.mock.calls[1][0].where.status).toBe("PUBLISHED");
});
