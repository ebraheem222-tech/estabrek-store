// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CopiesView, CopyPlan, CopyView } from "../../api/copies.api";

// نسخ الزباين over a stand-in API: only the owner; the connections each service is made through (none, one, a
// choice); the names as they will be addresses; the plan with each service's answer, and every variable with its
// value or, for a secret, where it comes from; then made, once the owner says yes, and followed step by step: a step
// that said no in its own words with "try again from here", and a made copy's addresses and its owner's link.

const m = vi.hoisted(() => ({
  api: { getCopies: vi.fn(), planCopy: vi.fn(), makeCopy: vi.fn(), listCopies: vi.fn(), getCopy: vi.fn(), copyAgain: vi.fn(), copyAlive: vi.fn(), PRESS_KINDS: ["neon", "railway", "vercel", "cloudflare"] },
  admin: { owner: true, role: "SUPERADMIN" } as Record<string, unknown> | null,
}));
vi.mock("../../api/copies.api", () => m.api);
vi.mock("../../store/auth.store", () => ({ useAuthStore: (pick: (s: { admin: unknown }) => unknown) => pick({ admin: m.admin }) }));

import { setLangForTests } from "../../lib/lang";
import CopiesPage from "./CopiesPage";
import { makeStepName, refusedText, tidyName, whyText } from "./copiesText";

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

const STEP_IDS = ["neon.project", "railway.project", "railway.service", "railway.domain", "vercel.project", "cloudflare.project", "vercel.deploy", "cloudflare.deploy", "railway.variables", "railway.deploy"];
const KIND: Record<string, string> = { neon: "neon", railway: "railway", vercel: "vercel", cloudflare: "cloudflare" };
function copy(state: CopyView["state"], upTo: number, failedWhy?: string): CopyView {
  return {
    id: "c1",
    label: "Rose",
    server: "rose-api",
    site: "rose",
    repo: "acme/store",
    branch: "main",
    region: "aws-eu-central-1",
    state,
    steps: STEP_IDS.map((id, i) => ({ id, kind: KIND[id.split(".")[0]] as CopyView["steps"][number]["kind"], state: i < upTo ? "done" : i === upTo ? (failedWhy ? "failed" : state === "making" ? "doing" : "waiting") : "waiting", why: i === upTo && failedWhy ? failedWhy : null, at: null })),
    addresses: { api: "https://rose-api.up.railway.app", shop: "https://rose.vercel.app", admin: "https://rose-admin.pages.dev" },
    links: upTo > 0 ? { neon: "https://console.neon.tech/app/projects/calm-1" } : {},
    by: null,
    began: "2026-11-20T10:00:00Z",
    updated: "2026-11-20T10:00:05Z",
    welcome: state === "made" ? "https://rose-admin.pages.dev/welcome?code=ABCD-EFGH-JKLM-NPQR" : null,
  };
}
const READY: CopyPlan = { ...PLAN, via: { neon: "n1", railway: "r1", vercel: "v2", cloudflare: "c1" }, checks: PLAN.checks.map((c) => ({ ...c, ok: true, why: null })), ready: true };

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
  m.api.listCopies.mockResolvedValue([]);
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

  test("the accounts: one connected, a choice of two, one missing; and that asking makes nothing", async () => {
    show();
    await screen.findByTestId("copies-connections");
    expect(screen.getByTestId("copies-how").textContent).toContain("that makes nothing");
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
    // Not every service said yes: nothing to make yet.
    expect(screen.queryByTestId("copies-make")).toBeNull();
  });

  async function planReady() {
    m.api.planCopy.mockResolvedValue(READY);
    show();
    await screen.findByTestId("copies-form");
    type("copies-label", "Rose");
    type("copies-server", "rose-api");
    type("copies-site", "rose");
    fireEvent.click(screen.getByTestId("copies-plan-ask"));
    return screen.findByTestId("copies-make");
  }

  test("every service said yes: made only once its cost is agreed to, then followed step by step until it is made", async () => {
    m.api.makeCopy.mockResolvedValue(copy("making", 2));
    m.api.getCopy.mockResolvedValueOnce(copy("making", 2)).mockResolvedValue(copy("made", 10));
    await planReady();
    const go = screen.getByTestId("copies-make-go") as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("copies-agree"));
    expect(go.disabled).toBe(false);
    m.api.listCopies.mockResolvedValue([copy("making", 2)]);
    fireEvent.click(go);
    await waitFor(() => expect(m.api.makeCopy).toHaveBeenCalledWith({ label: "Rose", server: "rose-api", site: "rose", region: "aws-eu-central-1", repo: "acme/store", branch: "main", via: READY.via }));
    // The plan gives way to the copy, followed where the copies are.
    const run = await screen.findByTestId("copy-run");
    expect(screen.queryByTestId("copies-plan")).toBeNull();
    expect(run.getAttribute("data-state")).toBe("making");
    expect(screen.getByTestId("copy-step-neon.project").getAttribute("data-state")).toBe("done");
    expect(screen.getByTestId("copy-step-railway.service").getAttribute("data-state")).toBe("doing");
    expect(screen.getByTestId("copy-step-railway.deploy").textContent).toContain("The server linked to the repository, and its first deploy");
    m.api.listCopies.mockResolvedValue([copy("made", 10)]);
    await waitFor(() => expect(screen.getByTestId("copy-run").getAttribute("data-state")).toBe("made"), { timeout: 4000 });
    expect(screen.getByTestId("copy-welcome").textContent).toBe("https://rose-admin.pages.dev/welcome?code=ABCD-EFGH-JKLM-NPQR");
  });

  test("a service that says no now: its check shown again, nothing made", async () => {
    m.api.makeCopy.mockRejectedValue({ response: { data: { error: "COPY_NOT_READY", details: { checks: [...READY.checks.slice(0, 2), { id: "railway.domain", kind: "railway", ok: false, why: "Domain is not available" }] } } } });
    await planReady();
    fireEvent.click(screen.getByTestId("copies-agree"));
    fireEvent.click(screen.getByTestId("copies-make-go"));
    expect((await screen.findByTestId("copies-refused")).textContent).toContain("A service says no now");
    expect(screen.getByTestId("copies-check-railway.domain").textContent).toContain("The address is taken: pick another name for the server");
    expect(screen.getByTestId("copies-ready").getAttribute("data-ready")).toBe("false");
    expect(screen.queryByTestId("copies-make")).toBeNull();
  });

  test("a copy that stopped: the step that said no, in words to act on, and tried again from there", async () => {
    m.api.listCopies.mockResolvedValue([copy("stopped", 3, "Domain is not available")]);
    m.api.getCopy.mockResolvedValue(copy("stopped", 3, "Domain is not available"));
    m.api.copyAgain.mockResolvedValue(copy("making", 3));
    show();
    const row = await screen.findByTestId("copies-made-rose");
    expect(row.textContent).toContain("Stopped · 3/10");
    fireEvent.click(within(row).getByRole("button"));
    expect((await screen.findByTestId("copy-step-railway.domain-why")).textContent).toBe("The address is taken: pick another name for the server");
    expect(screen.getByTestId("copy-links").querySelector("a")!.getAttribute("href")).toBe("https://console.neon.tech/app/projects/calm-1");
    expect(screen.queryByTestId("copy-welcome")).toBeNull();
    fireEvent.click(screen.getByTestId("copy-again"));
    await waitFor(() => expect(m.api.copyAgain).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(screen.getByTestId("copy-run").getAttribute("data-state")).toBe("making"));
  });

  test("a made copy: where it is, whether it answers yet, and its owner's link to hand over", async () => {
    m.api.listCopies.mockResolvedValue([copy("made", 10)]);
    m.api.getCopy.mockResolvedValue(copy("made", 10));
    m.api.copyAlive.mockResolvedValue({ api: { ok: true, status: 200 }, shop: { ok: false, status: 404 }, admin: { ok: true, status: 200 }, waiting: false });
    show();
    fireEvent.click(within(await screen.findByTestId("copies-made-rose")).getByRole("button"));
    await screen.findByTestId("copy-made");
    expect(screen.getByTestId("copy-alive-shop").textContent).toContain("rose.vercel.app");
    fireEvent.click(screen.getByTestId("copy-alive"));
    await waitFor(() => expect(screen.getByTestId("copy-alive-api").getAttribute("data-ok")).toBe("true"));
    expect(screen.getByTestId("copy-alive-shop").textContent).toContain("Not answering yet");
    expect(screen.getByTestId("copy-owner-in").textContent).toContain("has made their account");
    expect(screen.getByTestId("copy-welcome").textContent).toContain("/welcome?code=ABCD-EFGH-JKLM-NPQR");
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
    expect(whyText('"console.neon.tech" didn\'t answer in time')).toBe("«console.neon.tech» ما جاوب بالوقت: جرّب كمان مرة");
    expect(whyText("rose.vercel.app is someone else's")).toBe("rose.vercel.app لحدا تاني على Vercel: اختار اسم تاني للموقع");
    expect(STEP_IDS.every((id) => makeStepName(id) !== id)).toBe(true);
    expect(refusedText({ error: "NAME_INVALID", message: "A name is at least 3 letters", details: { at: "server" } })).toBe("اسم السيرفر: الاسم 3 حروف عالأقل");
    expect([tidyName("  My Shop "), tidyName("Rose_Store!!"), tidyName("a--b"), tidyName("-shop-")]).toEqual(["my-shop", "rose-store", "a-b", "shop"]);
  });
});
