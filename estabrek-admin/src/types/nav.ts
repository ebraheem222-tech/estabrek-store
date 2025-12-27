// src/types/nav.ts
import type { ID, ISODateString } from "./common";

export type NavLocation = "HEADER" | "FOOTER" | "SECONDARY" | "CUSTOM";

/** Prisma: NavigationMenu */
export type NavigationMenu = {
  id: ID;
  name: string;
  location: NavLocation;
  isDefault: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;

  items?: NavigationItem[];
};

/** Prisma: NavigationItem */
export type NavigationItem = {
  id: ID;

  menuId: ID;
  parentId?: ID | null;

  label: string;
  href: string;

  target?: string | null;
  icon?: string | null;

  order: number;
  isActive: boolean;
  isExternal: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;

  children?: NavigationItem[];
};

export type CreateMenuInput = {
  name: string;
  location?: NavLocation;
  isDefault?: boolean;
};

export type UpdateMenuInput = Partial<CreateMenuInput>;

export type CreateNavItemInput = {
  menuId: ID;
  parentId?: ID | null;
  label: string;
  href: string;
  target?: string | null;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
  isExternal?: boolean;
};

export type UpdateNavItemInput = Partial<CreateNavItemInput>;

export type MoveNavItemInput = {
  parentId?: ID | null;
  order: number;
};
