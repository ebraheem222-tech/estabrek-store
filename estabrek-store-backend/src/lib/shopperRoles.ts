/**
 * App users (stage 2, item 3): roles and groups for shoppers (admin → الزبائن → الأدوار والمجموعات).
 *
 * - A **role** is a key the owner gives shoppers ("seller", "moderator"…), with a name in the store's languages.
 *   A table can let the holders of a role do an act on **every** row (lib/dataApi.ts `roles`): a moderator reads
 *   and publishes everyone's posts, a seller changes every listing. They still never see a key's private fields.
 *   A function's door can be for the holders of a role only (lib/fnTriggers.ts), and a run knows the caller's
 *   roles ({{caller.roles}}).
 * - A **group** is a set of shoppers (a team, a class, a family). A table can let a shopper read their group's rows
 *   too (lib/dataApi.ts `group`): the rows any fellow member added. Changing and deleting stay with the one who
 *   added a row (or a role).
 * A shopper holds role keys and group ids (User.roles, User.groups). Nothing here is the admin's own staff roles.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { ROLE_KEY, ROLES_PER_ACT } from "./dataApi.js";

export { ROLE_KEY };
export const ROLE_LIMITS = { roles: 30, groups: 200, rolesPerShopper: 10, groupsPerShopper: 20, rolesPerAct: ROLES_PER_ACT, name: 60, note: 300, members: 2000, /** Fellow members a read looks through at most. */ mates: 5000 } as const;

export type Local = Partial<Record<"ar" | "en" | "he", string>>;
/** Ready to add with one tap: the three the plan names. */
export const PRESET_ROLES: Array<{ key: string; name: Local }> = [
  { key: "member", name: { ar: "عضو", en: "Member", he: "חבר" } },
  { key: "moderator", name: { ar: "مشرف", en: "Moderator", he: "מנחה" } },
  { key: "seller", name: { ar: "بائع", en: "Seller", he: "מוכר" } },
];

export const RoleKeySchema = z.string().trim().regex(ROLE_KEY, "A role's key: small letters, digits, - and _ (2 to 31)");
export const LocalSchema = z.object({ ar: z.string().trim().max(ROLE_LIMITS.name).optional(), en: z.string().trim().max(ROLE_LIMITS.name).optional(), he: z.string().trim().max(ROLE_LIMITS.name).optional() }).strict();

/** A list of role keys as kept: each once, in order. */
export const uniq = (list: readonly string[]) => [...new Set(list)];

/**
 * The shoppers who share a group with these ones' holder (their ids, the holder's own included), for "their group's
 * rows". Empty without groups.
 */
export async function groupMates(groups: readonly string[]): Promise<string[]> {
  if (!groups.length) return [];
  const mates = await prisma.user.findMany({ where: { groups: { hasSome: [...groups] }, status: "ACTIVE" }, select: { id: true }, take: ROLE_LIMITS.mates });
  return mates.map((m) => m.id);
}

/** The roles that exist (their keys): a table or a door naming one that doesn't is refused. */
export async function roleKeys(): Promise<Set<string>> {
  return new Set((await prisma.shopperRole.findMany({ select: { key: true } })).map((r) => r.key));
}
