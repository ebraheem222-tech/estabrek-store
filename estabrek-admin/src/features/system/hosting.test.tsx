// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Hosting } from "../../api/hosting.api";

// Admin → الاستضافة over a stand-in API: what the server knows of itself (its host, project, address, version; its
// database's maker, place and answer), and each service's own account: connected here with a token, then read
// with it («شو في هناك؟»), each with its how-to in pictures; the shop and the pictures as the setup makes them, and
// a saved Cloudinary account changed or taken off here.

const m = vi.hoisted(() => ({
  hosting: { getHosting: vi.fn() },
  conns: { getConnections: vi.fn(), addReady: vi.fn(), lookReady: vi.fn() },
  shop: { getShopLink: vi.fn(), makeShopLink: vi.fn(), shopOpensHere: vi.fn(), followShop: vi.fn(), startVercelConnect: vi.fn(), goTo: vi.fn() },
  cloud: { getCloudinaryAccount: vi.fn(), saveCloudinaryAccount: vi.fn(), removeCloudinaryAccount: vi.fn() },
  perms: ["system:read", "connections:read", "connections:write"] as string[],
}));
vi.mock("../../api/hosting.api", () => m.hosting);
vi.mock("../../api/connections.api", () => m.conns);
vi.mock("../../api/shop.api", () => m.shop);
vi.mock("../../api/cloudinary.api", () => m.cloud);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.perms.includes(p) }) }));

import { setLangForTests } from "../../lib/lang";
import HostingPage from "./HostingPage";

const HOSTING: Hosting = {
  server: { host: "railway", project: "samoray", environment: "production", service: "api", address: "https://api-samoray.up.railway.app", commit: "dd76e89", startedAt: "2026-11-20T16:20:53.904Z" },
  database: { provider: "neon", region: "eu-central-1", pooled: true, ok: true, ms: 4 },
  shop: { address: "https://samoray.vercel.app" },
};
const kind = (k: string) => ({ kind: k, label: k, host: `${k}.example`, settings: [], actions: [], test: { sends: false }, look: true });
const CONNS = (ready: unknown[] = []) => ({ ready, kinds: ["neon", "railway", "vercel", "cloudflare"].map(kind), sites: [], secrets: [], limits: { sites: 20, secrets: 20, value: 4000, ms: 10000, calls: 5, ready: 20 } });
const LOOK = { ok: true, status: 200, why: null, who: "owner@example.com", groups: [{ id: "projects", items: [{ name: "samoray", state: "SUCCESS", tone: "good" }] }], missed: 0 };

function show() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <HostingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.perms = ["system:read", "connections:read", "connections:write"];
  m.hosting.getHosting.mockResolvedValue(HOSTING);
  m.conns.getConnections.mockResolvedValue(CONNS());
  m.shop.getShopLink.mockResolvedValue({ connect: false, error: null, url: "https://samoray.vercel.app", source: "server", making: null, repo: "acme/store", branch: "main" });
  m.shop.shopOpensHere.mockResolvedValue(true);
  m.cloud.getCloudinaryAccount.mockResolvedValue({ source: "none", cloudName: null, apiKeyEnd: null, savedAt: null });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Hosting: where the store lives", () => {
  test("the server and its database as the server knows them", async () => {
    show();
    await screen.findByTestId("hosting-server-project");
    expect(screen.getByTestId("hosting-server-host").textContent).toContain("Railway");
    expect(screen.getByTestId("hosting-server-project").textContent).toMatch(/samoray.*production.*api/);
    expect(within(screen.getByTestId("hosting-server-address")).getByRole("link").getAttribute("href")).toBe("https://api-samoray.up.railway.app");
    expect(screen.getByTestId("hosting-server-version").textContent).toContain("dd76e89");
    expect(screen.getByTestId("hosting-db-provider").textContent).toMatch(/Neon.*eu-central-1/);
    expect(screen.getByTestId("hosting-db-state").textContent).toContain("Answering (4 ms)");
    expect(screen.getByTestId("hosting-db-pooled").textContent).toContain("pooler");
    // The shop and the pictures, as the setup makes them, inside their cards.
    expect(within(screen.getByTestId("hosting-shop")).getByTestId("setup-shop")).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId("hosting-pictures")).getByTestId("setup-media-form")).toBeTruthy());
  });

  test("an account not connected: its token pasted here connects it, then what is there is read", async () => {
    m.conns.addReady.mockResolvedValue(CONNS([{ id: "r1", kind: "railway", name: "Railway", settings: {}, updatedAt: "2026-11-20T18:00:00Z", lastUsedAt: null, usedBy: [] }]));
    m.conns.lookReady.mockResolvedValue(LOOK);
    show();
    const box = await screen.findByTestId("hosting-railway-account");
    // Its how-to in pictures, with Railway's tokens page a press away.
    expect(within(box).getByTestId("railway-guide-open").getAttribute("href")).toBe("https://railway.com/account/tokens");
    expect(within(box).getAllByTestId(/^railway-guide-\d$/)).toHaveLength(3);
    expect((within(box).getByTestId("hosting-railway-connect") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(box).getByTestId("hosting-railway-key"), { target: { value: "  3f2c-railway-token-0000  " } });
    fireEvent.click(within(box).getByTestId("hosting-railway-connect"));
    await waitFor(() => expect(m.conns.addReady).toHaveBeenCalledWith({ kind: "railway", name: "Railway", key: "3f2c-railway-token-0000" }));
    fireEvent.click(await within(box).findByTestId("hosting-railway-look"));
    await waitFor(() => expect(m.conns.lookReady).toHaveBeenCalledWith("r1"));
    expect((await within(box).findByTestId("hosting-railway-seen")).textContent).toContain("samoray");
    // Connected: the guide steps aside.
    expect(within(box).queryByTestId("railway-guide")).toBeNull();
    // Neon's has its own guide.
    expect(within(screen.getByTestId("hosting-neon-account")).getAllByTestId(/^neon-guide-\d$/)).toHaveLength(3);
  });

  test("a token the service refuses: said so in the service's words", async () => {
    m.conns.getConnections.mockResolvedValue(CONNS([{ id: "n1", kind: "neon", name: "Neon", settings: {}, updatedAt: "2026-11-20T18:00:00Z", lastUsedAt: null, usedBy: [] }]));
    m.conns.lookReady.mockResolvedValue({ ok: false, status: 401, why: null, who: null, groups: [], missed: 0 });
    show();
    fireEvent.click(await screen.findByTestId("hosting-neon-look"));
    expect((await screen.findByTestId("hosting-neon-seen-failed")).textContent).toMatch(/401.*token/i);
  });

  test("Cloudinary not connected: its how-to in pictures; a saved one is changed or taken off here", async () => {
    show();
    const pictures = await screen.findByTestId("hosting-pictures");
    await waitFor(() => expect(within(pictures).getByTestId("cloudinary-guide-open").getAttribute("href")).toBe("https://cloudinary.com/users/register_free"));
    expect(within(pictures).getAllByTestId(/^cloudinary-guide-\d$/)).toHaveLength(4);
    expect(within(pictures).getByTestId("cloudinary-guide-keys").getAttribute("href")).toBe("https://console.cloudinary.com/app/settings/api-keys");
    cleanup();

    m.cloud.getCloudinaryAccount.mockResolvedValue({ source: "saved", cloudName: "dxyz12abc", apiKeyEnd: "2345", savedAt: "2026-11-20T18:00:00Z" });
    show();
    const saved = await screen.findByTestId("hosting-pictures");
    await within(saved).findByTestId("setup-media-connected");
    expect(within(saved).queryByTestId("cloudinary-guide")).toBeNull();
    fireEvent.click(within(saved).getByTestId("setup-media-change"));
    expect((within(saved).getByTestId("setup-media-cloud") as HTMLInputElement).value).toBe("dxyz12abc");
    expect(within(saved).getByTestId("cloudinary-guide")).toBeTruthy();
    fireEvent.click(within(saved).getByTestId("setup-media-keep"));
    expect(within(saved).getByTestId("setup-media-connected")).toBeTruthy();
    expect(within(saved).getByTestId("setup-media-remove")).toBeTruthy();
  });

  test("without the connections permission: the accounts are left to the connections page", async () => {
    m.perms = ["system:read"];
    show();
    await screen.findByTestId("hosting-server-project");
    expect(m.conns.getConnections).not.toHaveBeenCalled();
    expect(screen.queryByTestId("hosting-railway-account")).toBeNull();
    expect(screen.getByTestId("hosting-server").textContent).toContain("connections page");
  });
});
