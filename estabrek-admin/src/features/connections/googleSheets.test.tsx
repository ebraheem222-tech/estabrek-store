// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Connections, ReadyKind } from "../../api/connections.api";

// Google Sheets as a ready connection, on the page: its key is a file picked from this device
// (read here only to say whose it is), the account to share the sheet with is shown, and the
// words of what it does and of how Google refuses. The server's part is tested with the database.

const m = vi.hoisted(() => ({ getConnections: vi.fn(), addReady: vi.fn(), saveReady: vi.fn(), removeReady: vi.fn(), tryReady: vi.fn(), addSite: vi.fn(), removeSite: vi.fn(), addSecret: vi.fn(), saveSecret: vi.fn(), removeSecret: vi.fn(), may: new Set<string>(), toastError: vi.fn() }));
vi.mock("../../api/connections.api", () => m);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: m.toastError, info: vi.fn() } }));

import { setLangForTests } from "../../lib/lang";
import ConnectionsPage, { triedText } from "./ConnectionsPage";
import { actionName, fieldName, keyFileAccount, keyName, kindHow, kindName, settingName } from "./readyText";
import { failText, stepLine } from "../functions/fnText";

const EMAIL = "store-sheets@made-up-project.iam.gserviceaccount.com";
// Made up: not a key of anything (and not in a key's shape: its marker is built from parts).
const MARK = ["-----BEGIN", "PRIVATE", "KEY-----"].join(" ");
const KEY_FILE = JSON.stringify({ type: "service_account", project_id: "made-up-project", private_key: `${MARK}\nmade-up\n`, client_email: EMAIL }, null, 2);
const SHEET = "1aBcDeFgHiJkLmNoPqRsTuVwXyZ_0123456789-made";
const google: ReadyKind = {
  kind: "google",
  label: "Google Sheets",
  host: "sheets.googleapis.com",
  keyFile: ".json",
  derived: ["account"],
  settings: [{ id: "sheet", max: 300 }, { id: "tab", max: 100 }],
  actions: [
    { id: "append", fields: [{ id: "sheet", required: true, long: false, or: "sheet" }, { id: "tab", required: true, long: false, or: "tab" }, { id: "cells", required: true, long: true }] },
    { id: "read", fields: [{ id: "sheet", required: true, long: false, or: "sheet" }, { id: "tab", required: true, long: false, or: "tab" }, { id: "range", required: false, long: false }] },
  ],
  test: { sends: false },
};
const slack: ReadyKind = { kind: "slack", label: "Slack", host: "hooks.slack.com", settings: [], actions: [{ id: "message", fields: [{ id: "text", required: true, long: true }] }], test: { sends: true } };
let server: Connections;

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const pick = (testid: string, text: string, name = "key.json") => fireEvent.change(screen.getByTestId(testid), { target: { files: [new File([text], name, { type: "application/json" })] } });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["connections:read", "connections:write"]);
  server = { sites: [], secrets: [], ready: [], kinds: [slack, google], limits: { sites: 50, secrets: 50, value: 4000, ms: 8000, calls: 10, ready: 20 } };
  m.getConnections.mockImplementation(async () => server);
  // As the server answers: the settings with the account worked out from the key, never the key.
  m.addReady.mockImplementation(async (body: { kind: string; name: string; key: string; settings?: Record<string, string> }) => {
    server = { ...server, ready: [...(server.ready ?? []), { id: "g1", kind: body.kind, name: body.name, settings: { ...(body.settings ?? {}), account: EMAIL }, updatedAt: "2026-11-17T10:00:00Z", lastUsedAt: null, usedBy: [] }] };
    return server;
  });
  m.saveReady.mockImplementation(async () => server);
  m.tryReady.mockResolvedValue({ ok: true, status: 200, said: "Orders 2026 (Orders, Archive)", why: null, sends: false });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Google Sheets' words", () => {
  test("the service, its key, its settings, what it does and asks for, in the three languages", () => {
    expect([kindName("google"), keyName("google"), settingName("google", "sheet"), settingName("google", "tab"), settingName("google", "account")]).toEqual(["Google Sheets", "The service account's key file (JSON)", "The usual spreadsheet", "The usual tab", "Share the sheet with"]);
    expect([actionName("google", "append"), actionName("google", "read")]).toEqual(["Add a row", "Read rows"]);
    expect(["sheet", "tab", "cells", "range"].map((f) => fieldName("google", f))).toEqual(["Which spreadsheet", "Which tab", "The row's cells (one a line)", "Which cells (like A1:D100; empty = the whole tab)"]);
    expect(kindHow("google")).toContain("Google Sheets API");
    expect(kindHow("google")).toContain("Share");
    setLangForTests("ar");
    expect([actionName("google", "append"), settingName("google", "account")]).toEqual(["ضيف سطر", "شارك الشيت مع"]);
    expect(kindHow("google")).toContain("Editor");
    setLangForTests("he");
    expect(fieldName("google", "cells")).toBe("תאי השורה (תא בכל שורה)");
  });

  test("a key file is read here only to say whose it is", () => {
    expect(keyFileAccount(KEY_FILE)).toBe(EMAIL);
    expect(keyFileAccount(JSON.stringify({ type: "authorized_user", client_email: EMAIL, private_key: "x" }))).toBeNull();
    expect(keyFileAccount(JSON.stringify({ type: "service_account", client_email: EMAIL }))).toBeNull();
    expect(keyFileAccount("not json")).toBeNull();
  });

  test("Google's refusals, in the page's words; a step's line says the row it adds", () => {
    expect(failText('Google Sheets "Orders" answered 403: The caller does not have permission', "en")).toBe("Google Sheets “Orders” answered 403: The caller does not have permission");
    expect(failText('Google Sheets "Orders" answered 403: The caller does not have permission', "ar")).toBe("«Orders» (Google Sheets) جاوب 403: The caller does not have permission");
    // The others are as they were.
    expect(failText('Telegram "Store alerts" answered 400: Bad Request: chat not found', "ar")).toBe("«Store alerts» (Telegram) جاوب 400: Bad Request: chat not found");
    expect(failText("Google Sheets refused the key: Invalid JWT Signature.", "ar")).toBe("Google Sheets رفض المفتاح: Invalid JWT Signature.");
    expect(failText("Google Sheets refused the key (500)", "en")).toBe("Google Sheets refused the key (500)");
    expect(failText('The key of "Orders" can\'t be read (was the server\'s key changed?)', "en")).toContain("give it again");
    expect([failText("The spreadsheet is empty", "en"), failText("The tab is empty", "en"), failText("The row is empty", "ar")]).toEqual(["No spreadsheet: give one in the step, or as the connection's usual one", "No tab: give one in the step, or as the connection's usual one", "ما في خانات للسطر"]);
    const ctx = { tables: [], fns: [], outside: { ready: [{ id: "g1", name: "Orders", kind: "google", set: ["sheet", "tab", "account"] }] } } as never;
    expect(stepLine({ act: "ready", via: "g1", what: "append", give: { cells: "{{input.name}}\n\n{{input.total}}\n" }, as: "added" }, ctx, "en")).toBe("Orders · {{input.name}} · {{input.total}} ← added");
    expect(stepLine({ act: "ready", via: "g1", what: "read", give: { range: "A1:B10" } }, ctx, "en")).toBe("Orders · A1:B10");
    // Refused at the sheet: where to look.
    expect(triedText({ ok: false, status: 403, said: null, why: "The caller does not have permission", sends: false })).toBe("It didn't work (403): The caller does not have permission. The service refused: for Google Sheets, share the sheet with the service account's email as an Editor.");
  });
});

describe("Connecting a spreadsheet", () => {
  test("the key file is picked, read for its account, and sent as it is; the account to share with is shown after", async () => {
    show();
    fireEvent.click(await screen.findByTestId("ready-new-kind-google"));
    expect(screen.getByTestId("ready-new-how").textContent).toContain("Google Sheets API");
    // A file to pick, not a key to type.
    const key = screen.getByTestId("ready-new-key") as HTMLInputElement;
    expect([key.type, key.accept]).toEqual(["file", ".json,application/json"]);
    // Opened by a button in the page's words (the browser's own one speaks its language).
    expect(key.closest("label")?.textContent).toBe("Pick the key file…");
    fireEvent.change(screen.getByTestId("ready-new-name"), { target: { value: "Orders" } });
    // A file that isn't one: said, and nothing can be sent.
    pick("ready-new-key", '{"type":"authorized_user"}');
    expect((await screen.findByTestId("ready-new-key-read")).textContent).toBe("This isn't a service account's key file (a JSON from Google Cloud)");
    expect((screen.getByTestId("ready-add") as HTMLButtonElement).disabled).toBe(true);
    pick("ready-new-key", `${KEY_FILE}\n`);
    await waitFor(() => expect(screen.getByTestId("ready-new-key-read").textContent).toBe(`The file was read; the service account: ${EMAIL}`));
    fireEvent.change(screen.getByTestId("ready-new-setting-sheet"), { target: { value: `https://docs.google.com/spreadsheets/d/${SHEET}/edit` } });
    fireEvent.change(screen.getByTestId("ready-new-setting-tab"), { target: { value: "Orders" } });
    expect((screen.getByTestId("ready-add") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId("ready-add"));
    await waitFor(() => expect(m.addReady).toHaveBeenCalledWith({ kind: "google", name: "Orders", key: KEY_FILE, settings: { sheet: `https://docs.google.com/spreadsheets/d/${SHEET}/edit`, tab: "Orders" } }));
    // Made: the account to share the sheet with, and a try.
    const row = await screen.findByTestId("ready-g1");
    expect(within(row).getByTestId("ready-g1-account").textContent).toBe(`Share the sheet with: ${EMAIL}`);
    // The settings in the kind's order (not as the database keeps them).
    expect(row.textContent).toContain(`The usual spreadsheet: https://docs.google.com/spreadsheets/d/${SHEET}/edit The usual tab: Orders`);
    expect(within(row).getByTestId("ready-g1-try").textContent).toBe("Try the key");
    fireEvent.click(within(row).getByTestId("ready-g1-try"));
    expect((await screen.findByTestId("ready-g1-tried")).textContent).toBe("It works: Orders 2026 (Orders, Archive)");
    // Nothing of the key is on the page after it was sent.
    expect(document.body.textContent).not.toContain("made-up\n");
    expect((screen.queryByTestId("ready-new-key-read"))).toBeNull();
  });

  test("a new key for a connection is a file too; the other kinds keep a typed key", async () => {
    server = { ...server, ready: [{ id: "g1", kind: "google", name: "Orders", settings: { sheet: SHEET, tab: "Orders", account: EMAIL }, updatedAt: "2026-11-17T10:00:00Z", lastUsedAt: null, usedBy: [] }] };
    show();
    fireEvent.click(await screen.findByTestId("ready-g1-edit"));
    const key = screen.getByTestId("ready-g1-key") as HTMLInputElement;
    expect(key.type).toBe("file");
    // Saved without a new file: the key stays (the settings go as the page holds them; the server keeps the account its own).
    fireEvent.click(screen.getByTestId("ready-g1-save"));
    await waitFor(() => expect(m.saveReady).toHaveBeenCalledWith("g1", { settings: { sheet: SHEET, tab: "Orders", account: EMAIL } }));
    fireEvent.click(screen.getByTestId("ready-g1-edit"));
    pick("ready-g1-key", KEY_FILE);
    await screen.findByTestId("ready-g1-key-read");
    fireEvent.click(screen.getByTestId("ready-g1-save"));
    await waitFor(() => expect(m.saveReady).toHaveBeenLastCalledWith("g1", { key: KEY_FILE, settings: { sheet: SHEET, tab: "Orders", account: EMAIL } }));
    // Slack's key is still typed.
    fireEvent.click(screen.getByTestId("ready-new-kind-slack"));
    expect((screen.getByTestId("ready-new-key") as HTMLInputElement).type).toBe("password");
  });
});
