// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// الإعدادات → التطبيق (header.app) over a stand-in API: off until the owner switches it on; the icon and the opening
// screen shown as a phone shows them, in the store's own names until the app has its own; saved into the header as
// it is now, keeping what other cards saved.

const m = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn(), may: new Set<string>(["settings:read", "settings:write"]) }));
vi.mock("../../api/settings.api", () => ({ getSettings: vi.fn(async () => m.settings), updateSettings: m.updateSettings }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../components/media/MediaUrlInput", () => ({
  MediaUrlInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input data-testid="store-app-icon-url" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

import { setLangForTests } from "../../lib/lang";
import { StoreAppCard } from "./StoreAppCard";
import { APP_DEFAULTS, ROSE, inkOn, previewColours, previewLetter, previewPicture, savedApp, storeAppOf } from "./storeApp";

const header = { identity: { name: { ar: "متجر استبرق", en: "Estabrek" }, shortName: { ar: "استبرق", en: "Estabrek" } }, languages: { enabled: ["ar", "en"], default: "ar" }, seo: { title: "x" } };
const show = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><StoreAppCard /></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["settings:read", "settings:write"]);
  m.settings = { id: "settings", siteName: "Estabrek", logoUrl: "https://res.cloudinary.com/x/logo.png", header };
  m.updateSettings.mockImplementation(async (body: Record<string, unknown>) => ({ ...m.settings, ...body }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The app's settings", () => {
  test("read as the shop reads them; what is saved holds only what is set", () => {
    expect(storeAppOf(undefined)).toEqual(APP_DEFAULTS);
    expect(storeAppOf({ app: { enabled: true, themeColor: "#ABC", backgroundColor: "blue", iconUrl: "http://x/y.png", prompt: "nope" } })).toEqual({ ...APP_DEFAULTS, enabled: true, themeColor: "#abc" });
    expect(savedApp({ ...APP_DEFAULTS, enabled: true, shortName: "  S  " })).toEqual({ enabled: true, prompt: "banner", shortName: "S" });
    expect(previewColours(APP_DEFAULTS, "#112233")).toEqual({ theme: "#112233", background: ROSE.background });
    expect(previewPicture(APP_DEFAULTS, { faviconUrl: "/favicon.png" })).toBe("/favicon.png");
    expect(previewLetter(header, "متجر")).toBe("E");
    expect(previewLetter({}, "متجر")).toBe("S");
    expect(inkOn("#ffffff")).toBe("#1f1a1d");
    expect(inkOn("#a43b64")).toBe("#ffffff");
  });
});

describe("The app's card", () => {
  test("off by default; switched on and given its own name and colour, it's saved into the header as it is now", async () => {
    show();
    expect(((await screen.findByTestId("store-app-enabled")) as HTMLInputElement).checked).toBe(false);
    // The store's own names stand in; the logo is the icon.
    expect(screen.getByTestId("store-app-label").textContent).toBe("استبرق");
    expect(screen.getAllByTestId("store-app-icon")[0].querySelector("img")?.getAttribute("src")).toBe("https://res.cloudinary.com/x/logo.png");
    expect((screen.getByTestId("store-app-save") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByTestId("store-app-enabled"));
    fireEvent.change(screen.getByTestId("store-app-short"), { target: { value: "Estabrek" } });
    fireEvent.change(screen.getByTestId("store-app-themeColor"), { target: { value: "#123456" } });
    fireEvent.change(screen.getByTestId("store-app-prompt"), { target: { value: "button" } });
    expect(screen.getByTestId("store-app-label").textContent).toBe("Estabrek");
    expect((screen.getAllByTestId("store-app-icon")[0] as HTMLElement).style.background).toBe("rgb(18, 52, 86)");

    // Another card saved meanwhile: its part is kept.
    m.settings = { ...m.settings, header: { ...header, languages: { enabled: ["ar", "en", "he"], default: "ar" } } };
    fireEvent.click(screen.getByTestId("store-app-save"));
    await waitFor(() => expect(m.updateSettings).toHaveBeenCalledTimes(1));
    expect(m.updateSettings.mock.calls[0][0]).toEqual({ header: { ...header, languages: { enabled: ["ar", "en", "he"], default: "ar" }, app: { enabled: true, prompt: "button", shortName: "Estabrek", themeColor: "#123456" } } });
  });

  test("a colour set by the owner goes back to the store's; no picture: the first letter; without the permission, nothing changes", async () => {
    m.settings = { id: "settings", siteName: "Estabrek", header: { ...header, app: { enabled: true, themeColor: "#ffffff" } } };
    show();
    await screen.findByTestId("store-app-on");
    expect(screen.getAllByTestId("store-app-icon")[0].textContent).toBe("E");
    fireEvent.click(screen.getByTestId("store-app-themeColor-reset"));
    expect((screen.getAllByTestId("store-app-icon")[0] as HTMLElement).style.background).toBe("rgb(164, 59, 100)");
    cleanup();
    m.may = new Set(["settings:read"]);
    show();
    expect(((await screen.findByTestId("store-app-enabled")) as HTMLInputElement).disabled).toBe(true);
  });
});
