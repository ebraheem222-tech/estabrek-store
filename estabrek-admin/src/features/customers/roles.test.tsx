// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RolesPage } from "../../api/shopperRoles.api";
import type { ApiPage as Page, ApiTable } from "../../api/dataApi.api";

// الأدوار والمجموعات over a stand-in API: the three ready roles and the owner's own; groups and their members by
// email; a customer's roles and groups ticked and saved; a table's roles per act and its group, saved with its access;
// a function's door for some roles. A member who may not change customers changes nothing.

const m = vi.hoisted(() => ({
  page: null as unknown as RolesPage,
  may: new Set<string>(),
  addPreset: vi.fn(),
  addRole: vi.fn(),
  deleteRole: vi.fn(),
  addGroup: vi.fn(),
  deleteGroup: vi.fn(),
  getMembers: vi.fn(),
  addMembers: vi.fn(),
  removeMember: vi.fn(),
  setShopper: vi.fn(),
  api: null as unknown as Page,
  setAccess: vi.fn(),
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1" } }));
vi.mock("../../api/shopperRoles.api", () => ({
  getRoles: vi.fn(async () => m.page),
  addPreset: m.addPreset,
  addRole: m.addRole,
  changeRole: vi.fn(),
  deleteRole: m.deleteRole,
  addGroup: m.addGroup,
  changeGroup: vi.fn(),
  deleteGroup: m.deleteGroup,
  getMembers: m.getMembers,
  addMembers: m.addMembers,
  removeMember: m.removeMember,
  setShopper: m.setShopper,
}));
vi.mock("../../api/dataApi.api", () => ({ getApi: vi.fn(async () => m.api), getDocs: vi.fn(async () => ({ tables: 0, openapi: {}, types: "", openapiPath: "/v1/data/openapi.json" })), setAccess: m.setAccess, createKey: vi.fn(), updateKey: vi.fn(), revokeKey: vi.fn(), deleteKey: vi.fn() }));

import { setLangForTests } from "../../lib/lang";
import { RolesGroupsCard } from "./RolesGroupsCard";
import { RolesSection } from "./CustomersPage";
import ApiPage from "../api/ApiPage";

const limits = { roles: 30, groups: 200, rolesPerShopper: 10, groupsPerShopper: 20, rolesPerAct: 10, name: 60, note: 300, members: 2000 };
const presets = [
  { key: "member", name: { ar: "عضو", en: "Member" } },
  { key: "moderator", name: { ar: "مشرف", en: "Moderator" } },
  { key: "seller", name: { ar: "بائع", en: "Seller" } },
];
const role = (key: string, en: string, shoppers = 0) => ({ key, name: { en }, note: null, shoppers, createdAt: "2026-11-18T10:00:00Z" });
const group = (id: string, name: string, members = 0) => ({ id, name, note: null, members, createdAt: "2026-11-18T10:00:00Z" });
const show = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["customers:read", "customers:write", "api:read", "api:write", "functions:read"]);
  m.page = { roles: [], groups: [], presets, limits };
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Roles and groups", () => {
  test("the ready roles with a tap, the owner's own with a key; deleting asks first", async () => {
    m.addPreset.mockImplementation(async (key: string) => ({ ...m.page, roles: [role(key, "Seller")], presets: presets.filter((p) => p.key !== key) }));
    m.addRole.mockImplementation(async (body: { key: string; name: Record<string, string> }) => ({ ...m.page, roles: [role("seller", "Seller"), role(body.key, body.name.en, 0)], presets: presets.slice(0, 2) }));
    m.deleteRole.mockImplementation(async () => ({ ...m.page, roles: [role("coach", "Coach")], presets }));
    show(<RolesGroupsCard />);
    fireEvent.click(await screen.findByTestId("role-preset-seller"));
    await waitFor(() => expect(m.addPreset).toHaveBeenCalledWith("seller"));
    expect(await screen.findByTestId("role-seller")).toBeTruthy();
    expect(screen.queryByTestId("role-preset-seller")).toBeNull();
    // A key that isn't one can't be added.
    fireEvent.change(screen.getByTestId("role-new-name"), { target: { value: "Coach" } });
    fireEvent.change(screen.getByTestId("role-new-key"), { target: { value: "Coach!" } });
    expect((screen.getByTestId("role-new-add") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("role-new-key"), { target: { value: "coach" } });
    fireEvent.click(screen.getByTestId("role-new-add"));
    await waitFor(() => expect(m.addRole).toHaveBeenCalledWith({ key: "coach", name: { en: "Coach" } }));
    fireEvent.click(await screen.findByTestId("role-seller-delete"));
    expect(m.deleteRole).not.toHaveBeenCalled();
    // The dialog's own button (drawn last, over the page).
    const deletes = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deletes[deletes.length - 1]);
    await waitFor(() => expect(m.deleteRole).toHaveBeenCalledWith("seller"));
  });

  test("a group, and its members added by email: who has no account is said", async () => {
    m.addGroup.mockImplementation(async (body: { name: string }) => ({ ...m.page, groups: [group("g1", body.name)], made: "g1" }));
    m.getMembers.mockResolvedValue({ group: { id: "g1", name: "Team Rose", note: null }, members: [{ id: "u1", name: "Rana", email: "rana@shop.test", roles: [] }] });
    m.addMembers.mockResolvedValue({ added: ["yara@shop.test"], already: [], unknown: ["nobody@shop.test"], full: [] });
    m.removeMember.mockResolvedValue({ ok: true });
    show(<RolesGroupsCard />);
    fireEvent.change(await screen.findByTestId("group-new-name"), { target: { value: "Team Rose" } });
    fireEvent.click(screen.getByTestId("group-new-add"));
    await waitFor(() => expect(m.addGroup).toHaveBeenCalledWith({ name: "Team Rose" }));
    fireEvent.click(await screen.findByTestId("group-g1-open"));
    expect(await screen.findByTestId("group-member-rana@shop.test")).toBeTruthy();
    fireEvent.change(screen.getByTestId("group-members-emails"), { target: { value: "yara@shop.test, nobody@shop.test" } });
    fireEvent.click(screen.getByTestId("group-members-add"));
    await waitFor(() => expect(m.addMembers).toHaveBeenCalledWith("g1", ["yara@shop.test", "nobody@shop.test"]));
    fireEvent.click(screen.getByTestId("group-member-rana@shop.test-remove"));
    await waitFor(() => expect(m.removeMember).toHaveBeenCalledWith("g1", "u1"));
  });

  test("a customer's roles and groups, ticked and saved together; without the permission, nothing changes", async () => {
    m.page = { roles: [role("moderator", "Moderator", 1), role("seller", "Seller")], groups: [group("g1", "Team Rose", 2)], presets: presets.slice(0, 1), limits };
    m.setShopper.mockResolvedValue({ id: "u1", roles: ["moderator", "seller"], groups: ["g1"] });
    show(<RolesSection id="u1" roles={["moderator"]} groups={[]} canWrite />);
    expect((await screen.findByTestId("customer-roles-pick-moderator")).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByTestId("customer-roles-save")).toBeNull();
    fireEvent.click(screen.getByTestId("customer-roles-pick-seller"));
    fireEvent.click(screen.getByTestId("customer-groups-pick-g1"));
    fireEvent.click(screen.getByTestId("customer-roles-save"));
    await waitFor(() => expect(m.setShopper).toHaveBeenCalledWith("u1", { roles: ["moderator", "seller"], groups: ["g1"] }));
    cleanup();
    show(<RolesSection id="u1" roles={["moderator"]} groups={[]} canWrite={false} />);
    expect(((await screen.findByTestId("customer-roles-pick-seller")) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("A table's roles and group (الـ API والمفاتيح)", () => {
  const posts: ApiTable = { id: "t1", slug: "posts", name: { en: "Posts" }, access: { read: "customer", create: "customer", update: "off", delete: "off" }, open: true, private: [], roles: { read: [], create: [], update: [], delete: [] }, group: false, fields: [{ id: "title", type: "text", name: null, required: true }] };
  beforeEach(() => {
    m.page = { roles: [role("moderator", "Moderator")], groups: [group("g1", "Team Rose")], presets: [], limits };
    m.api = { base: "/v1/data", who: ["off", "key", "customer", "public"], acts: ["read", "create", "update", "delete"], limits: { name: 80, tables: 200, keys: 100, perMinute: { min: 1, max: 1000, default: 60 }, pageSize: 100, publicWritesPerMinute: 10, customerWritesPerMinute: 30 }, customerAccounts: true, tables: [posts], keys: [], now: Date.now() };
    m.setAccess.mockImplementation(async (_id: string, access: ApiTable["access"], _hidden?: string[], more?: { roles?: ApiTable["roles"]; group?: boolean }) => ({ ...posts, access, roles: more?.roles ?? posts.roles, group: more?.group ?? posts.group }));
  });

  test("a role ticked for an act is saved at once with the table's access; the group, for reading", async () => {
    show(<ApiPage />);
    const roles = await screen.findByTestId("roles-posts");
    fireEvent.click(within(roles).getByTestId("roles-posts-update-moderator"));
    await waitFor(() => expect(m.setAccess).toHaveBeenCalledWith("t1", posts.access, undefined, { roles: { read: [], create: [], update: ["moderator"], delete: [] } }));
    fireEvent.click(screen.getByTestId("group-posts-on"));
    await waitFor(() => expect(m.setAccess).toHaveBeenLastCalledWith("t1", posts.access, undefined, { group: true }));
  });

  test("without the customers' permission the roles aren't offered", async () => {
    m.may = new Set(["api:read", "api:write"]);
    show(<ApiPage />);
    await screen.findByTestId("table-posts");
    expect(screen.queryByTestId("roles-posts")).toBeNull();
  });
});
