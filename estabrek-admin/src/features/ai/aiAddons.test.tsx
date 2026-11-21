// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

// The AI pages made from the add-ons list: social posts, the search-engine doctor, and the
// shop assistant's «couldn't answer» list. The server's part is tested with the database.

const m = vi.hoisted(() => ({
  marketingStatus: vi.fn(),
  writePosts: vi.fn(),
  weekPlan: vi.fn(),
  seoScan: vi.fn(),
  seoDraft: vi.fn(),
  seoApply: vi.fn(),
  listProducts: vi.fn(),
  listMisses: vi.fn(),
}));
vi.mock("../../api/aiMarketing.api", async (orig) => ({ ...(await orig<typeof import("../../api/aiMarketing.api")>()), marketingStatus: m.marketingStatus, writePosts: m.writePosts, weekPlan: m.weekPlan, seoScan: m.seoScan, seoDraft: m.seoDraft, seoApply: m.seoApply }));
vi.mock("../../api/catalog.api", () => ({ listProducts: m.listProducts }));
vi.mock("../../api/chatbot.api", () => ({ listMisses: m.listMisses }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import SocialPostsPage, { shareLink } from "./SocialPostsPage";
import SeoDoctorPage from "./SeoDoctorPage";
import { ChatbotMisses } from "../chatbot/ChatbotMisses";

const show = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("social posts", () => {
  test("share links: WhatsApp and X take the words, Facebook only a link, the others none", () => {
    expect(shareLink("whatsapp", "عرض حلو", null)).toBe(`https://wa.me/?text=${encodeURIComponent("عرض حلو")}`);
    expect(shareLink("x", "hi there", null)).toBe("https://twitter.com/intent/tweet?text=hi%20there");
    expect(shareLink("facebook", "x", null)).toBeNull();
    expect(shareLink("facebook", "x", "https://shop.test/p/a")).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fshop.test%2Fp%2Fa");
    expect(shareLink("instagram", "x", "https://shop.test/p/a")).toBeNull();
  });

  test("pick a piece, write: the posts come ready to copy; off says where to switch it on", async () => {
    m.marketingStatus.mockResolvedValue({ socialPosts: true, seoDoctor: false, shopUrl: "https://shop.test" });
    m.listProducts.mockResolvedValue([{ id: "p1", title: "عباية سوداء", slug: "a", isActive: true, categoryId: "c" }, { id: "p2", title: "حجاب خمري", slug: "b", isActive: true, categoryId: "c" }]);
    m.writePosts.mockResolvedValue({ posts: [{ platform: "instagram", caption: "c", hashtags: ["#a"], cta: "", idea: "على شماعة", text: "منشور جاهز #a" }], products: [{ id: "p1", title: "عباية سوداء", slug: "a", url: "https://shop.test/p/a" }] });
    show(<SocialPostsPage />);
    const write = await screen.findByTestId("social-write");
    expect(write).toBeDisabled();
    fireEvent.change(screen.getByTestId("social-search"), { target: { value: "حجاب" } });
    const picks = await screen.findAllByTestId("social-pick");
    expect(picks).toHaveLength(1);
    fireEvent.click(picks[0]);
    await waitFor(() => expect(write).toBeEnabled());
    fireEvent.click(write);
    const post = await screen.findByTestId("social-post");
    expect(post).toHaveAttribute("data-platform", "instagram");
    expect(within(post).getByRole("textbox")).toHaveValue("منشور جاهز #a");
    expect(m.writePosts).toHaveBeenCalledWith(expect.objectContaining({ productIds: ["p2"], platforms: ["instagram", "facebook", "whatsapp"], tone: "friendly", emojis: true }));
    cleanup();

    m.marketingStatus.mockResolvedValue({ socialPosts: false, seoDoctor: false, shopUrl: null });
    show(<SocialPostsPage />);
    expect(await screen.findByTestId("social-off")).toBeInTheDocument();
  });
});

describe("the search-engine doctor", () => {
  test("the score, the weak points, a draft checked and saved", async () => {
    m.marketingStatus.mockResolvedValue({ socialPosts: false, seoDoctor: true, shopUrl: null });
    m.seoScan.mockResolvedValue({ average: 62, total: 3, counts: { noTitle: 1, noAlt: 2 }, products: [{ id: "p1", title: "عباية", slug: "a", score: 38, issues: ["noTitle", "noAlt"], missingAlts: 2, seoTitle: null, seoDescription: null }] });
    m.seoDraft.mockResolvedValue({ productId: "p1", seoTitle: "عباية كريب سوداء واسعة", seoDescription: "وصف", alts: [{ id: "i1", alt: "عباية — أسود" }] });
    m.seoApply.mockResolvedValue({ ok: true, alts: 1 });
    show(<SeoDoctorPage />);
    expect(await screen.findByTestId("seo-average")).toHaveTextContent("62");
    fireEvent.click(await screen.findByTestId("seo-draft"));
    expect(await screen.findByTestId("seo-title")).toHaveValue("عباية كريب سوداء واسعة");
    fireEvent.change(screen.getByTestId("seo-title"), { target: { value: "عباية كريب سوداء للمناسبات" } });
    fireEvent.click(screen.getByTestId("seo-save"));
    await waitFor(() => expect(m.seoApply).toHaveBeenCalledWith("p1", { seoTitle: "عباية كريب سوداء للمناسبات", seoDescription: "وصف", alts: [{ id: "i1", alt: "عباية — أسود" }] }));
  });
});

describe("the assistant's unanswered questions", () => {
  test("listed with how many times; one tap opens the answer with the question in it", async () => {
    m.listMisses.mockResolvedValue({ days: 30, items: [{ question: "بتغلفوا هدايا؟", count: 3, lastAt: "2026-11-20T10:00:00.000Z", conversationId: "c1", pageUrl: null, covered: false }, { question: "في توصيل؟", count: 1, lastAt: "2026-11-19T10:00:00.000Z", conversationId: "c2", pageUrl: null, covered: true }] });
    const onAnswer = vi.fn();
    const onOpenChat = vi.fn();
    show(<ChatbotMisses onAnswer={onAnswer} onOpenChat={onOpenChat} />);
    const rows = await screen.findAllByTestId("chatbot-miss");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("بتغلفوا هدايا؟");
    expect(rows[0]).toHaveTextContent("3");
    expect(within(rows[1]).queryAllByRole("button")).toHaveLength(1); // answered already: only «the chat»
    fireEvent.click(within(rows[0]).getAllByRole("button")[1]);
    expect(onAnswer).toHaveBeenCalledWith("بتغلفوا هدايا؟");
    fireEvent.click(within(rows[1]).getByRole("button"));
    expect(onOpenChat).toHaveBeenCalledWith("c2");
  });
});
