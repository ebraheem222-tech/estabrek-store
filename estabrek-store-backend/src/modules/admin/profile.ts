import { prisma } from "../../lib/prisma.js";
import { ALL_PERMISSIONS, OWN_ACCOUNT_PERMISSIONS, cleanPermissions } from "./permissions.js";

/**
 * The signed-in admin as the admin app needs it: profile, owner or team
 * member, role name and the permissions that decide which pages it shows.
 */
export async function adminProfile(adminId: string) {
  const a = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      secondEmail: true,
      secondPhone: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      staffRole: { select: { id: true, name: true, permissions: true } },
    },
  });
  if (!a) return null;
  const owner = a.role === "SUPERADMIN";
  const permissions = owner
    ? [...ALL_PERMISSIONS, ...OWN_ACCOUNT_PERMISSIONS]
    : [...cleanPermissions(a.staffRole?.permissions ?? []), ...OWN_ACCOUNT_PERMISSIONS];
  const { staffRole, ...rest } = a;
  return {
    ...rest,
    owner,
    staffRole: staffRole ? { id: staffRole.id, name: staffRole.name } : null,
    permissions,
  };
}
