import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { HTTP_LIMITS, forgetConnections } from "../../lib/fnHttp.js";
import { SECRET_NAME, siteOf } from "../../lib/fnSites.js";
import { seal } from "../../lib/secretBox.js";

/**
 * /v1/admin/connections — الاتصالات والأسرار (F5): what the owner's functions may reach outside.
 *
 * - Sites: the hosts an "http" step may call ("api.telegram.org", "*.example.com"). Nothing else
 *   is called, whatever a function's steps say.
 * - Secrets: keys of outside services. A secret is written here and never read back: no route
 *   answers its value, to anyone. A step names it ({{secret.TELEGRAM_TOKEN}}) and the server puts
 *   it into the request as it leaves, and only to the sites the secret is for.
 *
 * Looking needs connections:read, changing connections:write (admin.routes.ts): a member may
 * build functions without being able to open a new way out of the store.
 *
 * GET    /admin/connections                — the sites, the secrets (names, sites, where used; never a value), the limits
 * POST   /admin/connections/sites          { host, note? }
 * DELETE /admin/connections/sites/:host
 * POST   /admin/connections/secrets        { name, value, sites, note? }
 * PUT    /admin/connections/secrets/:id    { value?, sites?, note? } — a new value replaces the old; the name stays
 * DELETE /admin/connections/secrets/:id    — refused (409) while a function names it
 */
const r = Router();

const Note = z.string().trim().max(200);
const Host = z.string().trim().max(200);
const Value = z.string().min(1).max(HTTP_LIMITS.value);
const Sites = z.array(Host).min(1).max(10);
const SiteBody = z.object({ host: Host, note: Note.optional() }).strict();
const SecretBody = z.object({ name: z.string().trim().regex(SECRET_NAME, "A secret's name is capitals, digits and _ (TELEGRAM_TOKEN)"), value: Value, sites: Sites, note: Note.optional() }).strict();
const SecretPatch = z.object({ value: Value.optional(), sites: Sites.optional(), note: Note.nullable().optional() }).strict();

/** A site as it is kept, or a refusal that says what one looks like. */
function site(raw: string): string {
  const host = siteOf(raw);
  if (!host) throw new AppError(400, "SITE_INVALID", "A site is a name like api.example.com, or *.example.com for every name under it", { at: "host" });
  return host;
}

/** The functions that name each secret (in their draft or in what is published). */
async function usedBy(names: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>(names.map((n) => [n, []]));
  if (!names.length) return out;
  const fns = await prisma.fn.findMany({ select: { name: true, draft: true, live: true } });
  for (const f of fns) {
    const text = `${JSON.stringify(f.draft ?? null)} ${JSON.stringify(f.live ?? null)}`;
    for (const n of names) if (new RegExp(`\\{\\{\\s*secret\\.${n}\\s*\\}\\}`).test(text)) out.get(n)!.push(f.name);
  }
  return out;
}

async function everything() {
  const [sites, secrets] = await Promise.all([prisma.fnSite.findMany({ orderBy: [{ createdAt: "asc" }, { host: "asc" }] }), prisma.fnSecret.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] })]);
  const used = await usedBy(secrets.map((s) => s.name));
  return {
    sites: sites.map((s) => ({ host: s.host, note: s.note, createdAt: s.createdAt })),
    // Never the value, nor anything made from it.
    secrets: secrets.map((s) => ({ id: s.id, name: s.name, sites: s.sites, note: s.note, updatedAt: s.updatedAt, lastUsedAt: s.lastUsedAt, usedBy: used.get(s.name) ?? [] })),
    limits: { sites: HTTP_LIMITS.sites, secrets: HTTP_LIMITS.secrets, value: HTTP_LIMITS.value, ms: HTTP_LIMITS.ms, calls: HTTP_LIMITS.calls },
  };
}
const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await everything());
  }),
);

r.post(
  "/sites",
  asyncHandler(async (req, res) => {
    const body = SiteBody.parse(req.body ?? {});
    const host = site(body.host);
    if ((await prisma.fnSite.count()) >= HTTP_LIMITS.sites) throw new AppError(400, "TOO_MANY_SITES", `Up to ${HTTP_LIMITS.sites} sites`);
    try {
      await prisma.fnSite.create({ data: { host, note: body.note || null } });
    } catch (e) {
      if (!taken(e)) throw e;
      // Allowed already: nothing to do.
    }
    forgetConnections();
    res.status(201).json(await everything());
  }),
);

r.delete(
  "/sites/:host",
  asyncHandler(async (req, res) => {
    const gone = await prisma.fnSite.deleteMany({ where: { host: String(req.params.host).toLowerCase() } });
    if (!gone.count) throw new AppError(404, "SITE_NOT_FOUND", "No such site");
    forgetConnections();
    res.json(await everything());
  }),
);

r.post(
  "/secrets",
  asyncHandler(async (req: Request, res) => {
    const body = SecretBody.parse(req.body ?? {});
    if ((await prisma.fnSecret.count()) >= HTTP_LIMITS.secrets) throw new AppError(400, "TOO_MANY_SECRETS", `Up to ${HTTP_LIMITS.secrets} secrets`);
    try {
      await prisma.fnSecret.create({ data: { name: body.name, sealed: seal(body.value), sites: [...new Set(body.sites.map(site))], note: body.note || null, createdById: req.access?.email ?? null } });
    } catch (e) {
      if (taken(e)) throw new AppError(409, "SECRET_TAKEN", "A secret has this name already: give it a new value there", { at: "name" });
      throw e;
    }
    forgetConnections();
    res.status(201).json(await everything());
  }),
);

r.put(
  "/secrets/:id",
  asyncHandler(async (req, res) => {
    const body = SecretPatch.parse(req.body ?? {});
    const kept = await prisma.fnSecret.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
    if (!kept) throw new AppError(404, "SECRET_NOT_FOUND", "No such secret");
    await prisma.fnSecret.update({
      where: { id: kept.id },
      data: { ...(body.value !== undefined ? { sealed: seal(body.value) } : {}), ...(body.sites ? { sites: [...new Set(body.sites.map(site))] } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}) },
    });
    forgetConnections();
    res.json(await everything());
  }),
);

r.delete(
  "/secrets/:id",
  asyncHandler(async (req, res) => {
    const kept = await prisma.fnSecret.findUnique({ where: { id: String(req.params.id) }, select: { id: true, name: true } });
    if (!kept) throw new AppError(404, "SECRET_NOT_FOUND", "No such secret");
    // A function that names it would stop working.
    const users = (await usedBy([kept.name])).get(kept.name) ?? [];
    if (users.length) throw new AppError(409, "SECRET_USED", "A function uses this secret", { functions: users });
    await prisma.fnSecret.delete({ where: { id: kept.id } });
    forgetConnections();
    res.json(await everything());
  }),
);

export default r;
