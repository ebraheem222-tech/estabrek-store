/**
 * Isolated browser regression fixture. This renders the actual admin StudioPage and
 * the actual storefront StudioBridge, while every admin API stays in this module.
 * Its only write over HTTP is to the existing, local catalog-server test endpoint.
 * Start catalog-server:4100, storefront:3000 (ADMIN_ORIGIN includes admin:5178),
 * and admin Vite:5178. Never point this fixture at a merchant backend.
 */
import React from "react";
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

const PAGE_ID = "direct-canvas-fixture";
const FIXTURE = "http://127.0.0.1:4100";
const SHOP = "http://127.0.0.1:3000";
const query = new URLSearchParams(window.location.search);
const variantScale = (key: string) => {
  const value = Number(query.get(key) ?? 1);
  return Number.isFinite(value) && value >= 0.1 && value <= 4 ? value : 1;
};
const variantOrigin = (key: string) => ["top", "bottom"].includes(query.get(key) ?? "") ? query.get(key)! : "center";
// URL variants exercise actual CSS transforms through the real storefront renderer.
const variant = {
  ancestorScale: variantScale("ancestorScale"), ancestorOrigin: variantOrigin("ancestorOrigin"),
  objectScale: variantScale("objectScale"), objectOrigin: variantOrigin("objectOrigin"),
  ancestorRotation: Math.max(-180, Math.min(180, Number(query.get("ancestorRotation")) || 0)),
  objectPlaced: query.get("objectPlaced") === "1",
  percentageGroup: query.get("percentageGroup") === "1",
  groupPlaced: query.get("groupPlaced") === "1",
  autoWidthGroup: query.get("autoWidthGroup") === "1",
  liveState: query.get("liveState") === "1",
};
env.VITE_API_BASE_URL = `${FIXTURE}/v1`;
env.VITE_STOREFRONT_BASE_URL = SHOP;
api.defaults.baseURL = `${FIXTURE}/v1`;
applySkin(readSkin());
authStore.setAdmin({ id: "local-canvas-owner", email: "owner@example.test", role: "SUPERADMIN", owner: true } as never);

const text = (en: string, ar: string = en) => ({ en, ar, he: en });
const at = "2026-11-06T00:00:00.000Z";
const initial: PageDraft = {
  version: 1, rev: 0, baseHash: "isolated-canvas-fixture", sections: [], trash: [], startedAt: at, updatedAt: at,
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [
    { id: "canvas-section", type: "section", name: "Canvas section", props: { contained: false }, style: { base: { pad: [24, 24, 24, 24], minHeight: "900px", bg: "#f5f7fc" } }, children: [
      { id: "canvas-parent", type: "stack", name: "Original parent", props: {}, style: { base: { width: "800px", minHeight: "320px", pad: [24, 24, 24, 24], gap: 16, align: "start", bg: "#dbeafe", radius: 12 } }, children: [
        { id: "canvas-image", type: "image", name: "Flow image", props: { src: "/templates/photo-1.svg", alt: text("Flow image", "صورة عادية") }, style: { base: { width: "180px", height: "120px", fit: "cover", radius: 8 } } },
        { id: "canvas-button", type: "button", name: "Flow button", props: { label: text("Move this button", "اسحب هذا الزر"), href: "/shop", variant: "solid" }, style: { base: { width: "180px", height: "48px", bg: "#1d4ed8", color: "#ffffff", radius: 6 } } },
        { id: "canvas-inner", type: "stack", name: "Nested target", props: {}, style: { base: { width: "340px", minHeight: "180px", pad: [24, 24, 24, 24], bg: "#bfdbfe", radius: 10 } }, children: [
          { id: "canvas-inner-label", type: "text", props: { text: text("Nested editable container", "حاوية داخلية") }, style: { base: { size: 18, color: "#1e3a8a" } } },
        ] },
      ] },
      { id: "canvas-outside", type: "stack", name: "Outside target", props: {}, style: { base: { width: "800px", minHeight: "220px", margin: [24, 0, 0, 0], pad: [24, 24, 24, 24], bg: "#dcfce7", radius: 12 } }, children: [
        { id: "canvas-outside-label", type: "text", props: { text: text("Drag out into this container", "اسحب إلى هذه الحاوية") }, style: { base: { size: 18, color: "#166534" } } },
      ] },
    ] },
  ] } },
};
const parentFixture = initial.tree.root.children![0].children![0];
const objectFixture = parentFixture.children![0];
if (variant.ancestorScale !== 1 || variant.ancestorOrigin !== "center" || variant.ancestorRotation) {
  parentFixture.style!.base = { ...parentFixture.style!.base as Record<string, unknown>, scale: variant.ancestorScale, origin: variant.ancestorOrigin, rotateZ: variant.ancestorRotation };
}
if (variant.objectScale !== 1 || variant.objectOrigin !== "center") {
  objectFixture.style!.base = { ...objectFixture.style!.base as Record<string, unknown>, scale: variant.objectScale, origin: variant.objectOrigin };
}
if (variant.objectPlaced) objectFixture.style!.base = { ...objectFixture.style!.base as Record<string, unknown>, layer: { x: 30, y: 20, anchor: "top-start" } };
if (variant.percentageGroup) {
  const inner = parentFixture.children![2];
  inner.style = { base: { width: "400px", pad: [24,24,24,24], gap: 16, align: "start", bg: "#bfdbfe", ...(variant.groupPlaced ? { layer: { x: 20, y: 20, anchor: "top-start" } } : {}) } };
  inner.children = [
    { id: "canvas-inner-label", type: "stack", props: {}, style: { base: { width: "100%", height: "100%", gap: 0 } }, children: [1,2].map(i => ({ id: `percentage-line-${i}`, type: "text", props: { text: text(`Line ${i}`) }, style: { base: { height: "30px", size: 20, lineHeight: 1.5 } } })) },
    { id: "percentage-spacer", type: "spacer", props: {}, style: { base: { height: "60px" } } },
  ];
}
if (variant.autoWidthGroup) {
  parentFixture.style!.base = { ...parentFixture.style!.base as Record<string, unknown>, width: "500px", minHeight: "600px" };
  const inner = parentFixture.children![2];
  inner.style = { base: { pad: [24,24,24,24], bg: "#bfdbfe", layer: { x: 20, y: 20, anchor: "top-start" } } };
  inner.children = [{ id: "canvas-inner-label", type: "text", props: { text: text("A long editable sentence that wraps inside this automatically sized container. ".repeat(5)) }, style: { base: { size: 20, lineHeight: 1.5 } } }];
}
if (variant.liveState) initial.tree.root.children![0].children!.push({ id: "preview-deck", type: "deck", name: "Persistent tabs", props: { presentation: "tabs" }, style: { base: { width: "400px", margin: [24,0,0,0] } }, children: [1,2].map(i => ({ id: `preview-panel-${i}`, type: "stack", name: `Panel ${i}`, props: {}, style: { base: { minHeight: "100px" } }, children: [{ id: `preview-panel-text-${i}`, type: "text", props: { text: text(`Persistent panel ${i}`) } }] })) });
if (variant.liveState) initial.tree.root.children![0].children!.push({ id: "preview-instrument", type: "instrument", props: { kind:"piano",sound:false,volume:.4,tempo:90,melody:"scale",playlist:["scale","jingle"],showPlayer:true },style:{base:{width:"600px"}} });
if (variant.liveState) parentFixture.children![1].motion = {engine:"gsap",loop:{kind:"float"}};
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
  if (path === `/admin/pages/${PAGE_ID}/preview-token` && method === "POST") return response(config, { token: "good-draft", expiresAt: new Date(Date.now() + 1_800_000).toISOString() });
  if (path === `/admin/pages/${PAGE_ID}/draft/ops` && method === "POST") {
    if (body.rev !== undefined && body.rev !== draft.rev) throw new AxiosError("Fixture revision conflict", "409", config, undefined, { ...response(config, {}), status: 409 });
    const previous = clone(draft);
    try { applyOps(body.ops); await syncPreview(); }
    catch (error) { draft = previous; throw error; }
    writes.push({ ops: clone(body.ops), rev: draft.rev });
    return response(config, { draft });
  }
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}/draft`) return response(config, { draft, main: "ar" });
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}/tree`) return response(config, { format: 2, tree: draft.tree, saved: true });
  if (method === "GET" && path === `/admin/pages/${PAGE_ID}`) return response(config, { id: PAGE_ID, name: "Direct canvas local fixture", slug: "/direct-canvas", format: 2, status: "PUBLISHED", sections: [] });
  if (method === "GET" && path === "/admin/settings") return response(config, { id: "fixture", siteName: "Local canvas regression", header: { languages: { enabled: ["en", "ar"], default: "ar" }, identity: { name: text("Canvas fixture"), industry: "fashion", audience: "all" }, storefront: { mobileBottomNavEnabled: false, liveChatEnabled: false } } });
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
  getVariant: () => clone(variant),
  getLayout: () => layoutSource === document.querySelector<HTMLIFrameElement>('[data-testid="studio-frame"]')?.contentWindow ? clone(lastLayout) : null,
  getNode: (id: string) => clone(locate(id)),
  // Reset by opening a fresh harness page; this also resets the real editor history.
} });
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
client.setQueryData(["store-themes"], []);
try {
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
