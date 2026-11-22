// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// الدخول بحساب Discord وربط Steam over a stand-in API: folded and off on a store that doesn't use them; Discord on only
// with a client ID that is one; the redirect to register is the shop's own callback; the secret is never typed here,
// only said whether it is kept; saved into the header as it is now, keeping Google's part and what other cards saved.

const m = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  updateSettings: vi.fn(),
  secrets: [] as Array<{ name: string }>,
  may: new Set<string>(["settings:read", "settings:write", "connections:read"]),
}));
vi.mock("../../api/settings.api", () => ({ getSettings: vi.fn(async () => m.settings), updateSettings: m.updateSettings }));
vi.mock("../../api/connections.api", () => ({ getConnections: vi.fn(async () => ({ sites: [], secrets: m.secrets, limits: {} })) }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1", VITE_STOREFRONT_BASE_URL: "https://shop.test/ar" } }));

import { setLangForTests } from "../../lib/lang";
import { GameSignInCard } from "./GameSignInCard";
import { gameSignInOf } from "./signInSettings";

const CLIENT = "1234567890123456789";
const GOOGLE = { enabled: true, clientId: "123456789012-abcdefgh12345678.apps.googleusercontent.com" };
const show = (accountsOn = true) =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <GameSignInCard accountsOn={accountsOn} />
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["settings:read", "settings:write", "connections:read"]);
  m.secrets = [];
  m.settings = { id: "settings", header: { signIn: { google: GOOGLE } } };
  m.updateSettings.mockImplementation(async (body: Record<string, unknown>) => ({ ...m.settings, ...body }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Sign in with Discord, link Steam", () => {
  test("read as saved; folded and off until set up; Discord on only with a client ID; saved beside Google's part", async () => {
    expect(gameSignInOf(undefined)).toEqual({ discord: { enabled: false, clientId: "" }, steam: { enabled: false } });
    expect(gameSignInOf({ signIn: { discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } } })).toEqual({ discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } });
    show();
    expect((await screen.findByTestId("game-sign-in-state")).textContent).toBe("Off");
    expect(screen.queryByTestId("discord-sign-in-client")).toBeNull();
    fireEvent.click(screen.getByTestId("game-sign-in-open"));
    expect(screen.getByTestId("discord-sign-in-callback").textContent).toBe("https://shop.test/api/account/discord/callback");
    // The secret isn't kept yet: a way to the page where it is.
    expect((await screen.findByTestId("discord-secret-missing")).getAttribute("href")).toBe("/connections");

    const on = screen.getByTestId("discord-sign-in-enabled") as HTMLInputElement;
    expect(on.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("discord-sign-in-client"), { target: { value: "my-app" } });
    expect(screen.getByTestId("discord-sign-in-bad")).toBeTruthy();
    fireEvent.change(screen.getByTestId("discord-sign-in-client"), { target: { value: CLIENT } });
    expect(screen.queryByTestId("discord-sign-in-bad")).toBeNull();
    fireEvent.click(on);
    fireEvent.click(screen.getByTestId("steam-link-enabled"));
    // Another card saved meanwhile: its part is kept.
    m.settings = { ...m.settings, header: { signIn: { google: GOOGLE }, app: { enabled: true } } };
    fireEvent.click(screen.getByTestId("game-sign-in-save"));
    await waitFor(() => expect(m.updateSettings).toHaveBeenCalledTimes(1));
    expect(m.updateSettings.mock.calls[0][0]).toEqual({ header: { app: { enabled: true }, signIn: { google: GOOGLE, discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } } } });
  });

  test("saved and on: open, says so and that the secret is kept; without the permission nothing can be changed", async () => {
    m.settings = { id: "settings", header: { signIn: { discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } } } };
    m.secrets = [{ name: "DISCORD_CLIENT_SECRET" }];
    m.may = new Set(["settings:read", "connections:read"]);
    show(false);
    expect((await screen.findByTestId("game-sign-in-state")).textContent).toBe("Discord and Steam on");
    expect(await screen.findByTestId("discord-secret-kept")).toBeTruthy();
    expect((screen.getByTestId("discord-sign-in-client") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId("steam-link-enabled") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("It works only with customer accounts on (above).")).toBeTruthy();
  });
});
