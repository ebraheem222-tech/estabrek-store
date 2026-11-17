import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { HTTP_LIMITS, forgetConnections } from "../../lib/fnHttp.js";
import { SECRET_NAME, siteOf } from "../../lib/fnSites.js";
import { seal } from "../../lib/secretBox.js";
import { READY_KINDS, READY_LIMITS, kindOf, kindsOut, settingsOf } from "../../lib/fnKinds.js";
import { forgetReady, tryReady } from "../../lib/fnReady.js";

/**
 * /v1/admin/connections — الاتصالات والأسرار (F5): what the owner's functions may reach outside.
 *
 * - Sites: the hosts an "http" step may call ("api.telegram.org", "*.example.com"). Nothing else
 *   is called, whatever a function's steps say.
 * - Secrets: keys of outside services. A secret is written here and never read back: no route
 *   answers its value, to anyone. A step names it ({{secret.TELEGRAM_TOKEN}}) and the server puts
 *   it into the request as it leaves, and only to the sites the secret is for.
 *
 * - Ready connections: a service connected once (Telegram, Slack; lib/fnKinds.ts), with its key
 *   and a few settings. A function's "ready" step picks one, and no address or key is written in
 *   the step. The key is kept as a secret is: sealed, and answered to no one.
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
 * POST   /admin/connections/ready          { kind, name, key, settings? }
 * PUT    /admin/connections/ready/:id      { name?, key?, settings? } — a new key replaces the old
 * DELETE /admin/connections/ready/:id      — refused (409) while a function uses it
 * POST   /admin/connections/ready/:id/test { line? } — the key tried for real: { ok, status, said, why, sends }
 */
const r = Router();

const Note = z.string().trim().max(200);
const Host = z.string().trim().max(200);
const Value = z.string().min(1).max(HTTP_LIMITS.value);
const Sites = z.array(Host).min(1).max(10);
const SiteBody = z.object({ host: Host, note: Note.optional() }).strict();
const SecretBody = z.object({ name: z.string().trim().regex(SECRET_NAME, "A secret's name is capitals, digits and _ (TELEGRAM_TOKEN)"), value: Value, sites: Sites, note: Note.optional() }).strict();
const SecretPatch = z.object({ value: Value.optional(), sites: Sites.optional(), note: Note.nullable().optional() }).strict();
const ReadyName = z.string().trim().min(1).max(READY_LIMITS.name);
const ReadyKey = z.string().min(1).max(READY_LIMITS.key);
const ReadyBody = z.object({ kind: z.enum(READY_KINDS), name: ReadyName, key: ReadyKey, settings: z.unknown().optional() }).strict();
const ReadyPatch = z.object({ name: ReadyName.optional(), key: ReadyKey.optional(), settings: z.unknown().optional() }).strict();
const TestBody = z.object({ line: z.string().trim().max(READY_LIMITS.test).optional() }).strict();

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

/** The functions that use each ready connection (a "ready" step names it by its id). */
async function readyUsedBy(ids: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  if (!ids.length) return out;
  const fns = await prisma.fn.findMany({ select: { name: true, draft: true, live: true } });
  for (const f of fns) {
    const text = `${JSON.stringify(f.draft ?? null)} ${JSON.stringify(f.live ?? null)}`;
    for (const id of ids) if (text.includes(`"via":${JSON.stringify(id)}`)) out.get(id)!.push(f.name);
  }
  return out;
}

/** The kind's key and settings as they are kept, or a refusal that says what they look like. */
function keyOf(kind: NonNullable<ReturnType<typeof kindOf>>, typed: string): string {
  const key = kind.key(typed);
  if (!key) throw new AppError(400, "KEY_INVALID", kind.keyLooks, { at: "key" });
  return key;
}
function settingsFor(kind: NonNullable<ReturnType<typeof kindOf>>, raw: unknown): Record<string, string> {
  const settings = settingsOf(kind, raw);
  if (!settings) throw new AppError(400, "SETTING_INVALID", "A setting is a short plain value", { at: "settings" });
  return settings;
}

async function everything() {
  const [sites, secrets, ready] = await Promise.all([
    prisma.fnSite.findMany({ orderBy: [{ createdAt: "asc" }, { host: "asc" }] }),
    prisma.fnSecret.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.fnConnection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ]);
  const [used, readyUsed] = await Promise.all([usedBy(secrets.map((s) => s.name)), readyUsedBy(ready.map((c) => c.id))]);
  return {
    // The ready connections: never the key, nor anything made from it.
    ready: ready.map((c) => ({ id: c.id, kind: c.kind, name: c.name, settings: c.settings ?? {}, updatedAt: c.updatedAt, lastUsedAt: c.lastUsedAt, usedBy: readyUsed.get(c.id) ?? [] })),
    // What each kind asks for and can do.
    kinds: kindsOut(),
    sites: sites.map((s) => ({ host: s.host, note: s.note, createdAt: s.createdAt })),
    // Never the value, nor anything made from it.
    secrets: secrets.map((s) => ({ id: s.id, name: s.name, sites: s.sites, note: s.note, updatedAt: s.updatedAt, lastUsedAt: s.lastUsedAt, usedBy: used.get(s.name) ?? [] })),
    limits: { sites: HTTP_LIMITS.sites, secrets: HTTP_LIMITS.secrets, value: HTTP_LIMITS.value, ms: HTTP_LIMITS.ms, calls: HTTP_LIMITS.calls, ready: READY_LIMITS.connections },
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

r.post(
  "/ready",
  asyncHandler(async (req: Request, res) => {
    const body = ReadyBody.parse(req.body ?? {});
    const kind = kindOf(body.kind)!;
    const key = keyOf(kind, body.key);
    // (And what is worked out from the key: a service account's address, to share a sheet with.)
    const settings = { ...settingsFor(kind, body.settings), ...(kind.derive?.(key) ?? {}) };
    if ((await prisma.fnConnection.count()) >= READY_LIMITS.connections) throw new AppError(400, "TOO_MANY_CONNECTIONS", `Up to ${READY_LIMITS.connections} ready connections`);
    try {
      await prisma.fnConnection.create({ data: { kind: kind.kind, name: body.name, sealed: seal(key), settings, createdById: req.access?.email ?? null } });
    } catch (e) {
      if (taken(e)) throw new AppError(409, "CONNECTION_TAKEN", "A connection has this name already", { at: "name" });
      throw e;
    }
    forgetReady();
    res.status(201).json(await everything());
  }),
);

r.put(
  "/ready/:id",
  asyncHandler(async (req, res) => {
    const body = ReadyPatch.parse(req.body ?? {});
    const kept = await prisma.fnConnection.findUnique({ where: { id: String(req.params.id) }, select: { id: true, kind: true, settings: true } });
    const kind = kept ? kindOf(kept.kind) : null;
    if (!kept || !kind) throw new AppError(404, "CONNECTION_NOT_FOUND", "No such connection");
    const key = body.key !== undefined ? keyOf(kind, body.key) : null;
    // What is worked out from the key stays with the key: worked out again from a new one, kept as it was otherwise.
    const old = (kept.settings && typeof kept.settings === "object" && !Array.isArray(kept.settings) ? kept.settings : {}) as Record<string, string>;
    const isDerived = (id: string) => (kind.derived ?? []).includes(id);
    const own = body.settings !== undefined ? settingsFor(kind, body.settings) : Object.fromEntries(Object.entries(old).filter(([id]) => !isDerived(id)));
    const derived = key ? (kind.derive?.(key) ?? {}) : Object.fromEntries(Object.entries(old).filter(([id]) => isDerived(id)));
    try {
      await prisma.fnConnection.update({
        where: { id: kept.id },
        data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(key ? { sealed: seal(key) } : {}), ...(body.settings !== undefined || key ? { settings: { ...own, ...derived } } : {}) },
      });
    } catch (e) {
      if (taken(e)) throw new AppError(409, "CONNECTION_TAKEN", "A connection has this name already", { at: "name" });
      throw e;
    }
    forgetReady();
    res.json(await everything());
  }),
);

r.delete(
  "/ready/:id",
  asyncHandler(async (req, res) => {
    const kept = await prisma.fnConnection.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
    if (!kept) throw new AppError(404, "CONNECTION_NOT_FOUND", "No such connection");
    // A function that uses it would stop working.
    const users = (await readyUsedBy([kept.id])).get(kept.id) ?? [];
    if (users.length) throw new AppError(409, "CONNECTION_USED", "A function uses this connection", { functions: users });
    await prisma.fnConnection.delete({ where: { id: kept.id } });
    forgetReady();
    res.json(await everything());
  }),
);

r.post(
  "/ready/:id/test",
  asyncHandler(async (req, res) => {
    const body = TestBody.parse(req.body ?? {});
    const kept = await prisma.fnConnection.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
    if (!kept) throw new AppError(404, "CONNECTION_NOT_FOUND", "No such connection");
    // Read fresh: the key may have been written a moment ago, on another copy of the server.
    forgetReady();
    res.json(await tryReady(kept.id, body.line || "The store is connected."));
  }),
);

export default r;
