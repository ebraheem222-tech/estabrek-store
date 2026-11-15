/**
 * The automatic API from the admin's side (admin → الـ API والمفاتيح; B4): which tables are open
 * to the outside and for what, and the keys. The routes the outside calls are modules/data.
 * Needs api:read to look and api:write to change (mounted with them in admin.routes.ts).
 *
 * GET    /admin/api                  — every table with its access, the keys, the limits
 * PUT    /admin/api/tables/:id       { read, create, update, delete } — each "off" | "key" | "public" (update and delete: never "public")
 * POST   /admin/api/keys             { name, scopes: { tables: "*" | [ids], acts }, perMinute?, expiresAt? } — answers the key itself, once
 * PATCH  /admin/api/keys/:id         { name?, scopes?, perMinute?, expiresAt? }
 * POST   /admin/api/keys/:id/revoke  — stops working at once; stays in the list
 * DELETE /admin/api/keys/:id         — gone from the list too
 */
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import type { Field } from "../../lib/collectionTree.js";
import { ACTS, KEY_LIMITS, ScopesSchema, forgetKeys, keyView, newSecret } from "../../lib/apiKeys.js";
import { API_LIMITS, AccessSchema, WHO, accessOf, fieldView, isOpen } from "../../lib/dataApi.js";

const r = Router();
export const DATA_API_BASE = "/v1/data";

const tableView = (c: { id: string; slug: string; name: unknown; fields: unknown; api: unknown }) => {
  const access = accessOf(c.api);
  return { id: c.id, slug: c.slug, name: c.name, access, open: isOpen(access), fields: ((Array.isArray(c.fields) ? c.fields : []) as Field[]).map(fieldView) };
};
const TABLE = { id: true, slug: true, name: true, fields: true, api: true } as const;

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [tables, keys] = await Promise.all([
      prisma.collection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: TABLE }),
      prisma.apiKey.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
    ]);
    const now = Date.now();
    res.json({ base: DATA_API_BASE, who: WHO, acts: ACTS, limits: { ...KEY_LIMITS, pageSize: API_LIMITS.pageSize, publicWritesPerMinute: API_LIMITS.publicWritesPerMinute }, tables: tables.map(tableView), keys: keys.map((k) => keyView(k, now)), now });
  }),
);

r.put(
  "/tables/:id",
  asyncHandler(async (req, res) => {
    const access = AccessSchema.parse(req.body ?? {});
    const id = String(req.params.id);
    if (!(await prisma.collection.findUnique({ where: { id }, select: { id: true } }))) throw new AppError(404, "NOT_FOUND", "No such table");
    // `updatedAt` is the table's own (its fields, its name): opening its API doesn't touch it.
    await prisma.$executeRaw`UPDATE "Collection" SET "api" = ${JSON.stringify(access)}::jsonb WHERE "id" = ${id}`;
    res.json(tableView(await prisma.collection.findUniqueOrThrow({ where: { id }, select: TABLE })));
  }),
);

/* ---------------- Keys ---------------- */

/** A day ("2026-12-31", through its end) or a moment; null = never. */
const Expiry = z.union([z.null(), z.string().trim().min(8).max(40)]).transform((v, ctx) => {
  if (v === null) return null;
  const at = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T23:59:59.999Z`) : new Date(v);
  if (Number.isNaN(at.getTime())) {
    ctx.addIssue({ code: "custom", message: "A date like 2026-12-31" });
    return z.NEVER;
  }
  return at;
});
const Name = z.string().trim().min(1, "A key needs a name").max(KEY_LIMITS.name);
const PerMinute = z.number().int().min(KEY_LIMITS.perMinute.min).max(KEY_LIMITS.perMinute.max);
const KeyBody = z.object({ name: Name, scopes: ScopesSchema, perMinute: PerMinute.default(KEY_LIMITS.perMinute.default), expiresAt: Expiry.optional() }).strict();
const KeyPatch = z.object({ name: Name.optional(), scopes: ScopesSchema.optional(), perMinute: PerMinute.optional(), expiresAt: Expiry.optional() }).strict();

/** The scopes to keep: each act once, each table once and really there. */
async function checkedScopes(scopes: z.infer<typeof ScopesSchema>): Promise<Prisma.InputJsonValue> {
  const acts = ACTS.filter((a) => scopes.acts.includes(a));
  if (scopes.tables === "*") return { tables: "*", acts };
  const ids = [...new Set(scopes.tables)];
  if (!ids.length) throw new AppError(400, "KEY_INVALID", "A key needs at least one table (or every table)");
  const have = new Set((await prisma.collection.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((c) => c.id));
  const missing = ids.filter((id) => !have.has(id));
  if (missing.length) throw new AppError(400, "KEY_INVALID", "No such table", { tables: missing });
  return { tables: ids, acts };
}
const future = (at: Date | null | undefined) => {
  if (at && at.getTime() <= Date.now()) throw new AppError(400, "KEY_INVALID", "The day a key ends has to be ahead");
};

r.post(
  "/keys",
  asyncHandler(async (req, res) => {
    const body = KeyBody.parse(req.body ?? {});
    future(body.expiresAt);
    if ((await prisma.apiKey.count()) >= KEY_LIMITS.keys) throw new AppError(400, "TOO_MANY_KEYS", `Up to ${KEY_LIMITS.keys} keys; delete one that isn't used`);
    const made = newSecret();
    const key = await prisma.apiKey.create({ data: { name: body.name, prefix: made.prefix, hash: made.hash, scopes: await checkedScopes(body.scopes), perMinute: body.perMinute, expiresAt: body.expiresAt ?? null, createdBy: req.access?.email ?? null } });
    // The only time the key itself is answered: it isn't kept, so it can't be shown again.
    res.status(201).json({ key: keyView(key), secret: made.secret });
  }),
);

r.patch(
  "/keys/:id",
  asyncHandler(async (req, res) => {
    const body = KeyPatch.parse(req.body ?? {});
    const was = await prisma.apiKey.findUnique({ where: { id: String(req.params.id) } });
    if (!was) throw new AppError(404, "NOT_FOUND", "No such key");
    if (was.revokedAt) throw new AppError(409, "KEY_REVOKED", "A revoked key stays revoked; make a new one");
    future(body.expiresAt);
    const key = await prisma.apiKey.update({
      where: { id: was.id },
      data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(body.scopes ? { scopes: await checkedScopes(body.scopes) } : {}), ...(body.perMinute !== undefined ? { perMinute: body.perMinute } : {}), ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}) },
    });
    forgetKeys();
    res.json({ key: keyView(key) });
  }),
);

r.post(
  "/keys/:id/revoke",
  asyncHandler(async (req, res) => {
    const was = await prisma.apiKey.findUnique({ where: { id: String(req.params.id) } });
    if (!was) throw new AppError(404, "NOT_FOUND", "No such key");
    const key = was.revokedAt ? was : await prisma.apiKey.update({ where: { id: was.id }, data: { revokedAt: new Date() } });
    forgetKeys();
    res.json({ key: keyView(key) });
  }),
);

r.delete(
  "/keys/:id",
  asyncHandler(async (req, res) => {
    const gone = await prisma.apiKey.deleteMany({ where: { id: String(req.params.id) } });
    if (!gone.count) throw new AppError(404, "NOT_FOUND", "No such key");
    forgetKeys();
    res.json({ ok: true });
  }),
);

export default r;
