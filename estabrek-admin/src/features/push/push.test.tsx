// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// الإشعارات over a stand-in API: off, it says where they're switched on; on, the owner writes one, sees it as a phone
// shows it and how many phones it reaches, picks who gets it (one customer by email), confirms and sends; the
// history says how each one went. Without the permission to send, there's nothing to send with.

const m = vi.hoisted(() => ({
  overview: null as unknown as Record<string, unknown>,
  count: vi.fn(),
  send: vi.fn(),
  may: new Set<string>(["outbox:read", "outbox:write"]),
  settings: { siteName: "Estabrek", header: { identity: { shortName: { ar: "استبرق", en: "Estabrek" } }, languages: { enabled: ["ar", "en"], default: "ar" } } },
}));
vi.mock("../../api/push.api", () => ({ getPush: vi.fn(async () => m.overview), pushCount: m.count, sendPush: m.send }));
vi.mock("../../hooks/useSettings", () => ({ useSettings: () => ({ data: m.settings }) }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-router-dom", () => ({ Link: ({ children, to, ...rest }: { children: unknown; to: string }) => <a href={to} {...rest}>{children as never}</a> }));
vi.mock("../../components/media/MediaUrlInput", () => ({
  MediaUrlInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input data-testid="push-image" value={value} onChange={(e) => onChange(e.target.value)} />,
}));
vi.mock("../../components/ConfirmDialog", () => ({
  ConfirmDialog: ({ open, message, onConfirm, onClose }: { open: boolean; message: string; onConfirm: () => void; onClose: () => void }) =>
    open ? (
      <div data-testid="confirm">
        <p data-testid="confirm-message">{message}</p>
        <button onClick={onConfirm} data-testid="confirm-yes">yes</button>
        <button onClick={onClose}>no</button>
      </div>
    ) : null,
}));

import { setLangForTests } from "../../lib/lang";
import PushPage from "./PushPage";
import { EMPTY_DRAFT, countsParts, draftProblems, reachText, sendBodyOf } from "./pushText";

const sent = { id: "m1", title: "Sale", body: "Today", url: "/shop", image: null, words: null, audience: "all", from: "admin", fnId: null, status: "DONE", total: 5, sent: 4, failed: 0, gone: 1, opened: 2, createdAt: "2026-11-18T10:00:00.000Z", finishedAt: "2026-11-18T10:00:05.000Z" };
const overview = (on = true) => ({ on, ask: "banner", orders: true, phones: { all: 5, customers: 2, byDevice: { android: 3, iphone: 2 } }, messages: [sent, { ...sent, id: "m2", title: "تأكّد الطلب ✓", audience: "customer", from: "order", total: 1, sent: 1, gone: 0, opened: 0 }], limits: { title: 80, body: 240, url: 300 } });
const show = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PushPage /></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["outbox:read", "outbox:write"]);
  m.overview = overview();
  m.count.mockImplementation(async (audience: string, email?: string) => {
    if (audience === "customer" && email !== "sara@example.com") throw new Error("PUSH_NO_CUSTOMER");
    return { audience, phones: audience === "all" ? 5 : audience === "customers" ? 2 : 1 };
  });
  m.send.mockResolvedValue({ message: { id: "m3", status: "QUEUED", total: 5 } });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The notification's own sums", () => {
  test("what is wrong with it, and what is sent", () => {
    expect(draftProblems(EMPTY_DRAFT)).toHaveLength(1);
    expect(draftProblems({ ...EMPTY_DRAFT, title: "x", url: "https://evil.test", image: "http://x/y.png", audience: "customer", email: "nope" })).toHaveLength(3);
    expect(draftProblems({ ...EMPTY_DRAFT, title: "x", url: "/shop?c=red", image: "https://res.cloudinary.com/x.jpg" })).toEqual([]);
    expect(
      sendBodyOf({ ...EMPTY_DRAFT, title: "  خصم  ", body: " ", url: "/shop", words: { en: { title: " Sale ", body: "" }, ar: { title: "ignored", body: "" }, he: { title: " ", body: "x" } }, audience: "customer", email: " Sara@Example.com " }, "ar"),
    ).toEqual({ title: "خصم", url: "/shop", words: { en: { title: "Sale" } }, audience: "customer", email: "sara@example.com" });
    expect(reachText(0)).toContain("No phone yet");
    expect(reachText(1)).toContain("one phone");
    expect(countsParts({ sent: 4, total: 5, opened: 2, gone: 1, failed: 0 })).toHaveLength(3);
  });
});

describe("الإشعارات", () => {
  test("off: where they're switched on, and nothing to send with", async () => {
    m.overview = overview(false);
    show();
    expect((await screen.findByTestId("push-off")).textContent).toContain("Notifications are off");
    expect(screen.getByTestId("push-off-settings").getAttribute("href")).toBe("/admin/settings");
    expect(screen.queryByTestId("push-title")).toBeNull();
    // The history still shows.
    expect(screen.getAllByTestId("push-history-row")).toHaveLength(2);
  });

  test("the phones, the history: how many it reached and opened; an order's news says so", async () => {
    show();
    expect((await screen.findByTestId("push-phones-all")).textContent).toBe("5");
    expect(screen.getByTestId("push-phones-customers").textContent).toBe("2");
    const rows = screen.getAllByTestId("push-history-row");
    expect(rows[0].textContent).toContain("Reached 4 of 5 · Opened 2 · 1 phones no longer there");
    expect(rows[1].textContent).toContain("An order's news");
  });

  test("written, seen as a phone shows it, sent to everyone after asking", async () => {
    show();
    const title = await screen.findByTestId("push-title");
    expect((screen.getByTestId("push-send") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(title, { target: { value: "20% off today" } });
    fireEvent.change(screen.getByTestId("push-body"), { target: { value: "On every dress" } });
    fireEvent.change(screen.getByTestId("push-url"), { target: { value: "/shop" } });
    fireEvent.change(screen.getByTestId("push-title-en"), { target: { value: "Sale" } });
    expect(screen.getByTestId("push-preview-title").textContent).toBe("20% off today");
    expect(screen.getByTestId("push-preview-body").textContent).toBe("On every dress");
    await waitFor(() => expect(screen.getByTestId("push-reach").textContent).toBe("It will reach 5 phones"));
    fireEvent.click(screen.getByTestId("push-send"));
    expect(screen.getByTestId("confirm-message").textContent).toContain("It will reach 5 phones");
    expect(m.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("confirm-yes"));
    await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
    expect(m.send.mock.calls[0][0]).toEqual({ title: "20% off today", body: "On every dress", url: "/shop", words: { en: { title: "Sale" } }, audience: "all" });
    // Sent: a clean page for the next one.
    await waitFor(() => expect((screen.getByTestId("push-title") as HTMLInputElement).value).toBe(""));
  });

  test("one customer, by email: someone without an account is said so; a link that isn't the shop's is refused", async () => {
    show();
    fireEvent.change(await screen.findByTestId("push-title"), { target: { value: "Your size is back" } });
    fireEvent.click(screen.getByTestId("push-audience-customer"));
    fireEvent.change(screen.getByTestId("push-email"), { target: { value: "nobody@example.com" } });
    await waitFor(() => expect(screen.getByTestId("push-reach").textContent).toBe("No customer with this email"), { timeout: 3000 });
    expect((screen.getByTestId("push-send") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("push-email"), { target: { value: "sara@example.com" } });
    await waitFor(() => expect(screen.getByTestId("push-reach").textContent).toBe("It will reach one phone"), { timeout: 3000 });
    fireEvent.change(screen.getByTestId("push-url"), { target: { value: "https://evil.test" } });
    expect(screen.getByTestId("push-problems").textContent).toContain("a place in the shop");
    expect((screen.getByTestId("push-send") as HTMLButtonElement).disabled).toBe(true);
  });

  test("without the permission to send: no writing, the history only", async () => {
    m.may = new Set(["outbox:read"]);
    show();
    await screen.findByTestId("push-history");
    expect(screen.queryByTestId("push-title")).toBeNull();
  });
});
