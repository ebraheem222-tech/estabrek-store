import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { tableRight } from "./permissions.js";
import { tableOf, changeRow } from "../../lib/rowWrites.js";
import { pageView, pagesShown, partShown, sitePanels, type PanelRights, type SitePanel } from "../../lib/sitePanel.js";
import { saveSiteSettings } from "../../lib/siteSettingsSave.js";

/**
 * /v1/admin/site-panels — a whole site's own pages in the admin's menu (sites wave 1.2; lib/sitePanel.ts): its
 * numbers, its queues, its saved tables, its settings and quick actions, as its file declares them. Any member
 * signed in may ask; each sees only the parts they may read (a table's rows: pages:read, or that one table given
 * to their role; the settings: features:read), and changes only what they may change.
 *
 * GET  /admin/site-panels                                 — the sites here with a panel, each with the pages this member sees
 * GET  /admin/site-panels/:feature/:page?lang=            — one page, each part with what it shows now
 * POST /admin/site-panels/:feature/:page/:part/decide     { row, decision, lang? } — a queue's button: the row's fields set
 * POST /admin/site-panels/:feature/:page/:part/act        { action } — a quick action: the setting it names set (features:write)
 */
const r = Router();

const rightsOf = (req: Request): PanelRights => {
  const has = (p: string) => hasPermission(req, p);
  return { readTable: (id) => tableRight(has, id, "read"), writeTable: (id) => tableRight(has, id, "write"), readSettings: has("features:read"), writeSettings: has("features:write") };
};
const langOf = (v: unknown): "ar" | "en" | "he" => (v === "en" || v === "he" ? v : "ar");

/** The site and the page asked for, if this member sees that page. */
async function pageOf(req: Request) {
  const [site] = await sitePanels(String(req.params.feature));
  const may = rightsOf(req);
  const page = site ? pagesShown(site, may).find((p) => p.key === String(req.params.page)) : undefined;
  if (!site || !page) throw new AppError(404, "PANEL_NOT_FOUND", "No such page in a site's panel");
  return { site, page, may };
}
/** One of the page's parts this member sees, of the kind asked. */
function partOf<K extends string>(site: SitePanel, page: SitePanel["panel"][number], key: string, kind: K, may: PanelRights) {
  const part = page.parts.find((p) => p.key === key);
  // One this member doesn't see isn't there for them.
  if (!part || part.kind !== kind || !partShown(site, part, may)) throw new AppError(404, "PART_NOT_FOUND", "No such part on this page");
  return part as Extract<typeof part, { kind: K }>;
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const may = rightsOf(req);
    const sites = (await sitePanels()).map((s) => ({ featureId: s.featureId, name: s.name, enabled: s.enabled, pages: pagesShown(s, may).map((p) => ({ key: p.key, name: p.name, icon: p.icon })) }));
    res.json({ sites: sites.filter((s) => s.pages.length) });
  }),
);

r.get(
  "/:feature/:page",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    res.json(await pageView(site, page, may, { lang: langOf(req.query.lang) }));
  }),
);

const DecideBody = z.object({ row: z.string().min(1).max(40), decision: z.string().min(1).max(40), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
r.post(
  "/:feature/:page/:part/decide",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), "queue", may);
    const body = DecideBody.parse(req.body ?? {});
    const decision = part.decisions.find((d) => d.key === body.decision);
    if (!decision) throw new AppError(404, "DECISION_NOT_FOUND", "No such button on this queue");
    const tableId = site.tables[part.table.replace(/^@table:/, "")];
    if (!tableId || !may.readTable(tableId)) throw new AppError(404, "PART_NOT_FOUND", "No such part on this page");
    if (!may.writeTable(tableId)) throw new AppError(403, "PERMISSION_DENIED", "Changing this table's rows isn't yours to do", { required: [`data:${tableId}:write`] });
    const table = await tableOf(tableId);
    const was = await prisma.collectionItem.findFirst({ where: { id: body.row, collectionId: table.id } });
    if (!was || was.deletedAt) throw new AppError(404, "NOT_FOUND", "No such row");
    // Like a cell changed in the grid: checked against the fields, and the functions waiting for a change are told.
    await changeRow(table, was, { values: decision.set, lang: body.lang ?? "ar" });
    res.json(await pageView(site, page, may, { lang: langOf(body.lang) }));
  }),
);

const ActBody = z.object({ action: z.string().min(1).max(40), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
r.post(
  "/:feature/:page/:part/act",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), "actions", may);
    const body = ActBody.parse(req.body ?? {});
    const action = part.items.find((a) => a.key === body.action);
    if (!action) throw new AppError(404, "ACTION_NOT_FOUND", "No such action on this page");
    if (!may.writeSettings) throw new AppError(403, "PERMISSION_DENIED", "Changing the site's settings isn't yours to do", { required: ["features:write"] });
    await saveSiteSettings(site.featureId, { [action.setting]: action.value });
    const [now] = await sitePanels(site.featureId);
    res.json(await pageView(now, page, may, { lang: langOf(body.lang) }));
  }),
);

export default r;
