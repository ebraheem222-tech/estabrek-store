import type { Role } from "../types/auth";

export type AdminPermission =
  | "dashboard:read"
  | "account:read"
  | "account:write"
  | "catalog:read"
  | "catalog:write"
  | "inventory:read"
  | "inventory:write"
  | "discounts:read"
  | "discounts:write"
  | "orders:read"
  | "orders:write"
  | "outbox:read"
  | "outbox:write"
  | "ugc:read"
  | "ugc:write"
  | "chatbot:read"
  | "chatbot:write"
  | "pages:read"
  | "pages:write"
  | "pages:publish"
  | "nav:read"
  | "nav:write"
  | "settings:read"
  | "settings:write"
  | "security:read"
  | "security:write"
  | "audit:read"
  | "media:read"
  | "media:write"
  | "payments:write"
  | "staff:read"
  | "staff:write"
  | "activity:read"
  | "system:read"
  | "system:write"
  | "customers:read"
  | "customers:write"
  | "api:read"
  | "api:write"
  | "functions:read"
  | "functions:write"
  /** Not one of the server's: "may open the data grid" (every table through pages:read, or tables given one by one). */
  | "data:tables";

const ALL_PERMISSIONS: readonly AdminPermission[] = [
  "dashboard:read",
  "account:read",
  "account:write",
  "catalog:read",
  "catalog:write",
  "inventory:read",
  "inventory:write",
  "discounts:read",
  "discounts:write",
  "orders:read",
  "orders:write",
  "outbox:read",
  "outbox:write",
  "ugc:read",
  "ugc:write",
  "chatbot:read",
  "chatbot:write",
  "pages:read",
  "pages:write",
  "pages:publish",
  "nav:read",
  "nav:write",
  "settings:read",
  "settings:write",
  "security:read",
  "security:write",
  "audit:read",
  "media:read",
  "media:write",
  "payments:write",
  "staff:read",
  "staff:write",
  "activity:read",
  "system:read",
  "system:write",
  "customers:read",
  "customers:write",
  "api:read",
  "api:write",
  "functions:read",
  "functions:write",
  "data:tables",
];

/** Every signed-in member can manage their own account. */
const OWN_ACCOUNT: readonly AdminPermission[] = ["account:read", "account:write", "security:read", "security:write", "audit:read"];

const ROLE_PERMISSIONS: Record<Role, readonly AdminPermission[]> = {
  SUPERADMIN: ALL_PERMISSIONS,
  // Team members get theirs from the server (admin.permissions); this is the floor.
  STAFF: OWN_ACCOUNT,
  ADMIN: [
    "dashboard:read",
    "account:read",
    "account:write",
    "catalog:read",
    "catalog:write",
    "inventory:read",
    "inventory:write",
    "discounts:read",
    "discounts:write",
    "orders:read",
    "orders:write",
    "outbox:read",
    "outbox:write",
    "ugc:read",
    "chatbot:read",
    "chatbot:write",
    "pages:read",
    "pages:write",
    "pages:publish",
    "nav:read",
    "nav:write",
    "settings:read",
    "audit:read",
  ],
  EDITOR: [
    "dashboard:read",
    "account:read",
    "discounts:read",
    "chatbot:read",
    "pages:read",
    "pages:write",
    "nav:read",
    "nav:write",
    "audit:read",
  ],
  MARKETING: [
    "dashboard:read",
    "account:read",
    "pages:read",
    "pages:write",
    "pages:publish",
    "catalog:read",
    "discounts:read",
    "discounts:write",
    "ugc:read",
    "nav:read",
    "audit:read",
  ],
  SUPPORT: [
    "dashboard:read",
    "account:read",
    "orders:read",
    "orders:write",
    "catalog:read",
    "outbox:read",
    "outbox:write",
    "ugc:read",
    "chatbot:read",
    "audit:read",
  ],
};

export function getPermissionsForRole(role: Role | null | undefined): AdminPermission[] {
  if (!role) return [];
  const list = ROLE_PERMISSIONS[role] ?? [];
  return Array.from(new Set(list));
}

export function hasRolePermission(role: Role | null | undefined, permission: AdminPermission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

const KNOWN = new Set<string>(ALL_PERMISSIONS);

/**
 * What the signed-in admin may do. The server sends the list (owner, or the
 * team member's role); older servers only sent the role, so fall back to it.
 */
export function permissionsOf(
  admin: { role?: Role | null; owner?: boolean; permissions?: string[] | null } | null | undefined,
): AdminPermission[] {
  if (!admin) return [];
  if (admin.owner || admin.role === "SUPERADMIN") return [...ALL_PERMISSIONS];
  // The data grid opens for whoever has every table, or was given some one by one.
  const withGrid = (list: AdminPermission[], given: boolean) => (list.includes("pages:read") || given ? Array.from(new Set<AdminPermission>([...list, "data:tables"])) : list.filter((p) => p !== "data:tables"));
  if (Array.isArray(admin.permissions)) {
    return withGrid(Array.from(new Set(admin.permissions.filter((p): p is AdminPermission => KNOWN.has(p)))), admin.permissions.some((p) => TABLE_PERMISSION.test(p)));
  }
  return withGrid(getPermissionsForRole(admin.role ?? null), false);
}

/** One of the owner's tables given to a role by itself: "data:<table id>:read" (see its rows) or ":write" (change them too). */
const TABLE_PERMISSION = /^data:[a-z0-9]{8,40}:(read|write)$/;

/** May this member change one table's rows? Every table through pages:write, or that table given to their role. */
export function mayWriteTable(admin: { role?: Role | null; owner?: boolean; permissions?: string[] | null } | null | undefined, tableId: string | null | undefined): boolean {
  if (!admin || !tableId) return false;
  if (admin.owner || admin.role === "SUPERADMIN") return true;
  const list = admin.permissions ?? [];
  return list.includes("pages:write") || list.includes(`data:${tableId}:write`);
}

export const ALL_ADMIN_PERMISSIONS = ALL_PERMISSIONS;
