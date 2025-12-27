import { z } from "zod";

export const CreateMenuBody = z.object({
  name: z.string().min(1),
  location: z.enum(["HEADER","FOOTER","SECONDARY","CUSTOM"]).default("CUSTOM"),
  isDefault: z.boolean().optional(),
});

export const UpdateMenuBody = CreateMenuBody.partial();

export const CreateItemBody = z.object({
  menuId: z.string().cuid(),
  parentId: z.string().cuid().nullable().optional(),
  label: z.string().min(1),
  href: z.string().min(1),
  target: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  isExternal: z.boolean().optional(),
});

export const UpdateItemBody = CreateItemBody.partial();

export const MoveItemBody = z.object({
  parentId: z.string().cuid().nullable().optional(),
  order: z.number().int().nonnegative(),
});
