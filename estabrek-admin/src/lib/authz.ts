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
  | "audit:read";

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
];

const ROLE_PERMISSIONS: Record<Role, readonly AdminPermission[]> = {
  SUPERADMIN: ALL_PERMISSIONS,
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
