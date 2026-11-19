// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PayRow } from "../../api/paymentRequests.api";

// الدفعات المطلوبة: the payments functions asked for, over a stand-in API: by their state, searched; a waiting one's
// link copied, or closed (asked first, and only with orders:write).

const m = vi.hoisted(() => ({ listPayments: vi.fn(), cancelPayment: vi.fn(), toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, may: new Set<string>() }));
vi.mock("../../api/paymentRequests.api", () => ({ listPayments: m.listPayments, cancelPayment: m.cancelPayment }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: m.toast }));

import { setLangForTests } from "../../lib/lang";
import PaymentRequestsPage from "./PaymentRequestsPage";
import { moneyText, payWhen } from "./paymentsText";

const row = (over: Partial<PayRow>): PayRow => ({ id: "p1", title: "Booking, Saturday 10:00", amount: 120, currency: "ILS", status: "PENDING", ref: "B-7", email: "sara@example.com", phone: null, provider: null, paymentReference: null, link: "https://shop.test/en/pay/abc", fnId: "f1", paidAt: null, expiresAt: "2026-11-26T10:00:00Z", createdAt: "2026-11-19T10:00:00Z", ...over });
let rows: PayRow[] = [];

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <PaymentRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["orders:read", "orders:write"]);
  rows = [row({}), row({ id: "p2", title: "Membership", amount: 50, status: "PAID", provider: "stripe", paidAt: "2026-11-19T12:00:00Z", ref: null, email: null, phone: "0599123456" })];
  m.listPayments.mockImplementation(async (q: { status?: string; q?: string }) => {
    const shown = rows.filter((r) => (!q.status || r.status === q.status) && (!q.q || r.title.includes(q.q)));
    return { rows: shown, total: shown.length, page: 1, pageSize: 50, paid: [{ currency: "ILS", count: 1, amount: 50 }] };
  });
  m.cancelPayment.mockImplementation(async (id: string) => {
    rows = rows.map((r) => (r.id === id ? { ...r, status: "CANCELLED" as const } : r));
    return rows.find((r) => r.id === id);
  });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Payments asked for", () => {
  test("the waiting ones first; each state on its own tab, searched; what came in", async () => {
    show();
    const list = await screen.findByTestId("payments-list");
    expect(m.listPayments).toHaveBeenLastCalledWith({ status: "PENDING", q: undefined, page: 1 });
    expect(within(list).getByTestId("payment-p1").textContent).toContain("Booking, Saturday 10:00");
    expect(within(list).getByTestId("payment-p1").textContent).toContain("Reference B-7");
    expect(screen.getByTestId("payments-paid").textContent).toContain("(1)");
    fireEvent.click(screen.getByTestId("payments-tab-PAID"));
    expect(await screen.findByTestId("payment-p2")).toHaveAttribute("data-status", "PAID");
    expect(screen.getByTestId("payment-p2").textContent).toContain("(Stripe)");
    // A paid one has nothing to copy or close.
    expect(screen.queryByTestId("payment-p2-cancel")).toBeNull();
    fireEvent.click(screen.getByTestId("payments-tab-ALL"));
    fireEvent.change(screen.getByTestId("payments-search"), { target: { value: "Member" } });
    await waitFor(() => expect(m.listPayments).toHaveBeenLastCalledWith({ status: undefined, q: "Member", page: 1 }));
  });

  test("a waiting one closed after asking; only with orders:write", async () => {
    show();
    fireEvent.click(await screen.findByTestId("payment-p1-cancel"));
    // (The dialog's own button: the row's has the same words.)
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close it" }));
    await waitFor(() => expect(m.cancelPayment).toHaveBeenCalledWith("p1"));
    await waitFor(() => expect(m.toast.success).toHaveBeenCalled());
    cleanup();
    m.may = new Set(["orders:read"]);
    rows = [row({})];
    show();
    await screen.findByTestId("payment-p1");
    expect(screen.queryByTestId("payment-p1-cancel")).toBeNull();
    expect(screen.getByTestId("payment-p1-copy")).toBeTruthy();
  });

  test("its words: money in its currency, and what became of it", () => {
    expect(moneyText(120, "ILS", "en")).toBe("₪120.00");
    expect(moneyText(5, "NOPE", "en")).toBe("5 NOPE");
    expect(payWhen(row({ status: "PAID", paidAt: "2026-11-19T12:00:00Z", provider: "paypal" }), "en")).toMatch(/^Asked .+ · paid .+ \(PayPal\)$/);
    expect(payWhen(row({}), "ar")).toMatch(/^انطلبت .+ · الرابط لحد .+$/);
    expect(payWhen(row({ status: "EXPIRED" }), "he")).toMatch(/^התבקש .+ · פג .+$/);
  });
});
