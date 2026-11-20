// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// A store with no one in it opens on its first setup, not on a sign-in: the owner's account made with the
// one-time setup code (from the link, or the server's log), then on to the store's own setup. Over a stand-in
// API; the server's part is tested with the database (backend firstRun.spec.ts).

const m = vi.hoisted(() => ({
  api: { firstRunStatus: vi.fn(), firstRunClaim: vi.fn(), phoneStart: vi.fn(), phoneVerify: vi.fn(), login: vi.fn() },
  store: { syncFromStorage: vi.fn(), setAdmin: vi.fn() },
}));
vi.mock("../../api/auth.api", () => m.api);
vi.mock("../../store/auth.store", () => ({ authStore: m.store }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ admin: null, login: { mutateAsync: vi.fn(), isPending: false }, hasPermission: () => true }) }));

import { setLangForTests } from "../../lib/lang";
import FirstRunPage from "./FirstRunPage";
import LoginPage from "./LoginPage";

const CODE = "K7QH-9MXP-3TRA-WZ4E";
function show(at: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/welcome" element={<FirstRunPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<div data-testid="store-setup">store setup</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const type = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });
const fill = (over: Partial<Record<"name" | "email" | "password" | "again", string>> = {}) => {
  type("first-run-name", over.name ?? "Sara");
  type("first-run-email", over.email ?? "owner@rose.test");
  type("first-run-password", over.password ?? "a-long-password");
  type("first-run-again", over.again ?? over.password ?? "a-long-password");
};

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.api.firstRunStatus.mockResolvedValue({ needed: true, codeFrom: "link" });
  m.api.firstRunClaim.mockResolvedValue({ accessToken: "a", refreshToken: "r", admin: { id: "o1", email: "owner@rose.test", name: "Sara", role: "SUPERADMIN" } });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A store with no one in it", () => {
  test("the sign-in sends it to its first setup, with the link's code", async () => {
    show(`/login?code=${CODE}`);
    expect(await screen.findByTestId("first-run")).toBeTruthy();
    expect((screen.getByTestId("first-run-code") as HTMLInputElement).value).toBe(CODE);
    expect(screen.getByTestId("first-run-code-from").textContent).toContain("in the link you were given");
  });

  test("the owner's account made and signed in, then on to the store's own setup", async () => {
    show(`/welcome?code=${CODE}`);
    await screen.findByTestId("first-run");
    const submit = screen.getByTestId("first-run-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fill({ password: "short" });
    expect(screen.getByTestId("first-run").textContent).toContain("At least 10 characters");
    fill({ again: "another-long-one" });
    expect(screen.getByTestId("first-run").textContent).toContain("It doesn't match");
    expect(submit.disabled).toBe(true);
    fill();
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(m.api.firstRunClaim).toHaveBeenCalledWith({ code: CODE, name: "Sara", email: "owner@rose.test", password: "a-long-password" }));
    expect(await screen.findByTestId("store-setup")).toBeTruthy();
    expect(m.store.setAdmin).toHaveBeenCalledWith(expect.objectContaining({ email: "owner@rose.test" }));
  });

  test("a wrong code, and a store that already has its owner, said in the page's words", async () => {
    m.api.firstRunStatus.mockResolvedValue({ needed: true, codeFrom: "log" });
    m.api.firstRunClaim.mockRejectedValueOnce({ response: { status: 403, data: { error: "SETUP_CODE_WRONG" } } });
    show("/welcome");
    await screen.findByTestId("first-run");
    expect(screen.getByTestId("first-run-code-from").textContent).toContain("in the server's log");
    type("first-run-code", "WRONG-CODE-0000");
    fill();
    fireEvent.click(screen.getByTestId("first-run-submit"));
    expect((await screen.findByTestId("first-run-failed")).textContent).toContain("The setup code isn't right");
    m.api.firstRunClaim.mockRejectedValueOnce({ response: { status: 409, data: { error: "FIRST_RUN_DONE" } } });
    fireEvent.click(screen.getByTestId("first-run-submit"));
    await waitFor(() => expect(screen.getByTestId("first-run-failed").textContent).toContain("This store already has its owner."));
    expect(screen.getByTestId("first-run-failed").querySelector("a")!.getAttribute("href")).toBe("/login");
  });

  test("a store that has someone: the first setup sends to the sign-in, and the sign-in stays", async () => {
    m.api.firstRunStatus.mockResolvedValue({ needed: false });
    show("/welcome");
    await waitFor(() => expect(screen.queryByTestId("first-run")).toBeNull());
    expect(await screen.findByText("Welcome back")).toBeTruthy();
  });

  test("its words in Arabic", async () => {
    setLangForTests("ar");
    show("/welcome");
    expect((await screen.findByTestId("first-run")).textContent).toContain("أهلاً بمتجرك الجديد");
  });
});
