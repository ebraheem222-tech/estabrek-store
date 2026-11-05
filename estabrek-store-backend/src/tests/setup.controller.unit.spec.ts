import { beforeEach, describe, expect, test, vi } from "vitest";
import express from "express";
import request from "supertest";

const m = vi.hoisted(() => {
  const tx = {
    page: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    pageSection: { deleteMany: vi.fn(), create: vi.fn() },
    pageTranslation: { upsert: vi.fn() },
    productType: { findFirst: vi.fn() },
    siteSettings: { update: vi.fn() },
  };
  return { tx, transaction: vi.fn(), home: vi.fn(), revision: vi.fn(), settings: vi.fn(), keep: vi.fn(), owner: true };
});
vi.mock("../lib/prisma.js", () => ({ prisma: { $transaction: m.transaction, page: { findUnique: m.home } } }));
vi.mock("../lib/storefrontRevalidate.js", () => ({ revalidateStorefront: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../modules/admin/settings.controller.js", () => ({ getOrCreateSettings: m.settings, keepRevision: m.keep, adminIdOf: vi.fn().mockResolvedValue(null), triggerSettingsRevalidate: vi.fn() }));
vi.mock("../modules/admin/pages.controller.js", () => ({ capturePageRevision: m.revision, triggerCmsRevalidate: vi.fn() }));
import setup from "../modules/admin/setup.controller.js";

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).access = { owner: m.owner }; next(); });
app.use("/setup", setup);
app.use((err: any, _req: any, res: any, _next: any) => res.status(err.name === "ZodError" ? 400 : 500).json({ error: err.name }));

const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "h", type: "heading", props: { level: 1, text: { ar: "متجري", en: "My Shop", he: "החנות שלי" } } }] }] } };
const body = () => ({ industry: "fashion", name: { ar: "متجري", en: "My Shop" }, logoUrl: "https://cdn.example.com/logo.png", theme: { id: "tpl-fashion-atelier", mode: "light" }, pages: [{ slug: "/", name: { ar: "الرئيسية" }, tree }] });
const design = () => {
  const words = { ar: "متجري", en: "My Shop", he: "החנות שלי" };
  const p = { bg: "#ffffff", surface: "#ffffff", soft: "#eeeeee", line: "#dddddd", glow: "#cccccc", muted: "#666666", accent: "#222222", strong: "#111111", ink: "#111111", onStrong: "#ffffff" };
  return { templateId: "fashion-quiet", header: tree, footer: tree, theme: { id: "store-design", name: words, blurb: words, family: "fashion", mode: "light", palettes: { light: p, dark: p }, fonts: { display: ["sans-serif"], text: ["sans-serif"] }, round: 1, pill: "8px", shadow: "soft", hero: "split", motion: "soft", svg: "mono", card: "minimal", copy: { eyebrow: words, title: words, subtitle: words, cta: words, productsTitle: words, collectionsTitle: words, marquee: [] } } };
};

beforeEach(() => {
  vi.clearAllMocks();
  m.owner = true;
  m.home.mockResolvedValue(null);
  m.settings.mockResolvedValue({ id: "settings", header: {}, primaryNavId: null, siteName: "Before", logoUrl: "https://cdn.example.com/old.png" });
  m.tx.page.findUnique.mockResolvedValue(null);
  m.tx.page.create.mockResolvedValue({ id: "new-home" });
  m.tx.productType.findFirst.mockResolvedValue(null);
  m.transaction.mockImplementation(async (fn) => fn(m.tx));
});

describe("standalone store setup persists its template and branding", () => {
  test("copies home, header, footer and theme into the customer's own editable documents", async () => {
    let region = 0;
    m.tx.page.create.mockImplementation(async ({ data }) => ({ id: data.kind === "block" ? `region-${++region}` : "new-home" }));
    await request(app).post("/setup/apply").send({ ...body(), design: design() }).expect(200);
    expect(m.tx.page.create).toHaveBeenCalledTimes(3);
    const saved = m.tx.siteSettings.update.mock.calls[0][0].data.header;
    expect(saved.storeDesign).toMatchObject({ mode: "cms", homeId: "new-home", headerId: "region-1", footerId: "region-2", templateId: "fashion-quiet" });
    expect(saved.storeTheme.snapshot).toEqual(design().theme);
    expect(saved.storeTheme.id).toBe("store-design");
  });
  test("a complete design never replaces an existing page without the replacement choice", async () => {
    m.home.mockResolvedValue({ id: "old-home" });
    await request(app).post("/setup/apply").send({ ...body(), design: design() }).expect(409);
    expect(m.transaction).not.toHaveBeenCalled();
    expect(m.revision).not.toHaveBeenCalled();
    m.home.mockResolvedValue(null);
    m.settings.mockResolvedValue({ id: "settings", header: { storeDesign: { mode: "cms", headerId: "custom-header", footerId: "custom-footer" } }, primaryNavId: null });
    await request(app).post("/setup/apply").send({ ...body(), design: design() }).expect(409);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  test("writes the editable home, logo and chosen theme in one transaction", async () => {
    const result = await request(app).post("/setup/apply").send(body()).expect(200);
    expect(result.body.made.pages).toBe(1);
    expect(m.transaction).toHaveBeenCalledTimes(1);
    expect(m.tx.page.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ format: 2, tree, status: "PUBLISHED" }) }));
    expect(m.tx.siteSettings.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ logoUrl: body().logoUrl, siteName: "متجري", header: expect.objectContaining({ storeTheme: { id: "tpl-fashion-atelier", mode: "light" } }) }) }));
    expect(m.tx.pageSection.create).not.toHaveBeenCalled();
    expect(m.keep.mock.calls[0][1]).toContain("logoUrl");
  });
  test("preserves an existing home unless replacement is explicitly requested, then keeps a revision", async () => {
    m.home.mockResolvedValue({ id: "old-home" });
    m.tx.page.findUnique.mockResolvedValue({ id: "old-home" });
    await request(app).post("/setup/apply").send(body()).expect(200);
    expect(m.tx.page.update).not.toHaveBeenCalled();
    expect(m.tx.pageSection.deleteMany).not.toHaveBeenCalled();
    expect(m.revision).not.toHaveBeenCalled();
    await request(app).post("/setup/apply").send({ ...body(), replaceHome: true }).expect(200);
    expect(m.revision).toHaveBeenCalledWith("old-home", "Before store setup", expect.anything());
    expect(m.tx.page.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ format: 2, tree, draft: null }) }));
  });
  test("leaves an omitted logo alone and rejects bad content before opening a transaction", async () => {
    const { logoUrl: _omitted, ...input } = body();
    await request(app).post("/setup/apply").send(input).expect(200);
    expect(m.tx.siteSettings.update.mock.calls[0][0].data).not.toHaveProperty("logoUrl");
    vi.clearAllMocks();
    await request(app).post("/setup/apply").send({ ...body(), logoUrl: "javascript:alert(1)" }).expect(400);
    await request(app).post("/setup/apply").send({ ...body(), pages: [{ ...body().pages[0], tree: { version: 9 } }] }).expect(400);
    expect(m.transaction).not.toHaveBeenCalled();
    m.owner = false;
    await request(app).post("/setup/apply").send(body()).expect(403);
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
