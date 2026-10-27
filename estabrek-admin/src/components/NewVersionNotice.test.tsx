import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewVersionNotice from "./NewVersionNotice";
import { latestScript, loadedScript, mainScriptOf } from "@/lib/appVersion";

const page = (hash: string) => `<!doctype html><html><head><script type="module" crossorigin src="/assets/index-${hash}.js"></script><link rel="modulepreload" href="/assets/vendor-x1.js"></head><body><div id="root"></div></body></html>`;
const answer = (html: string) => vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;

describe("which admin a tab runs, and which one the server has", () => {
  it("reads the main script a page names (none on the dev server)", () => {
    expect(mainScriptOf(page("z4_EGJFw"))).toBe("/assets/index-z4_EGJFw.js");
    expect(mainScriptOf('<script src="/assets/index-Ab12.js" type="module"></script>')).toBe("/assets/index-Ab12.js");
    expect(mainScriptOf('<script type="module" src="/src/main.tsx"></script>')).toBeNull();
  });
  it("asks the server again without its cache, and says nothing when it can't", async () => {
    const fetcher = answer(page("NEW1"));
    expect(await latestScript(fetcher, "https://admin.test")).toBe("/assets/index-NEW1.js");
    expect((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    expect(await latestScript(vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBeNull();
    expect(await latestScript(vi.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch)).toBeNull();
  });
});

describe("the new-version notice", () => {
  beforeEach(() => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/assets/index-OLD0.js";
    s.dataset.test = "main";
    document.head.appendChild(s);
  });
  afterEach(() => document.querySelectorAll('script[data-test="main"]').forEach((s) => s.remove()));

  it("stays away while the server has this same admin", async () => {
    const fetcher = answer(page("OLD0"));
    render(<NewVersionNotice enabled fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(loadedScript()).toBe("/assets/index-OLD0.js");
    expect(screen.queryByTestId("new-version")).toBeNull();
  });

  it("shows after a deploy, reloads on «تحديث الآن», and «بعدين» waits for the next one", async () => {
    const reload = vi.fn();
    render(<NewVersionNotice enabled fetcher={answer(page("NEW1"))} reload={reload} />);
    expect(await screen.findByTestId("new-version")).toHaveTextContent("في نسخة جديدة من لوحة الإدارة");
    fireEvent.click(screen.getByTestId("new-version-reload"));
    expect(reload).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("new-version-later"));
    expect(screen.queryByTestId("new-version")).toBeNull();
  });

  it("shows when a part of the admin is gone from the server", async () => {
    render(<NewVersionNotice enabled fetcher={answer(page("OLD0"))} />);
    act(() => {
      window.dispatchEvent(new Event("vite:preloadError"));
    });
    expect(await screen.findByTestId("new-version")).toBeInTheDocument();
  });

  it("does nothing on the dev server", () => {
    const fetcher = answer(page("NEW1"));
    render(<NewVersionNotice enabled={false} fetcher={fetcher} />);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
