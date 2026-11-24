// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ComponentProps } from "react";
import fs from "node:fs";
import path from "node:path";

// A copy's admin put up on its host before anything was linked (paintispassion.pages.dev, 2026-11-24: no
// VITE_API_BASE_URL in its build and no server yet) showed a sign-in to nothing. It opens /connect instead,
// which takes the owner through Neon → Railway (every variable the server needs, its secrets made here) → the
// server's address, checked and kept in this browser → the owner's account, with the setup code it made.

import { setLangForTests } from "../../lib/lang";
import { SERVER_KEY } from "../../config/env";
import ConnectPage from "./ConnectPage";
import ServerKeptNotice from "./ServerKeptNotice";
import { databaseAddress, madeSetupCode, newSecrets, pagesProject, serverVariables } from "./serverLink";

const ORIGIN = "https://paintcopy.pages.dev";
const NEON = "postgresql://neondb_owner:pw@ep-cool-name-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

function answers(body: unknown, type = "application/json") {
  return vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200, headers: { "Content-Type": type } }));
}
function show(props: Partial<ComponentProps<typeof ConnectPage>> = {}) {
  const go = vi.fn();
  render(
    <MemoryRouter initialEntries={["/connect"]}>
      <ConnectPage from="none" address="http://localhost:4000/v1" origin={ORIGIN} go={go} {...props} />
    </MemoryRouter>,
  );
  return go;
}
const type = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });

beforeEach(() => {
  setLangForTests("en");
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("An admin with no server", () => {
  test("the server's lines: the database pasted, this admin's address, secrets made here and the setup code", () => {
    show();
    const copy = screen.getByTestId("connect-variables-copy") as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    // Pasted as Neon's psql command gives it: the address alone is taken.
    type("connect-database", `psql '${NEON}'`);
    expect(copy.disabled).toBe(false);
    const lines = Object.fromEntries(screen.getByTestId("connect-variables").textContent!.split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    expect(lines.NODE_ENV).toBe("production");
    expect(lines.DATABASE_URL).toBe(NEON);
    expect(lines.CORS_ORIGINS).toBe(ORIGIN);
    expect(lines.ADMIN_APP_URL).toBe(ORIGIN);
    expect(lines.SETUP_CODE).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/);
    for (const k of ["JWT_SECRET", "WEBHOOK_TOKEN", "CODES_ENCRYPTION_KEY", "BACKUP_ENCRYPTION_KEY"]) expect(lines[k]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set([lines.JWT_SECRET, lines.WEBHOOK_TOKEN, lines.CODES_ENCRYPTION_KEY, lines.BACKUP_ENCRYPTION_KEY]).size).toBe(4);
    expect(screen.getByTestId("connect-folder").textContent).toBe("estabrek-store-backend");
    // Nothing of the database is kept anywhere.
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain("neon.tech");
  });

  test("a string that isn't a database's is said so", () => {
    show();
    type("connect-database", "https://console.neon.tech/app/projects");
    expect(screen.getByTestId("connect-step-neon").textContent).toContain("it starts with postgresql://");
    expect((screen.getByTestId("connect-variables-copy") as HTMLButtonElement).disabled).toBe(true);
  });

  test("linked: the address checked, kept in this browser, and on to the owner's account with the code the server was given", async () => {
    const fetcher = answers({ needed: true, codeFrom: "link" });
    const go = show({ fetcher: fetcher as never });
    type("connect-database", NEON);
    const code = /SETUP_CODE=(\S+)/.exec(screen.getByTestId("connect-variables").textContent!)![1];
    type("connect-address", "paint-api.up.railway.app");
    fireEvent.click(screen.getByTestId("connect-submit"));
    await waitFor(() => expect(go).toHaveBeenCalledWith(`/welcome?code=${encodeURIComponent(code)}`));
    expect(fetcher).toHaveBeenCalledWith("https://paint-api.up.railway.app/v1/auth/first-run", expect.anything());
    expect(localStorage.getItem(SERVER_KEY)).toBe("https://paint-api.up.railway.app/v1");
  });

  test("a server that has its owner already: kept, and on to the sign-in", async () => {
    const go = show({ fetcher: answers({ needed: false }) as never });
    type("connect-address", "https://paint-api.up.railway.app/");
    fireEvent.click(screen.getByTestId("connect-submit"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("/login"));
    expect(localStorage.getItem(SERVER_KEY)).toBe("https://paint-api.up.railway.app/v1");
  });

  test("no answer: still building or not allowing this admin, with the address CORS_ORIGINS needs; nothing kept", async () => {
    const go = show({ fetcher: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as never });
    type("connect-address", "paint-api.up.railway.app");
    fireEvent.click(screen.getByTestId("connect-submit"));
    expect(await screen.findByTestId("connect-answer-silent")).toBeTruthy();
    expect(screen.getByTestId("connect-origin").textContent).toBe(ORIGIN);
    expect(go).not.toHaveBeenCalled();
    expect(localStorage.getItem(SERVER_KEY)).toBeNull();
  });

  test("an answer that isn't a store's server (a page, Railway's 404): the folder to check; nothing kept", async () => {
    const go = show({ fetcher: answers("<!doctype html><html></html>", "text/html") as never });
    type("connect-address", "paint-api.up.railway.app");
    fireEvent.click(screen.getByTestId("connect-submit"));
    expect((await screen.findByTestId("connect-answer-other")).textContent).toContain("estabrek-store-backend");
    expect(go).not.toHaveBeenCalled();
    expect(localStorage.getItem(SERVER_KEY)).toBeNull();
  });

  test("an http address on a host isn't taken", async () => {
    const fetcher = answers({ needed: true });
    show({ fetcher: fetcher as never });
    type("connect-address", "http://paint-api.up.railway.app");
    fireEvent.click(screen.getByTestId("connect-submit"));
    expect(screen.getByTestId("connect-step-link").textContent).toContain("That isn't an address");
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("how to make it stay: the host's variable and its value, with a link to this Pages project", () => {
    show();
    type("connect-address", "paint-api.up.railway.app");
    expect(screen.getByTestId("connect-pin-name").textContent).toBe("VITE_API_BASE_URL");
    expect(screen.getByTestId("connect-pin-value").textContent).toBe("https://paint-api.up.railway.app/v1");
    expect(screen.getByRole("link", { name: "Cloudflare" }).getAttribute("href")).toBe("https://dash.cloudflare.com/?to=/:account/pages/view/paintcopy");
  });
});

describe("An admin on a server kept in this browser", () => {
  test("shows it, what it answers, how to make it stay, and unlinks it", async () => {
    localStorage.setItem(SERVER_KEY, "https://paint-api.up.railway.app/v1");
    const go = show({ from: "browser", address: "https://paint-api.up.railway.app/v1", fetcher: answers({ needed: false }) as never });
    expect(screen.getByTestId("connect-kept-address").textContent).toBe("https://paint-api.up.railway.app/v1");
    expect(await screen.findByTestId("connect-answer-ok")).toBeTruthy();
    expect(screen.getByTestId("connect-pin-value").textContent).toBe("https://paint-api.up.railway.app/v1");
    expect(screen.queryByTestId("connect-step-neon")).toBeNull();
    fireEvent.click(screen.getByTestId("connect-forget"));
    expect(localStorage.getItem(SERVER_KEY)).toBeNull();
    expect(go).toHaveBeenCalledWith("/connect");
  });

  test("a reminder on every other page until the host has it", () => {
    const { unmount } = render(<ServerKeptNotice from="browser" path="/admin/dashboard" />);
    expect(screen.getByTestId("server-kept-notice")).toBeTruthy();
    unmount();
    render(<ServerKeptNotice from="build" path="/admin/dashboard" />);
    expect(screen.queryByTestId("server-kept-notice")).toBeNull();
    render(<ServerKeptNotice from="browser" path="/connect" />);
    expect(screen.queryByTestId("server-kept-notice")).toBeNull();
  });
});

describe("An admin built with an address", () => {
  test("says what it answers and how to fix it, with no way to point it elsewhere", async () => {
    show({ from: "build", address: "https://paint-api.up.railway.app/v1", fetcher: vi.fn(async () => Promise.reject(new TypeError("x"))) as never });
    expect(screen.getByTestId("connect-built-address").textContent).toBe("https://paint-api.up.railway.app/v1");
    expect(await screen.findByTestId("connect-answer-silent")).toBeTruthy();
    expect(screen.queryByTestId("connect-address")).toBeNull();
    expect(screen.queryByTestId("connect-database")).toBeNull();
  });
});

describe("What the server is given", () => {
  test("every variable is one the server reads (backend config/env.ts)", () => {
    const schema = fs.readFileSync(path.join(process.cwd(), "..", "estabrek-store-backend", "src", "config", "env.ts"), "utf8");
    for (const [name] of serverVariables(NEON, ORIGIN, newSecrets())) expect(schema, name).toMatch(new RegExp(`^\\s+${name}:`, "m"));
  });

  test("secrets long enough for the server's own rules, setup codes like its own", () => {
    const s = newSecrets();
    for (const v of [s.JWT_SECRET, s.WEBHOOK_TOKEN, s.CODES_ENCRYPTION_KEY, s.BACKUP_ENCRYPTION_KEY, s.SETUP_CODE]) expect(v.length).toBeGreaterThanOrEqual(16);
    const codes = new Set(Array.from({ length: 50 }, madeSetupCode));
    expect(codes.size).toBe(50);
    for (const c of codes) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/);
  });

  test("the database out of what was pasted, the Pages project out of the address", () => {
    expect(databaseAddress(`psql '${NEON}'`)).toBe(NEON);
    expect(databaseAddress(` "${NEON}" `)).toBe(NEON);
    expect(databaseAddress("DATABASE_URL=postgres://u:p@host/db")).toBe("postgres://u:p@host/db");
    expect(databaseAddress("neon.tech")).toBeNull();
    expect(pagesProject("paintcopy.pages.dev")).toBe("paintcopy");
    expect(pagesProject("3f2a1b.paintcopy.pages.dev")).toBe("paintcopy");
    expect(pagesProject("admin.example.com")).toBeNull();
  });
});
