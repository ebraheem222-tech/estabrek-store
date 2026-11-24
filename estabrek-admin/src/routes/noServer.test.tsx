// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";

// paintispassion.pages.dev (2026-11-24): its admin was built with no VITE_API_BASE_URL and had no server yet, and
// opened on a sign-in to nothing. An admin with no server opens /connect from any page, the sign-in included.

vi.mock("../config/env", async (real) => {
  const actual = await real<typeof import("../config/env")>();
  const server = { address: actual.LOCAL_API, from: "none" as const };
  return { ...actual, server, PLATFORM_API: null, env: { ...actual.env, VITE_API_BASE_URL: server.address } };
});

import { setLangForTests } from "../lib/lang";
import AppRouter from "./router";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

test.each(["/login", "/", "/welcome?code=ABCD-EFGH-JKMN-PQRS", "/admin/products"])("%s opens the linking of the store", async (at) => {
  setLangForTests("en");
  window.history.pushState({}, "", at);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AppRouter />
    </QueryClientProvider>,
  );
  expect(await screen.findByTestId("connect", {}, { timeout: 4000 })).toBeTruthy();
  expect(window.location.pathname).toBe("/connect");
  expect(screen.queryByText("Welcome back")).toBeNull();
});
