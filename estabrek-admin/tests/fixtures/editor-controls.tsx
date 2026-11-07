/**
 * Isolated browser regression fixture. This renders the actual admin StudioPage and
 * the actual storefront StudioBridge, while every admin API stays in this module.
 * Its only write over HTTP is to the existing, local catalog-server test endpoint.
 * Start catalog-server:4100, storefront:3000 (ADMIN_ORIGIN includes admin:5178),
 * and admin Vite:5178. Never point this fixture at a merchant backend.
 */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import StudioPage from "../../src/studio/StudioPage";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../../src/api/pages.api";
import { api } from "../../src/api/http";
import { env } from "../../src/config/env";
import { authStore } from "../../src/store/auth.store";
import { applySkin, readSkin } from "../../src/theme/skin";
import "../../src/index.css";
import "../../src/App.css";
import "../../src/theme/skins.css";

const PAGE_ID = "editor-controls-fixture";
const FIXTURE = "http://127.0.0.1:4100";
const SHOP = "http://127.0.0.1:3000";
env.VITE_API_BASE_URL = `${FIXTURE}/v1`;
env.VITE_STOREFRONT_BASE_URL = SHOP;
api.defaults.baseURL = `${FIXTURE}/v1`;
applySkin(readSkin());
authStore.setAdmin({ id: "local-canvas-owner", email: "owner@example.test", role: "SUPERADMIN", owner: true } as never);

const text = (en: string, ar: string = en) => ({ en, ar, he: en });
const savedTheme = new URLSearchParams(location.search).has("theme") ? { id: "circuit", mode: "dark", custom: { palette: { dark: { accent: "#22cc88" } } } } : undefined;
const at = "2026-11-06T00:00:00.000Z";
const publishingFixture = new URLSearchParams(location.search).has("publishing");
const publicationSlug = publishingFixture ? `/publication-fixture-${new URLSearchParams(location.search).get("lang") === "ar" ? "ar" : "en"}` : "/editor-controls";
let publicationStatus = publishingFixture ? "DRAFT" : "PUBLISHED";
let hasDraft = true;
let publicationDelivery: Record<string, unknown> | null = null;
const publication = () => ({ status: publicationStatus, slug: publicationSlug, publishAt: null, unpublishAt: null, state: publicationStatus === "PUBLISHED" ? "live" : "draft", public: publicationStatus === "PUBLISHED" });
const initial: PageDraft = {
  version: 1, rev: 0, baseHash: "isolated-editor-fixture", sections: [], trash: [], startedAt: at, updatedAt: at,
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [
    { id: "objects", type: "section", name: "Objects section", props: { contained: false }, style: { base: { pad: [24, 24, 24, 24], minHeight: "700px", bg: "#f5f7fc" } }, children: [
      { id: "drawing", type: "svg", name: "Editable drawing", props: { art: { viewBox: "0 0 100 100", nodes: [{ t: "circle", a: { cx: "50", cy: "50", r: "40", fill: "#ff3366" } }] } }, style: { base: { width: "180px", height: "180px" } } },
      { id: "model", type: "model3d", name: "Editable model", props: { model: "sneaker", height: 220, drag: false, anim: { type: "none" } }, style: { base: { width: "320px", height: "220px" } } },
      { id: "questions", type: "accordion", name: "Questions", props: { items: [{ q: text("Question"), a: text("Answer") }] } },
    ] },
  ] } },
};
if (new URLSearchParams(location.search).has("objectEdges")) {
  const art = { viewBox: "0 0 200 40", nodes: [{ t: "path", a: { d: "M0 20L100 0L200 20V40H0Z", fill: "currentColor" } }] };
  const edges = { top: { art, height: 24, color: "accent", front: true }, bottom: { art, height: 32, phone: 16, color: "accent-soft", flip: true, front: true } };
  const seeds: Array<[string, Record<string, unknown>]> = [
    ["heading", { text: text("Heading") }], ["text", { text: text("Copy") }],
    ["button", { label: text("Shop"), href: "/shop" }],
    ["image", { src: "/templates/photo-1.svg", href: "/shop", alt: text("Photo") }],
    ["video", { src: "/templates/fixture.mp4", controls: true }],
    ["svg", { art }], ["model3d", { model: "sneaker" }],
    ["accordion", { items: [{ q: text("Question"), a: text("Answer") }] }],
    ["pricing", { billing: true, items: [{ name: text("Plan"), price: text("10"), features: text("Feature") }] }],
    ["filterGallery", { items: [{ title: text("Gallery"), image: "/templates/photo-1.svg" }] }],
    ["marquee", { items: [text("Words")] }], ["icon", { name: "heart" }],
    ["divider", {}], ["spacer", { size: 40 }], ["stack", {}],
    ["chart", { kind: "bar", items: [] }], ["clock", {}], ["instrument", { kind: "piano" }],
  ];
  initial.tree!.root.children![0].children = seeds.map(([type, props]) => ({ id: `edge-${type}`, type, props: { ...props, edges }, style: { base: { width: "240px", height: "140px" } } }));
}
if (new URLSearchParams(location.search).has("narrow")) {
  initial.tree!.root.children![0].style = { base: { width: "160px", minHeight: "900px", pad: [0, 0, 0, 0] } };
}
if (new URLSearchParams(location.search).has("padded")) {
  const drawing = initial.tree!.root.children![0].children![0];
  drawing.props.art = { viewBox: "0 0 200 100", nodes: [{ t: "rect", a: { width: "200", height: "100", fill: "#3366ff" } }] };
  drawing.style = { base: { width: "200px", pad: [20, 20, 20, 20], border: { width: 5, color: "#ff0000" } } };
}
let draft = structuredClone(initial);
const writes: Array<{ ops: PageDraftOp[]; rev: number }> = [];
const requests: Array<{ method: string; path: string }> = [];
let lastLayout: unknown = null;
let layoutSource: MessageEventSource | null = null;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function locate(nodeId: string, node = draft.tree.root, parent: PageTreeNode | null = null): { node: PageTreeNode; parent: PageTreeNode | null; index: number } | null {
  if (node.id === nodeId) return { node, parent, index: parent?.children?.findIndex((n) => n.id === nodeId) ?? 0 };
  for (const child of node.children ?? []) { const found = locate(nodeId, child, node); if (found) return found; }
  return null;
}
// Matching the draft API's replacement semantics is essential for real undo/redo.
function applyOps(ops: PageDraftOp[]) {
  for (const op of ops) {
    const found = "nodeId" in op ? locate(op.nodeId) : null;
    if (op.op === "setStyle" && found) {
      const style = { ...found.node.style };
      if (op.style && Object.keys(op.style).length) style[op.screen] = clone(op.style);
      else delete style[op.screen];
      if (Object.keys(style).length) found.node.style = style; else delete found.node.style;
    } else if (op.op === "setProps" && found) found.node.props = clone(op.props);
    else if (op.op === "setName" && found) { if (op.name) found.node.name = op.name; else delete found.node.name; }
    else if (op.op === "setMotion" && found) { if (op.motion) found.node.motion = clone(op.motion); else delete found.node.motion; }
    else if (op.op === "move" && found?.parent) {
      const target = locate(op.parentId ?? draft.tree.root.id)?.node;
      if (!target || locate(target.id, found.node)) throw new Error("Invalid or cyclic fixture move");
      found.parent.children!.splice(found.index, 1);
      const children = target.children ??= [];
      children.splice(Math.max(0, Math.min(children.length, op.index)), 0, found.node);
    } else if (op.op === "insert") {
      const target = locate(op.parentId)?.node;
      if (!target) throw new Error("Unknown fixture insert target");
      const children = target.children ??= [];
      children.splice(Math.max(0, Math.min(children.length, op.index)), 0, clone(op.node));
    } else if (op.op === "remove" && found?.parent) found.parent.children!.splice(found.index, 1);
    else throw new Error(`Unsupported fixture operation: ${op.op}`);
  }
  draft.rev++;
  draft.updatedAt = new Date().toISOString();
}
async function syncPreview() {
  const response = await fetch(`${FIXTURE}/__test/preview-draft`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, pageId: PAGE_ID, siteStyles: [] }), credentials: "omit",
  });
  if (!response.ok) throw new Error(`Local fixture update failed: ${response.status}`);
}
function response(config: InternalAxiosRequestConfig, data: unknown) { return { data: clone(data), status: 200, statusText: "OK", headers: {}, config }; }
api.defaults.adapter = async (config) => {
  const method = (config.method ?? "get").toUpperCase();
  const path = new URL(config.url ?? "", `${FIXTURE}/v1/`).pathname.replace(/^\/v1/, "");
  requests.push({ method, path });
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  if (path === "/admin/media/models/sign") throw new AxiosError("Local fixture upload", "409", config, undefined, { ...response(config, {}), status: 409 });
  if (method === "GET" && path === "/admin/media/models") return response(config, { items: [], maxBytes: 25_000_000, cloudinary: false });
  if (method === "POST" && path === "/admin/media/models/local") {
    if (!(body instanceof FormData) || !(body.get("file") instanceof File)) throw new Error("Expected multipart GLB");
    return response(config, { id: "uploaded", url: "/templates/fixture.glb", displayName: "Uploaded model", size: 100, provider: "LOCAL", createdAt: at });
  }
  if (path === `/admin/pages/${PAGE_ID}/preview-token` && method === "POST") return response(config, { token: "good-draft", expiresAt: new Date(Date.now() + 1_800_000).toISOString() });
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}/publication`) return response(config, { publication: publication(), delivery: publicationDelivery, hasDraft });
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}/publication/check`) return response(config, { state: publicationStatus === "PUBLISHED" ? "shown" : "not_public", checkedAt: new Date().toISOString(), targets: [] });
  if (method === "POST" && path === `/admin/pages/${PAGE_ID}/draft/publish` && publishingFixture) {
    if (body.rev !== draft.rev || body.expectedPublication?.status !== publicationStatus) throw new Error("Stale publishing fixture confirmation");
    const id = `publication-${Date.now()}`;
    const result = await fetch(`${FIXTURE}/__test/published-page`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: publicationSlug, page: { id: PAGE_ID, name: "Published fixture", slug: publicationSlug, status: "PUBLISHED", format: 2, tree: draft.tree, sections: [], publicationRevision: id } }) });
    if (!result.ok) throw new Error("Local publication failed");
    publicationStatus = "PUBLISHED"; hasDraft = false;
    publicationDelivery = { version: 1, id, state: "delivered", attempts: 1, createdAt: at, checkedAt: at, retryAt: null, targets: [{ origin: SHOP, ok: true }] };
    return response(config, { ok: true, format: 2, publication: publication(), delivery: publicationDelivery });
  }
  if (path === `/admin/pages/${PAGE_ID}/draft/ops` && method === "POST") {
    if (body.rev !== undefined && body.rev !== draft.rev) throw new AxiosError("Fixture revision conflict", "409", config, undefined, { ...response(config, {}), status: 409 });
    const previous = clone(draft);
    try { applyOps(body.ops); hasDraft = true; await syncPreview(); }
    catch (error) { draft = previous; throw error; }
    writes.push({ ops: clone(body.ops), rev: draft.rev });
    return response(config, { draft });
  }
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}/draft`) return response(config, { draft: hasDraft ? draft : null, main: "ar" });
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}/tree`) return response(config, { format: 2, tree: draft.tree, saved: true });
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}`) return response(config, { id: PAGE_ID, name: "Direct canvas local fixture", slug: publicationSlug, format: 2, status: publicationStatus, sections: [] });
  if (method === "GET" && path === "/admin/settings") return response(config, { id: "fixture", siteName: "Local canvas regression", header: { storeTheme: savedTheme, languages: { enabled: ["en", "ar"], default: "ar" }, identity: { name: text("Canvas fixture"), industry: "fashion", audience: "all" }, storefront: { mobileBottomNavEnabled: false, liveChatEnabled: false } } });
  if (method === "GET" && path === "/admin/site-styles") return response(config, { styles: [], draft: null });
  if (method === "GET" && ["/admin/pages/blocks", "/admin/pages/templates", "/admin/catalog/products", "/admin/catalog/categories"].includes(path)) return response(config, []);
  throw new Error(`Unmocked admin request (blocked): ${method} ${path}`);
};
window.addEventListener("message", (event) => {
  const frame = document.querySelector<HTMLIFrameElement>('[data-testid="studio-frame"]');
  if (event.origin === SHOP && event.source === frame?.contentWindow && event.data?.source === "estabrek-studio" && event.data.type === "layout") {
    lastLayout = clone(event.data);
    layoutSource = event.source;
  }
});
Object.assign(window, { __canvasHarness: {
  getDraft: () => clone(draft), getWrites: () => clone(writes), getRequests: () => clone(requests),
  getLayout: () => layoutSource === document.querySelector<HTMLIFrameElement>('[data-testid="studio-frame"]')?.contentWindow ? clone(lastLayout) : null,
  getNode: (id: string) => clone(locate(id)),
  // Reset by opening a fresh harness page; this also resets the real editor history.
} });
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
client.setQueryData(["store-themes", "full"], { themes: ["circuit", "ink-library"].map(id => ({ id, name: text(id), blurb: text(id), family: "general", mode: "dark", modes: ["light", "dark"], swatch: ["#111111", "#222222", "#3344ff", "#4455ff"], hero: "split", motion: "soft" })), models: [], fonts: [], defaults: {} });
try {
  if (publishingFixture) {
    const cleared = await fetch(`${FIXTURE}/__test/published-page`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: publicationSlug, page: null }) });
    if (!cleared.ok) throw new Error("Local publication reset failed");
  }
  await syncPreview();
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/studio/${PAGE_ID}`]}>
        <Routes><Route path="/studio/:id" element={<StudioPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
} catch (error) {
  document.getElementById("root")!.textContent = `Local canvas harness failed: ${String(error)}`;
  throw error;
}
