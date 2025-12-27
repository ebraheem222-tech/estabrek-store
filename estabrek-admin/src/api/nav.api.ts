// src/api/nav.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type NavLocation = "HEADER" | "FOOTER" | "SECONDARY" | "CUSTOM";

export type NavigationMenu = {
  id: string;
  name: string;
  location: NavLocation;
  isDefault?: boolean;
  items?: NavigationItem[];
};

export type NavigationItem = {
  id: string;
  menuId: string;
  parentId?: string | null;
  label: string;
  href: string;
  target?: string | null;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
  isExternal?: boolean;
};

export async function listMenus() {
  const res = await api.get(ENDPOINTS.admin.nav.menus);
  return res.data as NavigationMenu[];
}

export async function createMenu(body: { name: string; location?: NavLocation; isDefault?: boolean }) {
  const res = await api.post(ENDPOINTS.admin.nav.menus, body);
  return res.data as NavigationMenu;
}

export async function updateMenu(id: string, body: Partial<{ name: string; location: NavLocation; isDefault: boolean }>) {
  const res = await api.patch(ENDPOINTS.admin.nav.menuById(id), body);
  return res.data as NavigationMenu;
}

export async function deleteMenu(id: string) {
  const res = await api.delete(ENDPOINTS.admin.nav.menuById(id));
  return res.data as { ok: true };
}

export async function createItem(body: {
  menuId: string;
  parentId?: string | null;
  label: string;
  href: string;
  target?: string | null;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
  isExternal?: boolean;
}) {
  const res = await api.post(ENDPOINTS.admin.nav.items, body);
  return res.data as NavigationItem;
}

export async function updateItem(id: string, body: Partial<NavigationItem>) {
  const res = await api.patch(ENDPOINTS.admin.nav.itemById(id), body);
  return res.data as NavigationItem;
}

export async function moveItem(id: string, body: { parentId?: string | null; order: number }) {
  const res = await api.post(ENDPOINTS.admin.nav.moveItem(id), body);
  return res.data as NavigationItem;
}

export async function deleteItem(id: string) {
  const res = await api.delete(ENDPOINTS.admin.nav.itemById(id));
  return res.data as { ok: true };
}
