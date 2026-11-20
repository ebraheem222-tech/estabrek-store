// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CopiesView, CopyPlan } from "../../api/copies.api";

// نسخ الزباين over a stand-in API: only the owner; the connections each service is made through (none, one, a
// choice); the names as they will be addresses; the plan with each service's answer, and every variable with its
// value or, for a secret, where it comes from. Nothing is made yet, and the page says so.

const m = vi.hoisted(() => ({
  api: { getCopies: vi.fn(), planCopy: vi.fn(), PRESS_KINDS: ["neon", "railway", "vercel", "cloudflare"] },
  admin: { owner: true, role: "SUPERADMIN" } as Record<string, unknown> | null,
}));
vi.mock("../../api/copies.api", () => m.api);
vi.mock("../../store/auth.store", () => ({ useAuthStore: (pick: (s: { admin: unknown }) => unknown) => pick({ admin: m.admin }) }));

import { setLangForTests } from "../../lib/lang";
import CopiesPage from "./CopiesPage";
import { refusedText, tidyName, whyText } from "./copiesText";

const VIEW: CopiesView = {
  connections: { neon: [{ id: "n1", name: "Neon" }], railway: [{ id: "r1", name: "Railway" }], vercel: [{ id: "v1", name: "Vercel A" }, { id: "v2", name: "Vercel B" }], cloudflare: [] },
  repo: { repo: "acme/store", branch: "main" },
  regions: ["aws-eu-central-1", "aws-us-east-1"],
  limits: { label: 60, name: { min: 3, max: 30 } },
};
const PLAN: CopyPlan = {
  input: { label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", branch: "main", region: "aws-eu-central-1" },
  via: { neon: "n1", railway: "r1", vercel: "v2" },
  urls: { api: "https://rose-api.up.railway.app", shop: "https://rose.vercel.app", admin: "https://rose-admin.pages.dev" },
  steps: [
    { id: "neon", facts: [["project", "Rose"], ["region", "aws-eu-central-1"], ["postgres", "17"]] },
    { id: "railway", facts: [["project", "Rose"], ["address", "https://rose-api.up.railway.app"]], variables: [{ name: "NODE_ENV", from: "fixed", value: "production" }, { name: "DATABASE_URL", from: "neon" }, { name: "JWT_SECRET", from: "made" }] },
    { id: "vercel", facts: [["project", "rose"]], variables: [{ name: "REVALIDATE_SECRET", from: "shared" }] },
    { id: "cloudflare", facts: [["project", "rose-admin"]], variables: [] },
    { id: "owner", facts: [["setup", "https://rose-admin.pages.dev/"]] },
  ],
  checks: [
    { id: "neon.reach", kind: "neon", ok: true, why: null },
    { id: "railway.repo", kind: "railway", ok: false, why: "Railway can't reach acme/store on GitHub" },
    { id: "railway.domain", kind: "railway", ok: true, why: null },
    { id: "vercel.name", kind: "vercel", ok: false, why: '"rose" is taken by a project of yours' },
    { id: "cloudflare.connection", kind: "cloudflare", ok: false, why: "No connection to it is picked" },
  ],
  ready: false,
};

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CopiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const type = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.admin = { owner: true, role: "SUPERADMIN" };
  m.api.getCopies.mockResolvedValue(VIEW);
  m.api.planCopy.mockResolvedValue(PLAN);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Client copies", () => {
  test("is the owner's alone", () => {
    m.admin = { owner: false, role: "STAFF" };
    show();
    expect(screen.getByTestId("copies-owner-only").textContent).toContain("store owner's alone");
    expect(m.api.getCopies).not.toHaveBeenCalled();
  });

  test("the accounts: one connected, a choice of two, one missing; and that nothing is made yet", async () => {
    show();
    await screen.findByTestId("copies-connections");
    expect(screen.getByTestId("copies-not-yet").textContent).toContain("it makes nothing");
    expect(screen.getByTestId("copies-conn-neon").textContent).toContain("Neon");
    expect(screen.getByTestId("copies-conn-railway").textContent).toContain("not a project's");
    expect(screen.getByTestId("copies-via-vercel")).toBeTruthy();
    expect(screen.getByTestId("copies-conn-cloudflare-none").getAttribute("href")).toBe("/admin/connections");
  });

  test("the names as addresses, then the plan asked for with the connection picked", async () => {
    show();
    await screen.findByTestId("copies-form");
    expect((screen.getByTestId("copies-plan-ask") as HTMLButtonElement).disabled).toBe(true);
    type("copies-label", "Rose");
    type("copies-server", " Rose API ");
    type("copies-site", "Rose");
    expect(screen.getByTestId("copies-server-url").textContent).toBe("https://rose-api.up.railway.app");
    expect(screen.getByTestId("copies-site-url").textContent).toBe("The shop: https://rose.vercel.app · The admin: https://rose-admin.pages.dev");
    expect((screen.getByTestId("copies-repo") as HTMLInputElement).value).toBe("acme/store");
    fireEvent.change(screen.getByTestId("copies-via-vercel"), { target: { value: "v2" } });
    fireEvent.click(screen.getByTestId("copies-plan-ask"));
    await waitFor(() =>
      expect(m.api.planCopy).toHaveBeenCalledWith({ label: "Rose", server: "rose-api", site: "rose", region: "aws-eu-central-1", repo: "acme/store", branch: "main", via: { neon: "n1", railway: "r1", vercel: "v2" } }),
    );
    const plan = await screen.findByTestId("copies-plan");
    expect(screen.getByTestId("copies-ready").getAttribute("data-ready")).toBe("false");
    // Each service's answer, and what to do about a no.
    expect(screen.getByTestId("copies-check-neon.reach").getAttribute("data-ok")).toBe("true");
    expect(screen.getByTestId("copies-check-railway.repo").textContent).toContain("Railway can't reach acme/store on GitHub: in Railway, open Account Settings → GitHub");
    expect(screen.getByTestId("copies-check-vercel.name").textContent).toContain("“rose” is taken by a project of yours: pick another name");
    // The steps in order, their facts, and the variables: a value shown, a secret said by where it comes from.
    expect(within(plan).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["1. The database (Neon)", "2. The server (Railway)", "3. The shop (Vercel)", "4. The admin (Cloudflare Pages)", "5. The new store's owner"]);
    expect(screen.getByTestId("copies-var-railway-NODE_ENV").textContent).toBe("NODE_ENVproduction");
    expect(screen.getByTestId("copies-var-railway-DATABASE_URL").textContent).toContain("From Neon when the database is made");
    expect(screen.getByTestId("copies-var-railway-JWT_SECRET").textContent).toContain("shown to no one");
    expect(screen.getByTestId("copies-var-vercel-REVALIDATE_SECRET").textContent).toContain("shared by the server and the shop");
  });

  test("a name refused by the server: which one, and what it should be", async () => {
    m.api.planCopy.mockRejectedValueOnce({ response: { data: { error: "NAME_INVALID", message: "A name starts with a letter", details: { at: "site" } } } });
    show();
    await screen.findByTestId("copies-form");
    type("copies-label", "Rose");
    type("copies-server", "rose-api");
    type("copies-site", "rose");
    fireEvent.click(screen.getByTestId("copies-plan-ask"));
    expect((await screen.findByTestId("copies-refused")).textContent).toBe("The site's name: A name starts with a letter");
  });

  test("its words in Arabic, and the names tidied as the server tidies them", () => {
    setLangForTests("ar");
    expect(whyText('"rose" is taken by a project of yours')).toBe("«rose» محجوز لمشروع عندك: اختار اسم تاني");
    expect(whyText("It answered 500")).toBe("جاوب 500");
    expect(whyText("something new")).toBe("something new");
    expect(refusedText({ error: "NAME_INVALID", message: "A name is at least 3 letters", details: { at: "server" } })).toBe("اسم السيرفر: الاسم 3 حروف عالأقل");
    expect([tidyName("  My Shop "), tidyName("Rose_Store!!"), tidyName("a--b"), tidyName("-shop-")]).toEqual(["my-shop", "rose-store", "a-b", "shop"]);
  });
});
