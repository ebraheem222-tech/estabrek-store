// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// الدخول بحساب Google over a stand-in API: off until there is a client ID that is one; the steps name the shop's own
// address as Google asks for it; saved into the header as it is now, keeping what other cards saved.

const m = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn(), may: new Set<string>(["settings:read", "settings:write"]) }));
vi.mock("../../api/settings.api", () => ({ getSettings: vi.fn(async () => m.settings), updateSettings: m.updateSettings }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1", VITE_STOREFRONT_BASE_URL: "https://shop.test/ar" } }));

import { setLangForTests } from "../../lib/lang";
import { GoogleSignInCard, googleSettingOf } from "./GoogleSignInCard";

const CLIENT = "123456789012-abcdefgh12345678.apps.googleusercontent.com";
const show = (accountsOn = true) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><GoogleSignInCard accountsOn={accountsOn} /></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["settings:read", "settings:write"]);
  m.settings = { id: "settings", header: { app: { enabled: true } } };
  m.updateSettings.mockImplementation(async (body: Record<string, unknown>) => ({ ...m.settings, ...body }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Sign in with Google", () => {
  test("read as saved; off until a client ID that is one; saved into the header as it is now", async () => {
    expect(googleSettingOf(undefined)).toEqual({ enabled: false, clientId: "" });
    expect(googleSettingOf({ signIn: { google: { enabled: true, clientId: CLIENT } } })).toEqual({ enabled: true, clientId: CLIENT });
    show();
    expect((await screen.findByTestId("google-sign-in-state")).textContent).toBe("Off");
    expect(screen.getByTestId("google-sign-in-origin").textContent).toBe("https://shop.test");
    const on = screen.getByTestId("google-sign-in-enabled") as HTMLInputElement;
    expect(on.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("google-sign-in-client"), { target: { value: "my-client" } });
    expect(screen.getByTestId("google-sign-in-bad")).toBeTruthy();
    expect(on.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("google-sign-in-client"), { target: { value: CLIENT } });
    expect(screen.queryByTestId("google-sign-in-bad")).toBeNull();
    fireEvent.click(on);
    // Another card saved meanwhile: its part is kept.
    m.settings = { ...m.settings, header: { app: { enabled: true }, languages: { enabled: ["ar", "en"], default: "ar" } } };
    fireEvent.click(screen.getByTestId("google-sign-in-save"));
    await waitFor(() => expect(m.updateSettings).toHaveBeenCalledTimes(1));
    expect(m.updateSettings.mock.calls[0][0]).toEqual({ header: { app: { enabled: true }, languages: { enabled: ["ar", "en"], default: "ar" }, signIn: { google: { enabled: true, clientId: CLIENT } } } });
  });

  test("saved and on, it says so; without the permission nothing can be changed", async () => {
    m.settings = { id: "settings", header: { signIn: { google: { enabled: true, clientId: CLIENT } } } };
    m.may = new Set(["settings:read"]);
    show(false);
    expect((await screen.findByTestId("google-sign-in-state")).textContent).toBe("On in the shop");
    expect((screen.getByTestId("google-sign-in-client") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("It works only with customer accounts on (above).")).toBeTruthy();
  });
});
