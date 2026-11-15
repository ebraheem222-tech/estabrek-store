import { z } from "zod";
import { ALL_PERMISSIONS, TABLE_PERMISSION, TABLE_PERMISSIONS_MAX } from "./permissions.js";

/** One of the catalogue's, or one table given by itself ("data:<table id>:read|write"). */
const Permission = z.union([z.enum(ALL_PERMISSIONS as [string, ...string[]]), z.string().regex(TABLE_PERMISSION, "Not a permission")]);
const PERMISSIONS_MAX = 100 + TABLE_PERMISSIONS_MAX * 2;
const Name = z.string().trim().min(2).max(60);

export const RoleBody = z.object({
  name: Name,
  description: z.string().trim().max(200).nullable().optional(),
  permissions: z.array(Permission).max(PERMISSIONS_MAX).default([]),
});

export const RoleUpdateBody = z
  .object({
    name: Name.optional(),
    description: z.string().trim().max(200).nullable().optional(),
    permissions: z.array(Permission).max(PERMISSIONS_MAX).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to change" });

const Phone = z
  .string()
  .trim()
  .max(32)
  .regex(/^\+?[0-9\s\-()]{6,}$/, "Phone looks wrong")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const InviteBody = z.object({
  name: Name,
  email: z.string().trim().toLowerCase().email().max(160),
  phone: Phone,
  staffRoleId: z.string().min(1).max(64).nullable().optional(),
  owner: z.boolean().optional(),
});

export const MemberUpdateBody = z
  .object({
    name: Name.optional(),
    phone: Phone,
    staffRoleId: z.string().min(1).max(64).nullable().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    owner: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to change" });

export const IdParams = z.object({ id: z.string().min(1).max(64) });

export const ActivityQuery = z.object({
  take: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).max(64).optional(),
  adminUserId: z.string().min(1).max(64).optional(),
  area: z.string().min(1).max(40).optional(),
});
