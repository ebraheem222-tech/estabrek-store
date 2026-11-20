// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Connections, ReadyKind, ReadyLook } from "../../api/connections.api";

// Where the store itself is hosted (Neon, Railway, Vercel, Cloudflare) as ready connections, on
// the page: their words, connecting one, and what one finds ("What's there?"), read and never
// changed. The server's part is tested with the database.

const m = vi.hoisted(() => ({ getConnections: vi.fn(), addReady: vi.fn(), saveReady: vi.fn(), removeReady: vi.fn(), tryReady: vi.fn(), lookReady: vi.fn(), addSite: vi.fn(), removeSite: vi.fn(), addSecret: vi.fn(), saveSecret: vi.fn(), removeSecret: vi.fn(), may: new Set<string>(), toastError: vi.fn() }));
vi.mock("../../api/connections.api", () => m);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: m.toastError, info: vi.fn() } }));

import { setLangForTests } from "../../lib/lang";
import ConnectionsPage from "./ConnectionsPage";
import { lookFailText } from "./LookView";
import { actionName, choiceName, factName, fieldName, keyName, kindHow, kindName, lookGroupName, settingName, toneName } from "./readyText";
import { failText } from "../functions/fnText";

// As the server says them (backend lib/fnKindsInfra.ts).
const read = (id: string, fields: Array<{ id: string; required?: boolean; or?: string }> = []) => ({ id, fields: fields.map((f) => ({ id: f.id, required: !!f.required, long: false, ...(f.or ? { or: f.or } : {}) })) });
const neon: ReadyKind = { kind: "neon", label: "Neon", host: "console.neon.tech", settings: [{ id: "org", max: 90 }, { id: "project", max: 60 }], actions: [read("projects"), read("branches", [{ id: "project", required: true, or: "project" }]), read("computes", [{ id: "project", required: true, or: "project" }])], test: { sends: false }, look: true };
const railway: ReadyKind = { kind: "railway", label: "Railway", host: "backboard.railway.com", settings: [{ id: "token", max: 12, choices: ["account", "workspace", "project"] }, { id: "workspace", max: 80, shownWhen: ["token", "workspace"] }], actions: [read("projects", [{ id: "workspace", or: "workspace" }]), read("status", [{ id: "project", required: true }]), read("deployments", [{ id: "project" }, { id: "service" }, { id: "environment" }])], test: { sends: false }, look: true };
const vercel: ReadyKind = { kind: "vercel", label: "Vercel", host: "api.vercel.com", settings: [{ id: "team", max: 80 }], actions: [read("projects"), read("deployments", [{ id: "project" }, { id: "target" }])], test: { sends: false }, look: true };
const cloudflare: ReadyKind = { kind: "cloudflare", label: "Cloudflare", host: "api.cloudflare.com", settings: [{ id: "account", max: 40 }], actions: [read("pages", [{ id: "account", required: true, or: "account" }]), read("deployments", [{ id: "account", required: true, or: "account" }, { id: "project", required: true }]), read("workers", [{ id: "account", required: true, or: "account" }]), read("zones")], test: { sends: false }, look: true };
const slack: ReadyKind = { kind: "slack", label: "Slack", host: "hooks.slack.com", settings: [], actions: [{ id: "message", fields: [{ id: "text", required: true, long: true }] }], test: { sends: true } };
const INFRA = [neon, railway, vercel, cloudflare];
// Made up, and not in the shape of any real service's key.
const KEY = "made-up-railway-token-test";
let server: Connections;

const LOOK: ReadyLook = {
  ok: true,
  status: 200,
  why: null,
  who: "Ibrahim",
  missed: 0,
  groups: [
    {
      id: "projects",
      more: 3,
      items: [
        {
          name: "estabrek-store",
          id: "prj-1",
          link: "https://railway.com/project/prj-1",
          facts: [["workspace", "Estabrek"]],
          items: [
            { name: "api", state: "SUCCESS", tone: "good", when: "2026-11-20T03:14:51Z", link: "https://estabrek-store-production.up.railway.app/", facts: [["environment", "production"]] },
            { name: "api", state: "CRASHED", tone: "bad", facts: [["environment", "pr-12"], ["default", "yes"]] },
          ],
        },
      ],
    },
  ],
};

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const type = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });
const conn = (kind: string, name: string, settings: Record<string, string> = {}) => ({ id: `c-${kind}`, kind, name, settings, updatedAt: "2026-11-20T03:00:00Z", lastUsedAt: null, usedBy: [] });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["connections:read", "connections:write"]);
  server = { sites: [], secrets: [], ready: [], kinds: [slack, ...INFRA], limits: { sites: 50, secrets: 50, value: 4000, ms: 8000, calls: 10, ready: 20 } };
  m.getConnections.mockImplementation(async () => server);
  m.addReady.mockImplementation(async (body: { kind: string; name: string; settings?: Record<string, string> }) => {
    server = { ...server, ready: [...(server.ready ?? []), conn(body.kind, body.name, body.settings)] };
    return server;
  });
  m.lookReady.mockResolvedValue(LOOK);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Their words", () => {
  test("each says what it is for, where its token comes from, and that it only reads", () => {
    for (const lang of ["en", "ar", "he"] as const) {
      setLangForTests(lang);
      for (const k of INFRA) {
        expect(kindName(k.kind)).toBe(k.label);
        expect(keyName(k.kind)).not.toBe(keyName("unknown"));
        // Its own steps, and that it changes nothing.
        expect(kindHow(k.kind).length).toBeGreaterThan(150);
        for (const s of k.settings) expect(settingName(k.kind, s.id)).not.toBe(s.id);
        for (const a of k.actions) {
          expect(actionName(k.kind, a.id)).not.toBe(a.id);
          for (const f of a.fields) expect(fieldName(k.kind, f.id)).not.toBe(f.id);
        }
      }
      for (const c of ["account", "workspace", "project"]) expect(choiceName("railway", "token", c)).not.toBe(c);
      for (const g of ["projects", "pages", "workers", "zones"]) expect(lookGroupName(g)).not.toBe(g);
      for (const f of ["region", "postgres", "default", "protected", "compute", "workspace", "environment", "target", "branch", "commit", "domains", "plan"]) expect(factName(f)).not.toBe(f);
      for (const t of ["good", "bad", "busy", "idle"]) expect(toneName(t)).not.toBe(t);
    }
    setLangForTests("en");
    expect(kindHow("neon")).toMatch(/changes nothing, and never reads passwords or connection strings/);
    expect(kindHow("railway")).toMatch(/never reads the Variables/);
    expect(kindHow("vercel")).toMatch(/never reads Environment Variables/);
    expect(kindHow("cloudflare")).toMatch(/Cloudflare Pages → Read.*Zone → Zone → Read/);
  });

  test("a run's refusal from them, in the admin's words", () => {
    expect(failText('Railway "Server" said no: Not Authorized', "en")).toBe("Railway “Server” said no: Not Authorized");
    expect(failText('Railway "Server" said no: Not Authorized', "ar")).toBe("«Server» (Railway) رفض: Not Authorized");
    expect(failText("The project is empty", "en")).toBe("Which project? (its id, or the connection's usual one)");
    expect(failText("The account is empty", "ar")).toMatch(/^أي حساب؟/);
  });
});

describe("On the page", () => {
  test("connecting Railway: whose token it is is picked from a list, the workspace asked only for a workspace's token", async () => {
    show();
    fireEvent.click(await screen.findByTestId("ready-new-kind-railway"));
    expect(screen.getByTestId("ready-new-how").textContent).toMatch(/Account Settings → Tokens/);
    expect(screen.queryByTestId("ready-new-setting-workspace")).toBeNull();
    fireEvent.change(screen.getByTestId("ready-new-setting-token"), { target: { value: "workspace" } });
    type("ready-new-setting-workspace", "ws-1");
    type("ready-new-name", "Server");
    type("ready-new-key", KEY);
    fireEvent.click(screen.getByTestId("ready-add"));
    await waitFor(() => expect(m.addReady).toHaveBeenCalledWith({ kind: "railway", name: "Server", key: KEY, settings: { token: "workspace", workspace: "ws-1" } }));
    // Its choice is said by name on its row.
    expect((await screen.findByTestId("ready-c-railway")).textContent).toContain("Whose token it is: A workspace's (team's) token");
  });

  test("what's there: whose key, each project with its services, how each is going, its link and its facts; read again; closed", async () => {
    server = { ...server, ready: [conn("railway", "Server", { token: "account" }), conn("slack", "Team")] };
    show();
    const row = await screen.findByTestId("ready-c-railway");
    // Slack shows nothing: it only sends.
    expect(screen.queryByTestId("ready-c-slack-look-open")).toBeNull();
    fireEvent.click(within(row).getByTestId("ready-c-railway-look-open"));
    await waitFor(() => expect(m.lookReady).toHaveBeenCalledWith("c-railway"));
    const look = await screen.findByTestId("ready-c-railway-look");
    expect(within(look).getByTestId("ready-c-railway-look-who").textContent).toBe("The key is: Ibrahim");
    expect(look.textContent).toContain("This is only read: nothing was changed there.");
    // The group with how many there are in all, and the more not shown.
    expect(within(look).getByTestId("ready-c-railway-look-projects").querySelector("h3")!.textContent).toBe("Projects (4)");
    expect(look.textContent).toContain("And 3 more not shown.");
    const project = screen.getByTestId("ready-c-railway-look-projects-0");
    expect(screen.getByTestId("ready-c-railway-look-projects-0-fact-workspace").textContent).toBe("Workspace: Estabrek");
    expect(screen.getByTestId("ready-c-railway-look-projects-0-link").getAttribute("href")).toBe("https://railway.com/project/prj-1");
    const [live, crashed] = [screen.getByTestId("ready-c-railway-look-projects-0-0"), screen.getByTestId("ready-c-railway-look-projects-0-1")];
    expect(live.getAttribute("data-tone")).toBe("good");
    expect(live.textContent).toContain("Working");
    expect(live.textContent).toContain("SUCCESS");
    expect(live.textContent).toContain("Environment: production");
    expect(screen.getByTestId("ready-c-railway-look-projects-0-0-link").getAttribute("rel")).toContain("noopener");
    expect(crashed.getAttribute("data-tone")).toBe("bad");
    expect(crashed.textContent).toContain("Has a problem");
    // A flag by its name alone.
    expect(screen.getByTestId("ready-c-railway-look-projects-0-1-fact-default").textContent).toBe("Default");
    expect(project.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByTestId("ready-c-railway-look-open").textContent).toBe("Read again");
    fireEvent.click(screen.getByTestId("ready-c-railway-look-close"));
    expect(screen.queryByTestId("ready-c-railway-look")).toBeNull();
  });

  test("what couldn't be read: why, in the service's words; a token that may read only some of it says so", async () => {
    server = { ...server, ready: [conn("cloudflare", "Pages", { account: "0123456789abcdef0123456789abcdef" })] };
    m.lookReady.mockResolvedValueOnce({ ok: false, status: 403, why: "Authentication error", who: null, groups: [], missed: 4 });
    show();
    fireEvent.click(await screen.findByTestId("ready-c-cloudflare-look-open"));
    expect((await screen.findByTestId("ready-c-cloudflare-look-failed")).textContent).toBe("Nothing could be read (403): Authentication error. The token isn't known or may not read: check it was copied whole and may read.");
    m.lookReady.mockResolvedValueOnce({ ok: true, status: 200, why: null, who: null, missed: 3, groups: [{ id: "zones", items: [{ name: "example.test", state: "pending", tone: "busy", facts: [["plan", "Free Website"]] }] }] });
    fireEvent.click(screen.getByTestId("ready-c-cloudflare-look-open"));
    expect((await screen.findByTestId("ready-c-cloudflare-look-missed")).textContent).toBe("3 of the calls were refused: the token may not read everything.");
    expect(screen.getByTestId("ready-c-cloudflare-look-zones").textContent).toContain("Domains (zones) (1)");
    expect(screen.getByTestId("ready-c-cloudflare-look-zones-0").textContent).toContain("In progress");
    // Nothing at all: said so.
    m.lookReady.mockResolvedValueOnce({ ok: true, status: 200, why: null, who: "Estabrek", missed: 0, groups: [{ id: "pages", items: [] }] });
    fireEvent.click(screen.getByTestId("ready-c-cloudflare-look-open"));
    expect((await screen.findByTestId("ready-c-cloudflare-look-empty")).textContent).toBe("The account is empty: this key has no projects.");
  });

  test("in Arabic: how things are going, and the groups, in its words", async () => {
    setLangForTests("ar");
    server = { ...server, ready: [conn("railway", "السيرفر", { token: "account" })] };
    show();
    fireEvent.click(await screen.findByTestId("ready-c-railway-look-open"));
    const look = await screen.findByTestId("ready-c-railway-look");
    expect(look.querySelector("h3")!.textContent).toBe("المشاريع (4)");
    expect(screen.getByTestId("ready-c-railway-look-projects-0-0").textContent).toContain("شغّال");
    expect(screen.getByTestId("ready-c-railway-look-projects-0-0-fact-environment").textContent).toBe("البيئة: production");
    expect(lookFailText({ ok: false, status: 401, why: "authorization failed", who: null, groups: [], missed: 2 })).toMatch(/^ما قدرنا نقرأ شي \(401\)/);
  });

  test("someone who may only look at connections can't read through one", async () => {
    m.may = new Set(["connections:read"]);
    server = { ...server, ready: [conn("neon", "Database")] };
    show();
    await screen.findByTestId("ready-c-neon");
    expect(screen.queryByTestId("ready-c-neon-look-open")).toBeNull();
  });
});
