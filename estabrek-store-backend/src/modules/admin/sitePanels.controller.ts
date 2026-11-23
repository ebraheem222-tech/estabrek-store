import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { tableRight } from "./permissions.js";
import { tableOf, changeRow } from "../../lib/rowWrites.js";
import { findByCode, needOf, pageView, pagesShown, partShown, peopleSearch, reportCsv, saveLayout, sitePanels, tableIdOf, type PanelPart, type PanelRights, type SitePanel } from "../../lib/sitePanel.js";
import { VOTES, VOTE_NOTE_MAX, castVote, yesVotes } from "../../lib/siteVotes.js";
import { saveSiteSettings } from "../../lib/siteSettingsSave.js";
import { readSite } from "../../lib/gameSites.js";
import { linkDownload } from "../../lib/gameLink.js";

/**
 * /v1/admin/site-panels — a whole site's own pages in the admin's menu (sites wave 1; lib/sitePanel.ts): its parts as
 * its file declares them. Any member signed in may ask; each sees only the parts they may read (a table's rows:
 * pages:read, or that one table given to their role; the settings: features:read), and changes only what they may
 * change. A part they don't see answers as one that isn't there.
 *
 * GET  /admin/site-panels                                  — the sites here with a panel, each with the pages this member sees
 * GET  /admin/site-panels/:feature/:page?lang&month&period — one page, each part with what it shows now (a calendar's month, a report's period)
 * POST /admin/site-panels/:feature/:page/:part/decide      { row, decision, lang? } — a queue's or a scanner's button: the row's fields set
 *                                                           (a button "after the votes" only once enough of the staff said yes)
 * POST /admin/site-panels/:feature/:page/:part/vote        { row, vote: yes|no|none, note?, lang? } — a member's vote on a row of a
 *                                                           queue that counts them (one each; "none" takes it back)
 * POST /admin/site-panels/:feature/:page/:part/move        { row, to, lang? } — a kanban's card to another column, a calendar's row to another day
 * POST /admin/site-panels/:feature/:page/:part/act         { action } — a quick action: the setting it names set (features:write)
 * GET  /admin/site-panels/:feature/:page/:part/people?q=   — a person's page: their rows across the part's tables
 * GET  /admin/site-panels/:feature/:page/:part/find?code=  — a scanner's code: the row it names
 * GET  /admin/site-panels/:feature/:page/:part/export?period= — a report's period as a CSV file
 * POST /admin/site-panels/:feature/:page/:part/check       — a game server's status asked now (features:write; once in 10 seconds a site)
 * POST /admin/site-panels/:feature/:page/:part/download    { lang? } — the site's link for its game, stamped with a new key
 *                                                           (the old one stops working) and this API's address (features:write)
 * PUT  /admin/site-panels/:feature/:page/layout             { order?, hidden?, own? } — the page as its owner arranges it (features:write):
 *                                                           its parts' order, the ones hidden, parts of their own over the site's tables
 */
const r = Router();

const rightsOf = (req: Request): PanelRights => {
  const has = (p: string) => hasPermission(req, p);
  return { readTable: (id) => tableRight(has, id, "read"), writeTable: (id) => tableRight(has, id, "write"), readSettings: has("features:read"), writeSettings: has("features:write") };
};
const langOf = (v: unknown): "ar" | "en" | "he" => (v === "en" || v === "he" ? v : "ar");
const text = (v: unknown) => (typeof v === "string" ? v : undefined);
const optsOf = (req: Request, lang?: unknown) => ({ lang: langOf(lang ?? req.query.lang), month: text(req.query.month), period: text(req.query.period), member: req.user?.sub ?? null });

/** The site and the page asked for, if this member sees that page. */
async function pageOf(req: Request) {
  const [site] = await sitePanels(String(req.params.feature));
  const may = rightsOf(req);
  const page = site ? pagesShown(site, may).find((p) => p.key === String(req.params.page)) : undefined;
  if (!site || !page) throw new AppError(404, "PANEL_NOT_FOUND", "No such page in a site's panel");
  return { site, page, may };
}
/** One of the page's parts this member sees, of one of the kinds asked (one they don't see isn't there for them). */
function partOf<K extends PanelPart["kind"]>(site: SitePanel, page: SitePanel["panel"][number], key: string, kinds: K[], may: PanelRights) {
  const part = page.parts.find((p) => p.key === key);
  if (!part || !(kinds as string[]).includes(part.kind) || !partShown(site, part, may)) throw new AppError(404, "PART_NOT_FOUND", "No such part on this page");
  return part as Extract<PanelPart, { kind: K }>;
}
/** A part's table and one of its rows, for a member who may change them. */
async function rowToChange(site: SitePanel, ref: string, rowId: string, may: PanelRights) {
  const tableId = tableIdOf(site, ref);
  if (!tableId || !may.readTable(tableId)) throw new AppError(404, "PART_NOT_FOUND", "No such part on this page");
  if (!may.writeTable(tableId)) throw new AppError(403, "PERMISSION_DENIED", "Changing this table's rows isn't yours to do", { required: [`data:${tableId}:write`] });
  const table = await tableOf(tableId);
  const was = await prisma.collectionItem.findFirst({ where: { id: rowId, collectionId: table.id } });
  if (!was || was.deletedAt) throw new AppError(404, "NOT_FOUND", "No such row");
  return { table, was };
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
    res.json(await pageView(site, page, may, optsOf(req)));
  }),
);

const DecideBody = z.object({ row: z.string().min(1).max(40), decision: z.string().min(1).max(40), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
r.post(
  "/:feature/:page/:part/decide",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["queue", "scanner"], may);
    const body = DecideBody.parse(req.body ?? {});
    const decision = part.decisions.find((d) => d.key === body.decision);
    if (!decision) throw new AppError(404, "DECISION_NOT_FOUND", "No such button here");
    const { table, was } = await rowToChange(site, part.table, body.row, may);
    // Accepted only once enough of the staff said yes (the site's setting says how many).
    if (part.kind === "queue" && part.votes && decision.afterVotes) {
      const need = needOf(site, part);
      const yes = await yesVotes(was.id);
      if (yes < need) throw new AppError(409, "VOTES_NEEDED", `It waits for ${need} yes (${yes} so far)`, { need, yes });
    }
    // Like a cell changed in the grid: checked against the fields, and the functions waiting for a change are told.
    const saved = await changeRow(table, was, { values: decision.set, lang: body.lang ?? "ar" });
    res.json({ ...(await pageView(site, page, may, optsOf(req, body.lang))), row: saved.id });
  }),
);

const VoteBody = z.object({ row: z.string().min(1).max(40), vote: z.enum([...VOTES, "none"]), note: z.string().max(VOTE_NOTE_MAX).optional(), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
r.post(
  "/:feature/:page/:part/vote",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["queue"], may);
    if (!part.votes) throw new AppError(404, "PART_NOT_FOUND", "This queue doesn't count votes");
    const body = VoteBody.parse(req.body ?? {});
    // Whoever may decide the rows votes on them (a member who only reads the table sees the votes).
    const { was } = await rowToChange(site, part.table, body.row, may);
    const id = req.user?.sub;
    if (!id) throw new AppError(401, "UNAUTHORIZED", "Sign in first");
    const admin = await prisma.adminUser.findUnique({ where: { id }, select: { name: true, email: true } });
    await castVote(was.id, { id, name: admin?.name || admin?.email || req.user?.email || id }, body.vote === "none" ? null : body.vote, body.note);
    res.json({ ...(await pageView(site, page, may, optsOf(req, body.lang))), row: was.id });
  }),
);

r.post(
  "/:feature/:page/:part/download",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    partOf(site, page, String(req.params.part), ["link"], may);
    if (!may.writeSettings) throw new AppError(403, "PERMISSION_DENIED", "Downloading the link isn't yours to do", { required: ["features:write"] });
    // Where the game server reaches this API: as this request came (behind a proxy, as it says it came).
    const proto = String(req.get("x-forwarded-proto") ?? req.protocol).split(",")[0].trim();
    const host = String(req.get("x-forwarded-host") ?? req.get("host") ?? "").split(",")[0].trim();
    const lang = langOf(req.body?.lang);
    const file = await linkDownload(site.featureId, `${proto}://${host}/v1/link`, lang, site.name);
    if (!file) throw new AppError(409, "LINK_GAME", "This site's game has no link yet");
    res.setHeader("Content-Type", file.type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(file.data);
  }),
);

const MoveBody = z.object({ row: z.string().min(1).max(40), to: z.string().min(1).max(60), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
r.post(
  "/:feature/:page/:part/move",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["kanban", "calendar"], may);
    const body = MoveBody.parse(req.body ?? {});
    const { table, was } = await rowToChange(site, part.table, body.row, may);
    const field = part.kind === "kanban" ? part.field : part.date;
    if (field.startsWith("$")) throw new AppError(400, "CANT_MOVE", "This calendar's date is when the row came in: it doesn't move");
    if (part.kind === "kanban") {
      const options = ((table.fields.find((f) => f.id === field) as { options?: Array<{ id: string }> } | undefined)?.options ?? []).map((o) => o.id);
      if (!options.includes(body.to)) throw new AppError(400, "BAD_COLUMN", "No such column");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.to)) throw new AppError(400, "BAD_DAY", "A day like 2026-11-27");
    await changeRow(table, was, { values: { [field]: body.to }, lang: body.lang ?? "ar" });
    res.json(await pageView(site, page, may, optsOf(req, body.lang)));
  }),
);

const ActBody = z.object({ action: z.string().min(1).max(40), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
r.post(
  "/:feature/:page/:part/act",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["actions"], may);
    const body = ActBody.parse(req.body ?? {});
    const action = part.items.find((a) => a.key === body.action);
    if (!action) throw new AppError(404, "ACTION_NOT_FOUND", "No such action on this page");
    if (!may.writeSettings) throw new AppError(403, "PERMISSION_DENIED", "Changing the site's settings isn't yours to do", { required: ["features:write"] });
    await saveSiteSettings(site.featureId, { [action.setting]: action.value });
    const [now] = await sitePanels(site.featureId);
    res.json(await pageView(now, page, may, optsOf(req, body.lang)));
  }),
);

const checked = new Map<string, number>();
r.post(
  "/:feature/:page/:part/check",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    partOf(site, page, String(req.params.part), ["game"], may);
    if (!may.writeSettings) throw new AppError(403, "PERMISSION_DENIED", "Asking the game server isn't yours to do", { required: ["features:write"] });
    // Not a way to hammer a server: once in 10 seconds for a site.
    const last = checked.get(site.featureId) ?? 0;
    if (Date.now() - last < 10_000) throw new AppError(429, "TOO_SOON", "Asked a moment ago: try again in a few seconds");
    checked.set(site.featureId, Date.now());
    await readSite(site.featureId);
    res.json(await pageView(site, page, may, optsOf(req)));
  }),
);

r.put(
  "/:feature/:page/layout",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    if (!may.writeSettings) throw new AppError(403, "PERMISSION_DENIED", "Arranging the site's panel isn't yours to do", { required: ["features:write"] });
    const saved = await saveLayout(site, page.key, req.body ?? {});
    if (!saved.ok) throw new AppError(400, "BAD_LAYOUT", "The page can't be arranged this way", { problems: saved.problems });
    const [now] = await sitePanels(site.featureId);
    res.json(await pageView(now, now.panel.find((p) => p.key === page.key)!, may, optsOf(req)));
  }),
);

r.get(
  "/:feature/:page/:part/people",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["people"], may);
    res.json(await peopleSearch(site, part, may, String(req.query.q ?? ""), langOf(req.query.lang)));
  }),
);

r.get(
  "/:feature/:page/:part/find",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["scanner"], may);
    const row = await findByCode(site, part, String(req.query.code ?? ""));
    if (!row) throw new AppError(404, "CODE_NOT_FOUND", "No row has this code");
    res.json({ row });
  }),
);

r.get(
  "/:feature/:page/:part/export",
  asyncHandler(async (req, res) => {
    const { site, page, may } = await pageOf(req);
    const part = partOf(site, page, String(req.params.part), ["report"], may);
    const file = await reportCsv(site, part, text(req.query.period), langOf(req.query.lang));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`);
    res.send(file.body);
  }),
);

export default r;
