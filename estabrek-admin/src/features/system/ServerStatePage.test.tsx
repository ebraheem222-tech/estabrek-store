import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { DeployPage } from "../../api/deploy.api";

// حالة السيرفر: the page over a stand-in API.
const m = vi.hoisted(() => ({ page: null as unknown, may: new Set<string>(), getDeploy: vi.fn(), checkDeploy: vi.fn(), createRule: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/deploy.api", () => ({ getDeploy: m.getDeploy, checkDeploy: m.checkDeploy }));
vi.mock("../../api/automations.api", () => ({ createRule: m.createRule }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import ServerStatePage from "./ServerStatePage";

const LIVE = "a".repeat(40);
const NEXT = "b".repeat(40);
const NOW = Date.parse("2026-11-13T10:12:00Z");
const base: DeployPage = {
  now: NOW,
  state: "current",
  reason: null,
  live: { commit: LIVE, message: "Merge pull request #91", branch: "main", repo: "acme/shop", deploymentId: null, startedAt: "2026-11-13T09:00:00Z" },
  latest: { commit: LIVE, message: "Merge pull request #91", at: null, seenAt: "2026-11-13T09:00:20Z", since: "2026-11-13T09:00:20Z" },
  mark: null,
  lateAfterMinutes: 10,
  checkedAt: "2026-11-13T10:11:30Z",
  error: null,
  told: false,
  watch: { status: "waiting", everyMs: 60_000, nextAt: "2026-11-13T10:12:30Z", off: null, failuresInRow: 0 },
  rules: [],
  channels: { email: true, outboxWorker: true },
};
const late: DeployPage = { ...base, state: "late", told: true, mark: "in_progress", latest: { commit: NEXT, message: "Merge pull request #92", at: null, seenAt: "2026-11-13T09:57:00Z", since: "2026-11-13T09:57:00Z" } };

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ServerStatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  m.may = new Set(["system:read", "system:write", "settings:write"]);
  m.page = base;
  m.getDeploy.mockImplementation(async () => m.page);
  m.checkDeploy.mockImplementation(async () => ({ ...(m.page as DeployPage), ran: true, busy: false }));
  m.createRule.mockResolvedValue({ rule: {} });
});

describe("Server state page", () => {
  test("the last commit is live: both cards show it, linked to GitHub", async () => {
    show();
    expect((await screen.findByTestId("server-state")).textContent).toBe("آخر نسخة حية");
    expect(screen.getByTestId("server-sentence").textContent).toBe("السيرفر شغّال على آخر تعديل بالفرع main.");
    const live = screen.getByTestId("server-live");
    expect(live.querySelector("a")?.getAttribute("href")).toBe(`https://github.com/acme/shop/commit/${LIVE}`);
    expect(live.textContent).toContain("aaaaaaa");
    expect(screen.getByTestId("server-latest").textContent).toContain("هو نفسه الشغّال");
    expect(screen.queryByTestId("server-watch-problem")).toBeNull();
  });

  test("a commit that isn't live: said in red, with the host's mark; \"look now\" asks the server", async () => {
    m.page = late;
    show();
    expect((await screen.findByTestId("server-state")).textContent).toBe("النشر متأخّر");
    expect(screen.getByTestId("server-sentence").textContent).toContain("التعديل bbbbbbb على الفرع من 15 دقايق ولسا مش حي");
    expect(screen.getByTestId("server-latest").textContent).toContain("علامة Railway: عم ينبنى");
    m.page = base;
    fireEvent.click(screen.getByTestId("server-check"));
    await waitFor(() => expect(screen.getByTestId("server-state").textContent).toBe("آخر نسخة حية"));
    expect(m.checkDeploy).toHaveBeenCalledTimes(1);
  });

  test("the bell is always there; an email rule is one press, then the button goes", async () => {
    show();
    expect((await screen.findByTestId("server-alerts")).textContent).toContain("الجرس باللوحة");
    m.page = { ...base, rules: [{ id: "r1", name: "النشر ما صار حي", action: "email", enabled: true }] };
    fireEvent.click(screen.getByTestId("server-add-email"));
    await waitFor(() => expect(screen.queryByTestId("server-add-email")).toBeNull());
    expect(m.createRule).toHaveBeenCalledWith({ name: "النشر ما صار حي", trigger: "deploy.failed", conditions: {}, action: "email", config: {}, enabled: true, cooldownMinutes: 60 });
    expect(screen.getByTestId("server-alerts").textContent).toContain("إيميل: النشر ما صار حي");
  });

  test("without the right to change: the buttons are off; a paused watch is said", async () => {
    m.may = new Set(["system:read"]);
    m.page = { ...base, watch: { status: "paused", everyMs: 60_000, nextAt: null, off: null, failuresInRow: 0 } };
    show();
    expect(((await screen.findByTestId("server-check")) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("server-add-email") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("server-watch-problem").textContent).toContain("موقّفة");
  });
});
