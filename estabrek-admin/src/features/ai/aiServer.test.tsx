// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vitest";

// The AI page's «وين بيشتغل الذكاء الاصطناعي»: OpenAI or the store's own model server. The server's
// part (saving, sealing the key, the call itself) is tested with the database.

const m = vi.hoisted(() => ({ getAi: vi.fn(), saveAi: vi.fn(), saveAiServer: vi.fn(), tryAiServer: vi.fn(), askShop: vi.fn() }));
vi.mock("../../api/ai.api", async (orig) => ({ ...(await orig<typeof import("../../api/ai.api")>()), ...m }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import AiPage from "./AiPage";
import { AI_DEFAULTS_FOR_TESTS } from "./aiTestData";

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const page = (over: Record<string, unknown> = {}) => ({
  settings: AI_DEFAULTS_FOR_TESTS,
  defaults: AI_DEFAULTS_FOR_TESTS,
  keyReady: true,
  openaiReady: false,
  visionReady: false,
  editReady: false,
  ready: { productWriter: false, photoStudio: false, shopAgent: true, orderFlags: true },
  server: { kind: "own", url: "https://models.example.com/v1", model: "allam-7b-instruct", vision: false, hasKey: true },
  cloudinaryReady: true,
  usage30: {},
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("where the AI runs", () => {
  test("the own server as saved; try it; save keeps the key unless a new one is typed or it is taken away", async () => {
    m.getAi.mockResolvedValue(page());
    m.tryAiServer.mockResolvedValue({ ok: true, ms: 2400, reply: "أهلين فيكِ" });
    m.saveAiServer.mockResolvedValue({ server: page().server });
    show();
    expect(await screen.findByTestId("ai-key-ok")).toHaveTextContent("allam-7b-instruct");
    expect(screen.getByTestId("ai-server-url")).toHaveValue("https://models.example.com/v1");
    expect(screen.getByTestId("ai-server-key")).toHaveValue("");
    // What can't run on this server says why; what can is switchable.
    expect(screen.getByTestId("ai-photoStudio-needs")).toHaveTextContent("OpenAI");
    expect(screen.getByTestId("ai-productWriter-needs")).toHaveTextContent("بيقرأ الصور");

    fireEvent.click(screen.getByTestId("ai-server-try"));
    expect(await screen.findByTestId("ai-server-try-ok")).toHaveTextContent("أهلين فيكِ");
    expect(m.tryAiServer).toHaveBeenCalledWith({ kind: "own", url: "https://models.example.com/v1", model: "allam-7b-instruct", vision: false });

    // Nothing changed: nothing to save. A new model name: saved without touching the key.
    expect(screen.getByTestId("ai-server-save")).toBeDisabled();
    fireEvent.change(screen.getByTestId("ai-server-model"), { target: { value: "karnak-6b" } });
    fireEvent.click(screen.getByTestId("ai-server-save"));
    await waitFor(() => expect(m.saveAiServer).toHaveBeenLastCalledWith({ kind: "own", url: "https://models.example.com/v1", model: "karnak-6b", vision: false }));

    fireEvent.click(screen.getByText("شيل المفتاح"));
    fireEvent.click(screen.getByTestId("ai-server-save"));
    await waitFor(() => expect(m.saveAiServer).toHaveBeenLastCalledWith(expect.objectContaining({ key: null })));
  });

  test("no model yet: the notice names both ways, and the server's failure is shown as it is", async () => {
    m.getAi.mockResolvedValue(page({ keyReady: false, ready: { shopAgent: false, orderFlags: true }, server: { kind: "openai", url: "", model: "", vision: false, hasKey: false } }));
    m.tryAiServer.mockResolvedValue({ ok: false, error: "The model server refused the connection (is it running?)" });
    show();
    expect(await screen.findByTestId("ai-key-missing")).toHaveTextContent("سيرفر نماذج خاص");
    fireEvent.click(screen.getByTestId("ai-server-own"));
    fireEvent.change(screen.getByTestId("ai-server-url"), { target: { value: "https://gpu.example.com" } });
    fireEvent.change(screen.getByTestId("ai-server-model"), { target: { value: "allam-7b-instruct" } });
    fireEvent.click(screen.getByTestId("ai-server-try"));
    expect(await screen.findByTestId("ai-server-try-failed")).toHaveTextContent("is it running?");
    fireEvent.click(screen.getByTestId("ai-server-save"));
    await waitFor(() => expect(m.saveAiServer).toHaveBeenCalledWith({ kind: "own", url: "https://gpu.example.com", model: "allam-7b-instruct", vision: false }));
  });
});
