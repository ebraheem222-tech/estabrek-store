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
  | "customers:write";

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
  if (Array.isArray(admin.permissions)) {
    return Array.from(new Set(admin.permissions.filter((p): p is AdminPermission => KNOWN.has(p))));
  }
  return getPermissionsForRole(admin.role ?? null);
}

export const ALL_ADMIN_PERMISSIONS = ALL_PERMISSIONS;
