import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { LocalSchema, PRESET_ROLES, ROLE_LIMITS, RoleKeySchema, uniq } from "../../lib/shopperRoles.js";
import { forgetShoppers } from "../../middleware/apiCaller.js";

/**
 * /v1/admin/shopper-roles — الزبائن → الأدوار والمجموعات (lib/shopperRoles.ts): the roles the owner gives shoppers
 * and the groups shoppers are in. Looking needs customers:read, changing customers:write (admin.routes.ts).
 *
 * GET    /admin/shopper-roles                    — the roles and groups with how many shoppers hold each, the presets, the limits
 * POST   /admin/shopper-roles/roles              { key, name, note? }  (or { preset: "seller" })
 * PATCH  /admin/shopper-roles/roles/:key         { name?, note? }  (a key never changes: tables and functions name it)
 * DELETE /admin/shopper-roles/roles/:key         — taken from every shopper too
 * POST   /admin/shopper-roles/groups             { name, note? }
 * PATCH  /admin/shopper-roles/groups/:id         { name?, note? }
 * DELETE /admin/shopper-roles/groups/:id         — every member leaves it
 * GET    /admin/shopper-roles/groups/:id/members — its members
 * POST   /admin/shopper-roles/groups/:id/members { emails } — shoppers with these emails join (the others are said)
 * DELETE /admin/shopper-roles/groups/:id/members/:user
 * PUT    /admin/shopper-roles/shoppers/:user     { roles?, groups? } — one shopper's roles and groups, as a whole
 */
const r = Router();

const invalid = (issues: Array<{ path: string; message: string }>) => new AppError(400, "VALIDATION_ERROR", "Some values are wrong", { issues });
function parsed<T>(schema: z.ZodType<T>, body: unknown): T {
  const out = schema.safeParse(body ?? {});
  if (!out.success) throw invalid(out.error.issues.slice(0, 10).map((i) => ({ path: i.path.map(String).join("."), message: i.message })));
  return out.data;
}
const Note = z.string().trim().max(ROLE_LIMITS.note).optional();
const named = (name: z.infer<typeof LocalSchema>) => Object.values(name).some((v) => !!v?.trim());
const MakeRole = z.union([z.object({ preset: z.enum(PRESET_ROLES.map((p) => p.key) as [string, ...string[]]) }).strict(), z.object({ key: RoleKeySchema, name: LocalSchema.refine(named, "A role has a name"), note: Note }).strict()]);
const ChangeRole = z.object({ name: LocalSchema.refine(named, "A role has a name").optional(), note: Note.nullable() }).strict();
const GroupName = z.string().trim().min(1).max(ROLE_LIMITS.name);
const MakeGroup = z.object({ name: GroupName, note: Note }).strict();
const ChangeGroup = z.object({ name: GroupName.optional(), note: Note.nullable() }).strict();
const Members = z.object({ emails: z.array(z.string().trim().toLowerCase().max(160)).min(1).max(200) }).strict();
const Shopper = z.object({ roles: z.array(RoleKeySchema).max(ROLE_LIMITS.rolesPerShopper).optional(), groups: z.array(z.string().min(1).max(40)).max(ROLE_LIMITS.groupsPerShopper).optional() }).strict();

/** How many shoppers hold each role and are in each group. */
async function counts() {
  const [roles, groups] = await Promise.all([
    prisma.$queryRaw<Array<{ k: string; n: bigint }>>`SELECT unnest("roles") AS k, count(*) AS n FROM "User" GROUP BY 1`,
    prisma.$queryRaw<Array<{ k: string; n: bigint }>>`SELECT unnest("groups") AS k, count(*) AS n FROM "User" GROUP BY 1`,
  ]);
  return { roles: new Map(roles.map((x) => [x.k, Number(x.n)])), groups: new Map(groups.map((x) => [x.k, Number(x.n)])) };
}

async function overview() {
  const [roles, groups, n] = await Promise.all([prisma.shopperRole.findMany({ orderBy: { createdAt: "asc" } }), prisma.shopperGroup.findMany({ orderBy: { name: "asc" } }), counts()]);
  return {
    roles: roles.map((x) => ({ key: x.key, name: x.name, note: x.note, shoppers: n.roles.get(x.key) ?? 0, createdAt: x.createdAt })),
    groups: groups.map((g) => ({ id: g.id, name: g.name, note: g.note, members: n.groups.get(g.id) ?? 0, createdAt: g.createdAt })),
    presets: PRESET_ROLES.filter((p) => !roles.some((x) => x.key === p.key)),
    limits: ROLE_LIMITS,
  };
}

r.get("/", asyncHandler(async (_req, res) => res.json(await overview())));

r.post(
  "/roles",
  asyncHandler(async (req: Request, res) => {
    const body = parsed(MakeRole, req.body);
    const made = "preset" in body ? PRESET_ROLES.find((p) => p.key === body.preset)! : { key: body.key, name: body.name, note: body.note };
    if ((await prisma.shopperRole.count()) >= ROLE_LIMITS.roles) throw new AppError(409, "ROLES_LIMIT", `Up to ${ROLE_LIMITS.roles} roles`);
    if (await prisma.shopperRole.findUnique({ where: { key: made.key } })) throw new AppError(409, "ROLE_TAKEN", "There is a role with this key already");
    await prisma.shopperRole.create({ data: { key: made.key, name: made.name as Prisma.InputJsonValue, note: ("note" in made ? made.note : null) || null } });
    res.status(201).json(await overview());
  }),
);

r.patch(
  "/roles/:key",
  asyncHandler(async (req: Request, res) => {
    const body = parsed(ChangeRole, req.body);
    const key = String(req.params.key);
    if (!(await prisma.shopperRole.findUnique({ where: { key } }))) throw new AppError(404, "NOT_FOUND", "No such role");
    await prisma.shopperRole.update({ where: { key }, data: { ...(body.name ? { name: body.name as Prisma.InputJsonValue } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}) } });
    res.json(await overview());
  }),
);

r.delete(
  "/roles/:key",
  asyncHandler(async (req: Request, res) => {
    const key = String(req.params.key);
    if (!(await prisma.shopperRole.findUnique({ where: { key } }))) throw new AppError(404, "NOT_FOUND", "No such role");
    // Taken from every shopper with it; a table or a door that named it just no longer finds anyone holding it.
    await prisma.$transaction([prisma.$executeRaw`UPDATE "User" SET "roles" = array_remove("roles", ${key}) WHERE ${key} = ANY("roles")`, prisma.shopperRole.delete({ where: { key } })]);
    forgetShoppers();
    res.json(await overview());
  }),
);

r.post(
  "/groups",
  asyncHandler(async (req: Request, res) => {
    const body = parsed(MakeGroup, req.body);
    if ((await prisma.shopperGroup.count()) >= ROLE_LIMITS.groups) throw new AppError(409, "GROUPS_LIMIT", `Up to ${ROLE_LIMITS.groups} groups`);
    if (await prisma.shopperGroup.findUnique({ where: { name: body.name } })) throw new AppError(409, "GROUP_TAKEN", "There is a group with this name already");
    const g = await prisma.shopperGroup.create({ data: { name: body.name, note: body.note || null } });
    res.status(201).json({ ...(await overview()), made: g.id });
  }),
);

const groupOr404 = async (id: string) => {
  const g = await prisma.shopperGroup.findUnique({ where: { id } });
  if (!g) throw new AppError(404, "NOT_FOUND", "No such group");
  return g;
};

r.patch(
  "/groups/:id",
  asyncHandler(async (req: Request, res) => {
    const body = parsed(ChangeGroup, req.body);
    const g = await groupOr404(String(req.params.id));
    if (body.name && body.name !== g.name && (await prisma.shopperGroup.findUnique({ where: { name: body.name } }))) throw new AppError(409, "GROUP_TAKEN", "There is a group with this name already");
    await prisma.shopperGroup.update({ where: { id: g.id }, data: { ...(body.name ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}) } });
    res.json(await overview());
  }),
);

r.delete(
  "/groups/:id",
  asyncHandler(async (req: Request, res) => {
    const g = await groupOr404(String(req.params.id));
    await prisma.$transaction([prisma.$executeRaw`UPDATE "User" SET "groups" = array_remove("groups", ${g.id}) WHERE ${g.id} = ANY("groups")`, prisma.shopperGroup.delete({ where: { id: g.id } })]);
    forgetShoppers();
    res.json(await overview());
  }),
);

const memberView = (u: { id: string; name: string; email: string; roles: string[] }) => ({ id: u.id, name: u.name, email: u.email, roles: u.roles });

r.get(
  "/groups/:id/members",
  asyncHandler(async (req: Request, res) => {
    const g = await groupOr404(String(req.params.id));
    const members = await prisma.user.findMany({ where: { groups: { has: g.id } }, orderBy: { email: "asc" }, take: ROLE_LIMITS.members, select: { id: true, name: true, email: true, roles: true } });
    res.json({ group: { id: g.id, name: g.name, note: g.note }, members: members.map(memberView) });
  }),
);

r.post(
  "/groups/:id/members",
  asyncHandler(async (req: Request, res) => {
    const g = await groupOr404(String(req.params.id));
    const { emails } = parsed(Members, req.body);
    const asked = uniq(emails.filter(Boolean));
    const users = await prisma.user.findMany({ where: { email: { in: asked } }, select: { id: true, email: true, groups: true } });
    const full = users.filter((u) => !u.groups.includes(g.id) && u.groups.length >= ROLE_LIMITS.groupsPerShopper).map((u) => u.email);
    const joining = users.filter((u) => !u.groups.includes(g.id) && u.groups.length < ROLE_LIMITS.groupsPerShopper);
    if ((await prisma.user.count({ where: { groups: { has: g.id } } })) + joining.length > ROLE_LIMITS.members) throw new AppError(409, "MEMBERS_LIMIT", `A group has up to ${ROLE_LIMITS.members} members`);
    for (const u of joining) await prisma.user.update({ where: { id: u.id }, data: { groups: { push: g.id } } });
    forgetShoppers();
    res.json({ added: joining.map((u) => u.email), already: users.filter((u) => u.groups.includes(g.id)).map((u) => u.email), unknown: asked.filter((e) => !users.some((u) => u.email === e)), full });
  }),
);

r.delete(
  "/groups/:id/members/:user",
  asyncHandler(async (req: Request, res) => {
    const g = await groupOr404(String(req.params.id));
    await prisma.$executeRaw`UPDATE "User" SET "groups" = array_remove("groups", ${g.id}) WHERE "id" = ${String(req.params.user)}`;
    forgetShoppers();
    res.json({ ok: true });
  }),
);

r.put(
  "/shoppers/:user",
  asyncHandler(async (req: Request, res) => {
    const body = parsed(Shopper, req.body);
    const user = await prisma.user.findUnique({ where: { id: String(req.params.user) }, select: { id: true } });
    if (!user) throw new AppError(404, "NOT_FOUND", "No such shopper");
    const roles = body.roles ? uniq(body.roles) : undefined;
    const groups = body.groups ? uniq(body.groups) : undefined;
    // Only the roles and groups there are.
    if (roles?.length) {
      const known = new Set((await prisma.shopperRole.findMany({ where: { key: { in: roles } }, select: { key: true } })).map((x) => x.key));
      const missing = roles.filter((k) => !known.has(k));
      if (missing.length) throw invalid(missing.map((k) => ({ path: "roles", message: `No role "${k}"` })));
    }
    if (groups?.length) {
      const known = new Set((await prisma.shopperGroup.findMany({ where: { id: { in: groups } }, select: { id: true } })).map((x) => x.id));
      const missing = groups.filter((k) => !known.has(k));
      if (missing.length) throw invalid(missing.map((k) => ({ path: "groups", message: `No group "${k}"` })));
    }
    const saved = await prisma.user.update({ where: { id: user.id }, data: { ...(roles ? { roles } : {}), ...(groups ? { groups } : {}) }, select: { id: true, roles: true, groups: true } });
    forgetShoppers();
    res.json(saved);
  }),
);

export default r;
