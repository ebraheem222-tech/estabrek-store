import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// The page editor's shared styles (src/lib/siteStyles.ts) through the admin and the editor's preview.
const H2 = { id: "h2", kind: "text", style: { base: { size: 44, hover: { color: "accent" } } } };
const CARD = { id: "card", kind: "box", name: "Card", style: { base: { bg: "surface", radius: 24 } } };
const headerNow = async () => ((await prisma.siteSettings.findFirst())?.header ?? {}) as Record<string, unknown>;

beforeEach(async () => {
  await prisma.page.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.siteSettings.create({ data: { header: { languages: { enabled: ["ar"], default: "ar" } } as any } });
});

describe("Site styles", () => {
  test("a draft is kept beside the published styles, then published; the rest of the header stays", async () => {
    expect((await request(app).get("/v1/admin/site-styles").expect(200)).body).toEqual({ styles: [], draft: null });
    const saved = (await request(app).put("/v1/admin/site-styles/draft").send({ styles: [H2, CARD] }).expect(200)).body;
    expect(saved.draft).toHaveLength(2);
    expect(saved.styles).toEqual([]);
    expect((await headerNow()).languages).toEqual({ enabled: ["ar"], default: "ar" });
    const live = (await request(app).post("/v1/admin/site-styles/publish").expect(200)).body;
    expect(live).toMatchObject({ draft: null, styles: [H2, CARD] });
    const header = await headerNow();
    expect(header.siteStylesDraft).toBeUndefined();
    expect(header.languages).toEqual({ enabled: ["ar"], default: "ar" });
    // A revision was kept before they went live.
    expect(await prisma.settingsRevision.count({ where: { note: "Site styles published" } })).toBe(1);
    // Nothing left to publish.
    await request(app).post("/v1/admin/site-styles/publish").expect(400);
  });

  test("bad styles are refused with where they are; a draft can be dropped", async () => {
    const bad = (await request(app).put("/v1/admin/site-styles/draft").send({ styles: [{ ...H2, kind: "button" }] }).expect(400)).body;
    expect(bad.error).toBe("STYLES_INVALID");
    expect(bad.issues[0].path).toBe("0.kind");
    await request(app).put("/v1/admin/site-styles/draft").send({ styles: [CARD] }).expect(200);
    expect((await request(app).delete("/v1/admin/site-styles/draft").expect(200)).body).toEqual({ styles: [], draft: null });
  });

  test("the editor's preview of a page carries the draft styles, else the published ones", async () => {
    const page = await prisma.page.create({ data: { name: "About", slug: "/about-styles", status: "PUBLISHED" } });
    const { token } = (await request(app).post(`/v1/admin/pages/${page.id}/preview-token`).expect(200)).body;
    const preview = async () => (await request(app).get(`/v1/storefront/page-preview?token=${token}`).expect(200)).body.siteStyles;
    expect(await preview()).toEqual([]);
    await request(app).put("/v1/admin/site-styles/draft").send({ styles: [H2] }).expect(200);
    expect(await preview()).toEqual([H2]);
    await request(app).post("/v1/admin/site-styles/publish").expect(200);
    await request(app).put("/v1/admin/site-styles/draft").send({ styles: [CARD] }).expect(200);
    expect(await preview()).toEqual([CARD]);
    await request(app).delete("/v1/admin/site-styles/draft").expect(200);
    expect(await preview()).toEqual([H2]);
    // The published page itself never carries them (the shop reads the settings).
    expect((await request(app).get("/v1/storefront/page?slug=/about-styles").expect(200)).body.siteStyles).toBeUndefined();
  });
});
