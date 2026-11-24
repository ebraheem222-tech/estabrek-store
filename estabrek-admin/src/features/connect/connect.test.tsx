// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ComponentProps } from "react";

// A copy's admin put up on the platform owner's Cloudflare Pages before anything was linked (paintispassion.pages.dev,
// 2026-11-24): no VITE_API_BASE_URL and no server, so it showed a sign-in to nothing. Its client can't reach that
// Cloudflare and has no Neon or Railway: one button asks the platform's server (backend lib/siteAsk.ts) to make them,
// the owner says yes after matching six letters, and once made the page goes on to the owner's account with its code.

import { setLangForTests } from "../../lib/lang";
import { SERVER_KEY } from "../../config/env";
import ConnectPage from "./ConnectPage";
import { partsOf } from "./serverLink";

const PLATFORM = "https://platform-api.up.railway.app/v1";
const API = "https://paint-api.up.railway.app/v1";
const CODE = "K7QH-9MXP-3TRA-WZ4E";
const done = (ids: string[]) => ids.map((id) => ({ id, state: "done" as const }));
const STEPS = ["neon.project", "railway.project", "railway.service", "railway.domain", "railway.variables", "railway.deploy", "owner.account", "vercel.project", "cloudflare.project", "vercel.deploy", "cloudflare.deploy", "railway.addresses"];

/** The platform and the new server, stood in for: what each address answers now. */
type World = { asked: Array<{ url: string; body: unknown }>; status: () => { code: number; body: unknown }; ask: () => { code: number; body: unknown }; server: () => unknown };
let world: World;
const reply = (code: number, body: unknown) => new Response(JSON.stringify(body), { status: code, headers: { "Content-Type": "application/json" } });
const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  world.asked.push({ url: u, body });
  if (u === `${PLATFORM}/site-ask`) {
    const r = world.ask();
    return reply(r.code, r.body);
  }
  if (u === `${PLATFORM}/site-ask/status`) {
    const r = world.status();
    return reply(r.code, r.body);
  }
  if (u === `${API}/auth/first-run`) {
    const s = world.server();
    if (s instanceof Error) throw s;
    return reply(200, s);
  }
  throw new TypeError("Failed to fetch");
});

function show(props: Partial<ComponentProps<typeof ConnectPage>> = {}) {
  const go = vi.fn();
  render(
    <MemoryRouter initialEntries={["/connect"]}>
      <ConnectPage from="none" address="http://localhost:4000/v1" platform={PLATFORM} go={go} fetcher={fetcher as never} every={20} {...props} />
    </MemoryRouter>,
  );
  return go;
}

beforeEach(() => {
  setLangForTests("en");
  localStorage.clear();
  fetcher.mockClear();
  world = {
    asked: [],
    status: () => ({ code: 404, body: { error: "ASK_NOT_FOUND" } }),
    ask: () => ({ code: 200, body: { pair: "K7Q-H9M", state: "waiting" } }),
    server: () => new TypeError("Failed to fetch"),
  };
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("An admin with no server", () => {
  test("one button asks the platform; the letters to read to its owner; once said yes and made, on to the owner's account with the code", async () => {
    const go = show();
    // Nothing asked yet by this browser: the button, and no account needed anywhere.
    expect((await screen.findByTestId("connect-start")).textContent).toContain("You need no account anywhere");
    fireEvent.click(screen.getByTestId("connect-ask"));
    expect((await screen.findByTestId("connect-pair")).textContent).toBe("K7Q-H9M");
    const key = (world.asked.find((a) => a.url === `${PLATFORM}/site-ask`)!.body as { key: string }).key;
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // The owner says yes: the making followed in four parts.
    let steps = STEPS.map((id) => ({ id, state: "waiting" as string }));
    steps = steps.map((s) => (s.id.startsWith("neon.") ? { ...s, state: "done" } : s.id === "railway.project" ? { ...s, state: "doing" } : s));
    world.status = () => ({ code: 200, body: { state: "making", pair: "K7Q-H9M", steps } });
    await waitFor(() => expect(screen.getByTestId("connect-making").getAttribute("data-state")).toBe("making"));
    expect(screen.getByTestId("connect-part-neon").getAttribute("data-state")).toBe("done");
    expect(screen.getByTestId("connect-part-railway").getAttribute("data-state")).toBe("doing");
    expect(screen.getByTestId("connect-part-vercel").getAttribute("data-state")).toBe("waiting");

    // Made: the server kept in this browser, waited for until it answers, then the owner's account with the code.
    world.status = () => ({ code: 200, body: { state: "made", pair: "K7Q-H9M", steps: done(STEPS), api: API, code: CODE } });
    await waitFor(() => expect(localStorage.getItem(SERVER_KEY)).toBe(API));
    expect(go).not.toHaveBeenCalled();
    world.server = () => ({ needed: true, codeFrom: "link" });
    await waitFor(() => expect(go).toHaveBeenCalledWith(`/welcome?code=${encodeURIComponent(CODE)}`));
    // Every status asked with this browser's own key, and only of the platform.
    expect(world.asked.filter((a) => a.url.endsWith("/site-ask/status")).every((a) => (a.body as { key: string }).key === key)).toBe(true);
    expect(localStorage.getItem("admin.ask.key")).toBeNull();
  });

  test("a reload follows the ask on with the same key; a no is said, and it may ask again", async () => {
    localStorage.setItem("admin.ask.key", "k-kept-from-before-0123456789abcdefghijk");
    world.status = () => ({ code: 200, body: { state: "waiting", pair: "ABC-DEF" } });
    show();
    expect((await screen.findByTestId("connect-pair")).textContent).toBe("ABC-DEF");
    expect((world.asked[0].body as { key: string }).key).toBe("k-kept-from-before-0123456789abcdefghijk");
    world.status = () => ({ code: 200, body: { state: "refused", pair: "ABC-DEF" } });
    expect(await screen.findByTestId("connect-refused")).toBeTruthy();
    world.ask = () => ({ code: 200, body: { pair: "GHJ-KMN", state: "waiting" } });
    world.status = () => ({ code: 200, body: { state: "waiting", pair: "GHJ-KMN" } });
    fireEvent.click(screen.getByTestId("connect-ask-again"));
    await waitFor(() => expect(screen.getByTestId("connect-pair").textContent).toBe("GHJ-KMN"));
  });

  test("a store that already has its owner: kept, and on to the sign-in", async () => {
    world.status = () => ({ code: 200, body: { state: "made", pair: "ABC-DEF", steps: done(STEPS), api: API, code: CODE } });
    world.server = () => ({ needed: false });
    localStorage.setItem("admin.ask.key", "k-kept-from-before-0123456789abcdefghijk");
    const go = show();
    await waitFor(() => expect(go).toHaveBeenCalledWith("/login"));
    expect(localStorage.getItem(SERVER_KEY)).toBe(API);
  });

  test("the platform unreachable, or the site being made for another browser, said so", async () => {
    world.ask = () => {
      throw new TypeError("Failed to fetch");
    };
    fetcher.mockImplementationOnce(async () => {
      throw new TypeError("Failed to fetch");
    });
    show();
    expect(await screen.findByTestId("connect-silent")).toBeTruthy();
    cleanup();
    world.ask = () => ({ code: 409, body: { error: "ASK_TAKEN" } });
    show();
    fireEvent.click(await screen.findByTestId("connect-ask"));
    expect((await screen.findByTestId("connect-not-taken")).textContent).toContain("being made for another browser");
  });

  test("a build that doesn't know its platform says so", () => {
    show({ platform: null });
    expect(screen.getByTestId("connect-no-platform")).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("An admin with a server", () => {
  test("kept in this browser: shown, what it answers, the site being built again, and unlinked", async () => {
    localStorage.setItem(SERVER_KEY, API);
    world.server = () => ({ needed: false });
    const go = show({ from: "browser", address: API });
    expect(screen.getByTestId("connect-kept-address").textContent).toBe(API);
    expect(await screen.findByTestId("connect-answer-ok")).toBeTruthy();
    fireEvent.click(screen.getByTestId("connect-forget"));
    expect(localStorage.getItem(SERVER_KEY)).toBeNull();
    expect(go).toHaveBeenCalledWith("/connect");
  });

  test("built with one: what it answers, and no way to point it elsewhere or to ask", async () => {
    show({ from: "build", address: API });
    expect(screen.getByTestId("connect-built-address").textContent).toBe(API);
    expect(await screen.findByTestId("connect-answer-silent")).toBeTruthy();
    expect(screen.queryByTestId("connect-ask")).toBeNull();
    await act(async () => new Promise((r) => setTimeout(r, 30)));
    expect(world.asked.every((a) => !a.url.startsWith(PLATFORM))).toBe(true);
  });
});

test("the making in the four parts a client knows", () => {
  const steps = STEPS.map((id) => ({ id, state: "waiting" as const }));
  expect(partsOf(steps)).toEqual({ neon: "waiting", railway: "waiting", vercel: "waiting", cloudflare: "waiting" });
  expect(partsOf(steps.map((s) => (s.id === "railway.deploy" ? { ...s, state: "failed" as const } : s.id.startsWith("neon") ? { ...s, state: "done" as const } : s)))).toMatchObject({ neon: "done", railway: "failed" });
  expect(partsOf(done(STEPS))).toEqual({ neon: "done", railway: "done", vercel: "done", cloudflare: "done" });
});
