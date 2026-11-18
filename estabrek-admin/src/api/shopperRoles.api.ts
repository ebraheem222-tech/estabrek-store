// الأدوار والمجموعات for shoppers (backend modules/admin/shopperRoles.controller.ts, lib/shopperRoles.ts): roles the
// owner gives shoppers (a table lets a role's holders do an act on every row; a function's door can be for a role),
// and groups of shoppers (a table can let a shopper read what their group's members added).
import { api } from "./http";

export type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type ShopperRole = { key: string; name: Local; note: string | null; shoppers: number; createdAt: string };
export type ShopperGroup = { id: string; name: string; note: string | null; members: number; createdAt: string };
export type RolesPage = {
  roles: ShopperRole[];
  groups: ShopperGroup[];
  /** The ready roles not made yet (member, moderator, seller). */
  presets: Array<{ key: string; name: Local }>;
  limits: { roles: number; groups: number; rolesPerShopper: number; groupsPerShopper: number; rolesPerAct: number; name: number; note: number; members: number };
};
export type Member = { id: string; name: string; email: string; roles: string[] };

const base = "/admin/shopper-roles";
export const getRoles = async () => (await api.get<RolesPage>(base)).data;
export const addPreset = async (preset: string) => (await api.post<RolesPage>(`${base}/roles`, { preset })).data;
export const addRole = async (body: { key: string; name: Local; note?: string }) => (await api.post<RolesPage>(`${base}/roles`, body)).data;
export const changeRole = async (key: string, body: { name?: Local; note?: string | null }) => (await api.patch<RolesPage>(`${base}/roles/${key}`, body)).data;
export const deleteRole = async (key: string) => (await api.delete<RolesPage>(`${base}/roles/${key}`)).data;
export const addGroup = async (body: { name: string; note?: string }) => (await api.post<RolesPage & { made: string }>(`${base}/groups`, body)).data;
export const changeGroup = async (id: string, body: { name?: string; note?: string | null }) => (await api.patch<RolesPage>(`${base}/groups/${id}`, body)).data;
export const deleteGroup = async (id: string) => (await api.delete<RolesPage>(`${base}/groups/${id}`)).data;
export const getMembers = async (id: string) => (await api.get<{ group: { id: string; name: string; note: string | null }; members: Member[] }>(`${base}/groups/${id}/members`)).data;
export const addMembers = async (id: string, emails: string[]) => (await api.post<{ added: string[]; already: string[]; unknown: string[]; full: string[] }>(`${base}/groups/${id}/members`, { emails })).data;
export const removeMember = async (id: string, user: string) => (await api.delete<{ ok: true }>(`${base}/groups/${id}/members/${user}`)).data;
export const setShopper = async (user: string, body: { roles?: string[]; groups?: string[] }) => (await api.put<{ id: string; roles: string[]; groups: string[] }>(`${base}/shoppers/${user}`, body)).data;
