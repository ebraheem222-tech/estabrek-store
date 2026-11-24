// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The customer accounts switch: with no email set up on the server, sign-in codes never reach customers. The owner
// was told so only before turning accounts on; once on, the warning went, and the codes still went nowhere.

vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../api/customers.api", () => ({ setCustomerAccounts: vi.fn(async () => ({})) }));

import { setLangForTests } from "../../lib/lang";
import { AccountsSwitch } from "./CustomersPage";

const show = (enabled: boolean, emailReady: boolean) =>
  render(<QueryClientProvider client={new QueryClient()}><AccountsSwitch enabled={enabled} emailReady={emailReady} /></QueryClientProvider>);

beforeEach(() => setLangForTests("en"));
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("customer accounts and email", () => {
  test("on with no email set up: the owner is told the codes don't arrive, and what to set", () => {
    show(true, false);
    const note = screen.getByTestId("accounts-email-missing");
    expect(note.textContent).toContain("sign-in codes don't reach customers");
    expect(note.textContent).toContain("RESEND_API_KEY");
    expect(note.textContent).toContain("EMAIL_FROM");
  });
  test("on with email set up, or still off: no such warning", () => {
    show(true, true);
    expect(screen.queryByTestId("accounts-email-missing")).toBeNull();
    cleanup();
    show(false, false);
    expect(screen.queryByTestId("accounts-email-missing")).toBeNull();
    expect(screen.getByTestId("accounts-switch").textContent).toContain("Before turning it on");
  });
});
