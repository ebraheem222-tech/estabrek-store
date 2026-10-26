/**
 * The new editor (track B): the real shop inside a frame the size of a device, a
 * see-through layer on top that picks elements with the geometry engine
 * (studio/geometry.ts), a layers list, and what's selected.
 *
 * Phase 2 edits the current design through a draft (backend lib/pageDraft.ts):
 * words in place (double click), pictures and clips, sections moved, hidden or
 * deleted, the rose scenes placed or hidden, each section's colours and motion,
 * the store's theme, undo/redo, then publish.
 *
 * Phase 3 (started with columns): new sections with columns in them, each cell a
 * small container of its own; elements added from a list (or dragged into a cell),
 * moved by dragging on the page or in the layers, their settings and look per
 * screen, and the line between two cells dragged to change their widths. Each element's
 * look (turns, size, see-through, colour layer, shadow, a free place over its
 * container — dragged on the page too) and its motion (GSAP in the shop: coming in,
 * scroll, loops, pointer, animated layers), previewed in the frame as sliders move.
 *
 * The shop's frame (studio-frame) opens the page's draft with a 30-minute ticket
 * and its bridge reports where every element is (pageTree/StudioBridge in the shop).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../api/pages.api";
import { getApiErrorMessage } from "../api/http";
import { ROSE_ID, currentStoreTheme, listStoreThemes, saveStoreTheme } from "./storeThemes";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { toast } from "../lib/toast";
import { History, fieldValue, parsePath, undoOf } from "./draft";
import { Field, MediaSlot, PartInfo, SectionActions, SectionSettings, ThemePanel } from "./StudioPanels";
import { AddMenu, CellPanel, ColumnsPanel, EDITABLE, ElementPanel, NodeActions, SectionPanel, SplitPicker } from "./StudioTreePanels";
import { ADDABLE, canHold, copyOf, dragLine, idMaker, isFree, newSection, reduceWidths, styleOp, twelfths } from "./columns";
import { NEEDS, insertOps, makeNode, pageItemOf, type AddKind, type InsertCtx, type Spot, type Where } from "./insert";
import { AddPanel } from "./AddPanel";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { VideoPickerModal } from "../components/media/VideoPickerModal";
import { LookPanel, MotionPanel } from "./LookPanels";
import { SvgPanel } from "./SvgPanel";
import { Product360Panel } from "./Product360Panel";
import { motionOp, placeFor, placedOn, withPreset, type Motion } from "./look";
import { env } from "../config/env";
import { useSettings } from "../hooks/useSettings";
import { adminLang, isRtl, type Lang } from "../lib/lang";
import { languagesOf } from "../lib/storeLanguages";
import { tr } from "../lib/words";
import { DIRECTIONS, HoverFilter, SpatialGrid, clickTarget, pickAt, queenStep, toScreen, visiblePart, zoomAround, type Box, type Pt, type Shape } from "./geometry";
import { fieldLabel, indexTree, isRelated, nodeName, nodeTitle, partLabel, pathTo, shapesOf, tagLabel, typeLabel, type BridgeLayout, type Extra } from "./treeIndex";

const SOURCE = "estabrek-studio";
const DEVICES = {
  wide: { w: 1440, h: 900, label: () => tr("كمبيوتر 1440", "Computer 1440") },
  desktop: { w: 1280, h: 800, label: () => tr("كمبيوتر 1280", "Computer 1280") },
  tablet: { w: 820, h: 1180, label: () => tr("تابلت", "Tablet") },
  phone: { w: 390, h: 844, label: () => tr("موبايل", "Phone") },
} as const;
type Device = keyof typeof DEVICES;
const LANG_NAME: Record<Lang, string> = { ar: "العربية", en: "English", he: "עברית" };
const BLOCK_LABEL: Record<string, () => string> = {
  seasons: () => tr("المواسم", "Seasons"),
  stories: () => tr("قصص الكولكشن", "Collection stories"),
  instagram: () => tr("إنستغرام", "Instagram"),
  fabric: () => tr("دراسة القماش", "Fabric study"),
};
/** The opening's switch that shows each rose scene. */
const BLOCK_FLAG: Record<string, string> = { seasons: "roseSeasonsEnabled", stories: "roseStoriesEnabled", instagram: "roseInstagramEnabled", fabric: "rose3dEnabled" };
/** Scenes that keep their own place (the fabric study follows the first products). */
const FIXED_BLOCKS = new Set(["fabric"]);
const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;
/** A field that names its language at its end (a scene's word: roseScenes.seasons.winter.title.en). */
const wordLang = (path: string) => /\.(ar|en|he)$/.test(path);
/**
 * Where a dragged element would land: the place, its index there, and the line to draw;
 * or (from the Add panel) beside a page item, or over a section or scene at a spot of it.
 */
type Drop = { parentId: string; index: number; line: Box; box: Box; page?: { anchor: string; where: Where }; over?: { anchor: string; spot: Spot } };

const shopOrigin = () => {
  try {
    return new URL(env.VITE_STOREFRONT_BASE_URL).origin;
  } catch {
    return "";
  }
};

export default function StudioPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const treeQ = useQuery({ queryKey: ["pages", id, "tree"], queryFn: () => PagesAPI.getPageTree(id), enabled: Boolean(id) });
  const pageQ = useQuery({ queryKey: ["pages", id], queryFn: () => PagesAPI.getPage(id), enabled: Boolean(id) });
  const draftQ = useQuery({ queryKey: ["pages", id, "draft"], queryFn: () => PagesAPI.getPageDraft(id), enabled: Boolean(id) });
  const settings = useSettings();
  const langs = languagesOf(settings.data?.header);

  // On a phone the phone size reads best; elsewhere a computer.
  const [device, setDevice] = useState<Device>(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "phone" : "desktop"));
  const [lang, setLang] = useState<Lang | null>(null);
  const shopLang: Lang = lang ?? (langs.enabled.includes(adminLang()) ? adminLang() : langs.default);
  const [ticket, setTicket] = useState<{ token: string; expiresAt: string } | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [layout, setLayout] = useState<BridgeLayout | null>(null);
  const [silent, setSilent] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pt>({ x: 24, y: 24 });
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [sheet, setSheet] = useState(false); // phones: the layers list as a sheet
  const [busy, setBusy] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [editing, setEditing] = useState<{ sectionId: string; path: string } | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePreview, setThemePreview] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [asking, setAsking] = useState<null | { kind: "delete"; nodeId: string; name: string; tree?: boolean } | { kind: "publish"; force: boolean } | { kind: "discard" } | { kind: "theme" }>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [resize, setResize] = useState<{ colsId: string; i: number; start: number[]; w12: number[] } | null>(null);
  const adding = useRef<AddKind | null>(null);
  // The left column: the Add panel or the layers; where a click on the Add panel adds.
  const [leftTab, setLeftTab] = useState<"add" | "layers">("add");
  const [addWhere, setAddWhere] = useState<Where>("after");
  /** A picture or clip being chosen for something about to be added. */
  const [asked, setAsked] = useState<{ media: "image" | "video"; then: (url: string) => void } | null>(null);
  const [askedUrl, setAskedUrl] = useState("");
  // Motion in the frame: everything plays while "live"; after a motion change that element plays once.
  const [motionLive, setMotionLive] = useState(false);
  const liveRef = useRef(false);
  liveRef.current = motionLive;
  const playNext = useRef<string | null>(null);
  const [placing, setPlacing] = useState<{ id: string; box: Box; x: number; y: number } | null>(null);
  const [, setTick] = useState(0);
  const history = useRef(new History());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef<PagesAPI.PageDraft | null>(null);
  const keepScroll = useRef<number | null>(null);
  const revealNext = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const filter = useRef(new HoverFilter());
  const last = useRef<{ p: Pt; t: number } | null>(null);
  const down = useRef<{ p: Pt; pan: Pt; panning: boolean; touch: boolean; moved: boolean; y: number; grab: string | null; box?: Box; holder?: Box | null } | null>(null);
  const lastClick = useRef<Pt | null>(null);
  const held = useRef(new Set<string>());

  const main = (draftQ.data?.main ?? langs.default) as Lang;
  const draft = draftQ.data?.draft ?? null;
  // The draft, or what it would start as (for the fields' words and for undo before the first change).
  const working = useMemo<PagesAPI.PageDraft | null>(() => {
    if (draft) return draft;
    if (!pageQ.data || !treeQ.data) return null;
    const i18n = ((pageQ.data as unknown as { i18n?: Record<string, { sections?: Array<{ sectionId: string; data: unknown }> }> }).i18n ?? {});
    return {
      version: 1, rev: 0, baseHash: "", startedAt: "", updatedAt: "", trash: [], tree: treeQ.data.tree,
      sections: (pageQ.data.sections ?? []).map((s) => ({
        id: s.id,
        type: String(s.type),
        data: s.data ?? {},
        isVisible: s.isVisible !== false,
        tr: Object.fromEntries((["ar", "en", "he"] as const).map((l) => [l, i18n[l]?.sections?.find((x) => x.sectionId === s.id)?.data]).filter(([, v]) => v)),
      })),
    };
  }, [draft, pageQ.data, treeQ.data]);
  latest.current = working;
  const index = useMemo(() => (working ? indexTree(working.tree) : treeQ.data ? indexTree(treeQ.data.tree) : null), [working, treeQ.data]);
  const sectionOf = (sid: string) => working?.sections.find((s) => s.id === sid);
  const heroSection = working?.sections.find((s) => s.type === "HERO" && s.isVisible) ?? working?.sections.find((s) => s.type === "HERO");
  const sectionTypes = useMemo(() => new Map((pageQ.data?.sections ?? []).map((s) => [s.id, String(s.type)])), [pageQ.data]);
  const dev = DEVICES[device];
  const origin = shopOrigin();

  // A ticket for the shop's frame (again when the language changes after it got old).
  useEffect(() => {
    if (!id) return;
    if (ticket && Date.parse(ticket.expiresAt) - Date.now() > 60_000) return;
    let gone = false;
    PagesAPI.getPreviewTicket(id).then(
      (t) => !gone && setTicket(t),
      (e) => !gone && setTicketError(getApiErrorMessage(e)),
    );
    return () => {
      gone = true;
    };
  }, [id, shopLang, ticket]);

  // Store themes (header.storeTheme): the frame shows one before it is saved (?storeTheme=, its layout too).
  const themesQ = useQuery({ queryKey: ["store-themes"], queryFn: listStoreThemes, staleTime: 300_000 });
  const savedTheme = currentStoreTheme(settings.data?.header);
  const currentTheme = savedTheme?.id ?? ROSE_ID;
  const shownTheme = themePreview ?? (themeMode ? currentTheme : null);
  const theme = shownTheme ? `&storeTheme=${encodeURIComponent(shownTheme)}${themeMode ? `&themeMode=${themeMode}` : ""}` : "";
  const src = ticket && origin ? `${origin}${shopLang === langs.default ? "" : `/${shopLang}`}/studio-frame?token=${encodeURIComponent(ticket.token)}${theme}` : "";

  // What the shop's bridge says.
  useEffect(() => {
    setLayout(null);
    setSilent(false);
    const quiet = window.setTimeout(() => setSilent(true), 20_000);
    let first = true;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as (BridgeLayout & { source?: string; type?: string }) | null;
      if (!d || d.source !== SOURCE) return;
      if (d.type === "layout") {
        window.clearTimeout(quiet);
        setLayout(d);
        // Back where it was after the frame reloaded with a change; then a new or moved element comes into view.
        if (keepScroll.current !== null && keepScroll.current > 0) {
          frameRef.current?.contentWindow?.postMessage({ source: SOURCE, type: "scrollTo", y: keepScroll.current }, origin);
        }
        keepScroll.current = null;
        const want = revealNext.current;
        if (want && d.items.some((i) => i.kind === "node" && i.id === want)) {
          revealNext.current = null;
          frameRef.current?.contentWindow?.postMessage({ source: SOURCE, type: "reveal", nodeId: want }, origin);
        }
        if (first) {
          first = false;
          const post = (m: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage({ source: SOURCE, ...m }, origin);
          if (liveRef.current) post({ type: "motionLive", on: true });
          else if (playNext.current) post({ type: "motionPlay", nodeId: playNext.current });
          playNext.current = null;
        }
      } else if (d.type === "textEdited" || d.type === "textCancelled") {
        const m = d as unknown as { sectionId: string; path: string; value?: string };
        setEditing(null);
        canvasRef.current?.focus({ preventScroll: true });
        if (d.type === "textEdited") onTextEdited.current(m.sectionId, m.path, String(m.value ?? ""));
      } else if (d.type === "key") {
        onFrameKey.current((d as unknown as { action?: string }).action);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(quiet);
    };
  }, [src, origin, frameKey]);

  const send = useCallback(
    (msg: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage({ source: SOURCE, ...msg }, origin),
    [origin],
  );

  // The canvas's size, and the frame fitted into it.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvas({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = useCallback(() => {
    if (!canvas.w) return;
    const z = Math.min(1, (canvas.w - 48) / dev.w, (canvas.h - 48) / dev.h);
    setZoom(z);
    setPan({ x: Math.round((canvas.w - dev.w * z) / 2), y: Math.round(Math.max(24, (canvas.h - dev.h * z) / 2)) });
  }, [canvas.w, canvas.h, dev.w, dev.h]);
  useEffect(() => fit(), [fit]);

  const measured = useMemo(() => (index && layout ? shapesOf(index, layout, pan, zoom) : { shapes: [] as Shape[], extras: new Map<string, Extra>(), up: new Map<string, string | null>() }), [index, layout, pan, zoom]);
  const shapes = measured.shapes;
  const extras = measured.extras;
  /** The parent of every measured thing that isn't a tree node (a field, a piece of a section or scene). */
  const up = measured.up;
  const grid = useMemo(() => new SpatialGrid(shapes, 64, { x: 0, y: 0, w: canvas.w, h: canvas.h }), [shapes, canvas.w, canvas.h]);
  const shapeOf = (sid: string | null) => (sid ? shapes.find((s) => s.id === sid) ?? null : null);
  const frameBox: Box = { x: pan.x, y: pan.y, w: dev.w * zoom, h: dev.h * zoom };

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const inFrame = (p: Pt) => p.x >= frameBox.x && p.x <= frameBox.x + frameBox.w && p.y >= frameBox.y && p.y <= frameBox.y + frameBox.h;
  const select = (sid: string | null, reveal = false) => {
    setSelected(sid);
    if (!reveal || !sid || !index) return;
    const x = extras.get(sid);
    if (x?.kind === "slot") return send({ type: "reveal", owner: x.owner, sectionId: x.sectionId, path: x.path });
    if (x?.kind === "part") return send({ type: "reveal", owner: x.owner, part: x.name, n: x.n });
    if (x?.kind === "auto") return send({ type: "reveal", owner: x.owner });
    if (x?.kind === "block") return send({ type: "reveal", block: x.block });
    const n = index.nodes.get(sid)?.node;
    if (n?.type === "legacy") send({ type: "reveal", sectionId: n.props.sectionId });
    else if (n?.type === "roseBlock") send({ type: "reveal", block: n.props.block });
    else if (n && n.type !== "page") send({ type: "reveal", nodeId: n.id });
  };

  /* ------------------------------------------------------------ changes */

  const reload = () => {
    keepScroll.current = layout?.scroll.y ?? 0;
    setFrameKey((k) => k + 1);
  };
  /** Sends changes to the draft; records how to undo them unless it is an undo/redo itself. */
  const run = (label: string, ops: PagesAPI.PageDraftOp[], opts: { reload?: boolean; record?: boolean } = {}) => {
    const next = queue.current.then(() => runNow(label, ops, opts));
    queue.current = next.catch(() => {});
    return next;
  };
  const runNow = async (label: string, ops: PagesAPI.PageDraftOp[], opts: { reload?: boolean; record?: boolean }) => {
    const at = latest.current;
    if (!at) return false;
    const undo = undoOf(ops, at, main);
    setBusy(true);
    try {
      const r = await PagesAPI.changePageDraft(id, ops, at.rev || undefined);
      latest.current = r.draft;
      qc.setQueryData(["pages", id, "draft"], { draft: r.draft, main });
      if (opts.record !== false) history.current.push({ label, ops, undo });
      if (opts.reload !== false) reload();
      return true;
    } catch (e) {
      if (statusOf(e) === 409) {
        await draftQ.refetch();
        reload();
        toast.error(tr("المسودة تغيّرت من شاشة ثانية: رجعنا حمّلناها", "The draft changed in another window: it was loaded again"));
      } else toast.error(tr("ما انحفظ التغيير", "The change wasn't saved"), { description: getApiErrorMessage(e) });
      return false;
    } finally {
      setBusy(false);
      setTick((t) => t + 1);
    }
  };
  const undoLast = async () => {
    const e = history.current.takeUndo();
    if (e && !(await run(e.label, e.undo, { record: false }))) history.current.drop(e);
  };
  const redoLast = async () => {
    const e = history.current.takeRedo();
    if (e && !(await run(e.label, e.ops, { record: false }))) history.current.drop(e);
  };
  const onFrameKey = useRef<(action?: string) => void>(() => {});
  onFrameKey.current = (action) => void (action === "redo" ? redoLast() : action === "undo" ? undoLast() : undefined);
  const setField = (sectionId: string, path: Array<string | number>, value: unknown, lang: Lang = main, reloadAfter = true) =>
    run(tr("تعديل", "Edit"), [{ op: "setField", sectionId, lang, path, value }], { reload: reloadAfter });

  // A word written in place: saved in the language shown (the frame already shows it).
  const onTextEdited = useRef<(sectionId: string, path: string, value: string) => void>(() => {});
  onTextEdited.current = (sectionId, path, value) => {
    const p = parsePath(path);
    // A scene's word names its language in its path (…title.en): kept with the main words.
    const lang = wordLang(path) ? main : shopLang;
    const before = fieldValue(sectionOf(sectionId), lang, main, p);
    if ((typeof before === "string" ? before : "") === value) return;
    void setField(sectionId, p, value, lang, false);
  };
  const startText = (sid: string | null) => {
    const x = sid ? extras.get(sid) : undefined;
    if (!x || x.kind !== "slot" || x.edit === "media" || x.edit === "list") return false;
    const v = fieldValue(sectionOf(x.sectionId), wordLang(x.path) ? main : shopLang, main, parsePath(x.path));
    setEditing({ sectionId: x.sectionId, path: x.path });
    send({ type: "editText", sectionId: x.sectionId, path: x.path, value: typeof v === "string" ? v : undefined });
    return true;
  };

  const pageKids = working?.tree.root.children ?? [];
  /** Where a rose scene that has no place yet sits among the page's items (by where it shows). */
  const indexAt = (sid: string) => {
    const s = shapes.find((x) => x.id === sid);
    if (!s) return pageKids.length;
    const after = pageKids.findIndex((n) => {
      const o = shapes.find((x) => x.id === n.id);
      // An empty scene (nothing to show) sits right where the next item starts.
      return o && (o.box.y > s.box.y || (s.box.h < 1 && o.box.y >= s.box.y));
    });
    return after < 0 ? pageKids.length : after;
  };
  const moveItem = (sid: string, delta: number) => {
    const x = extras.get(sid);
    const block = x?.kind === "block" ? x.block : index?.nodes.get(sid)?.node.type === "roseBlock" ? String(index.nodes.get(sid)!.node.props.block) : null;
    const at = pageKids.findIndex((n) => n.id === sid);
    if (at >= 0) return run(tr("نقل", "Move"), [{ op: "move", nodeId: sid, index: at + delta }]);
    if (block) {
      const here = indexAt(sid);
      return run(tr("نقل", "Move"), [{ op: "placeBlock", block: block as "seasons", index: Math.max(0, here + (delta < 0 ? -1 : 1)) }]);
    }
  };

  const saveTheme = async () => {
    if (!themePreview && !themeMode) return;
    setThemeSaving(true);
    try {
      const id = themePreview ?? currentTheme;
      await saveStoreTheme(id === ROSE_ID ? null : { id, mode: themeMode });
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setThemePreview(null);
      setThemeMode(null);
      reload();
      toast.success(tr("انحفظ الثيم لكل المتجر", "The theme was saved for the whole store"));
    } catch (e) {
      toast.error(tr("ما انحفظ الثيم", "The theme wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setThemeSaving(false);
    }
  };
  const publish = async (force: boolean) => {
    setBusy(true);
    try {
      await PagesAPI.publishPageDraft(id, force);
      history.current = new History();
      await Promise.all([qc.invalidateQueries({ queryKey: ["pages", id] }), qc.invalidateQueries({ queryKey: ["pages"] })]);
      setAsking(null);
      toast.success(tr("انتشرت التغييرات بالمتجر", "The changes are live in the store"));
      reload();
    } catch (e) {
      if (statusOf(e) === 409) setAsking({ kind: "publish", force: true });
      else toast.error(tr("ما انتشرت التغييرات", "The changes weren't published"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  const discard = async () => {
    setBusy(true);
    try {
      await PagesAPI.discardPageDraft(id);
      history.current = new History();
      await qc.invalidateQueries({ queryKey: ["pages", id] });
      setAsking(null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------- pointer */

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = local(e);
    const d = down.current;
    if (d) {
      if (Math.hypot(p.x - d.p.x, p.y - d.p.y) > 4) d.moved = true;
      if (d.grab && d.moved) {
        const n = nodeOf(d.grab);
        // A freely placed element moves over its container instead of to another place.
        const held = n ? placedOn(n, screen) : null;
        if (n && held && d.box && d.holder) {
          const box = { ...d.box, x: d.box.x + p.x - d.p.x, y: d.box.y + p.y - d.p.y };
          setPlacing({ id: n.id, box, ...placeFor(box, d.holder, held.anchor ?? "center", layout?.dir === "rtl") });
          return;
        }
        const t = n ? dropAt(p, n) : null;
        setDrop((was) => (was && t && was.parentId === t.parentId && was.index === t.index ? was : t));
        return;
      }
      if (d.panning) {
        setPan({ x: d.pan.x + p.x - d.p.x, y: d.pan.y + p.y - d.p.y });
        return;
      }
      if (d.touch && d.moved) {
        send({ type: "scrollBy", dx: 0, dy: (d.y - p.y) / zoom });
        d.y = p.y;
        return;
      }
    }
    const heading = last.current ? { x: p.x - last.current.p.x, y: p.y - last.current.p.y } : null;
    last.current = { p, t: e.timeStamp };
    const now = inFrame(p) ? pickAt(grid.near(p), p, { heading }) : null;
    setHovered(filter.current.push(e.timeStamp, now?.id ?? null));
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = local(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const panning = e.button === 1 || panMode || !inFrame(p);
    const touch = e.pointerType === "touch";
    // Dragging the selected element (or from inside it) moves it; sections move in the layers.
    const sel = nodeOf(selected);
    const hit = !panning && !touch && e.button === 0 && sel && isFree(sel.type) && sel.type !== "section" ? pickAt(grid.near(p), p) : null;
    const grab = hit && index && selected && pathTo(index, hit.id, up).includes(selected) ? selected : null;
    down.current = { p, pan, panning, touch, moved: false, y: p.y, grab, box: grab ? shapeOf(grab)?.box : undefined, holder: grab ? holderOf(grab) : null };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = down.current;
    down.current = null;
    if (d?.grab && d.moved) {
      const t = drop;
      const placed = placing;
      setDrop(null);
      setPlacing(null);
      const n = nodeOf(d.grab);
      const held = n ? placedOn(n, screen) : null;
      if (n && held && placed?.id === n.id) void change(tr("المكان", "Place"), [styleOp(n, screen, { layer: { ...held, x: placed.x, y: placed.y } })]);
      else if (t) moveTo(d.grab, t);
      return;
    }
    if (!d || d.moved || !index) return;
    const p = local(e);
    if (!inFrame(p)) return;
    const now = pickAt(grid.near(p), p);
    let target = e.ctrlKey || e.metaKey ? now?.id ?? null : clickTarget(now, filter.current.current);
    // A second click at the same spot climbs to the parent.
    const again = lastClick.current && Math.hypot(p.x - lastClick.current.x, p.y - lastClick.current.y) < 4;
    if (again && !(e.ctrlKey || e.metaKey) && selected && target && pathTo(index, target, up).includes(selected)) target = parentOf(selected) ?? selected;
    lastClick.current = p;
    select(target);
  };

  // Ctrl/⌘ + wheel zooms around the cursor; the wheel alone scrolls the shop (or moves the canvas outside the frame).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) {
        const next = zoomAround(pan, zoom, p, zoom * Math.exp(-e.deltaY * 0.0015));
        setZoom(next.zoom);
        setPan(next.pan);
      } else if (p.x >= pan.x && p.x <= pan.x + dev.w * zoom && p.y >= pan.y && p.y <= pan.y + dev.h * zoom) {
        send({ type: "scrollBy", dx: e.deltaX / zoom, dy: e.deltaY / zoom });
      } else setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [pan, zoom, dev.w, dev.h, send]);

  /* --------------------------------------------------------- keyboard */

  const zoomBy = useCallback(
    (k: number) => {
      const next = zoomAround(pan, zoom, { x: canvas.w / 2, y: canvas.h / 2 }, zoom * k);
      setZoom(next.zoom);
      setPan(next.pan);
    },
    [pan, zoom, canvas.w, canvas.h],
  );
  const zoomToSelected = () => {
    const s = shapeOf(selected);
    if (!s || !canvas.w) return;
    const z = Math.min(4, Math.max(0.1, zoom * Math.min((canvas.w * 0.6) / s.box.w, (canvas.h * 0.6) / s.box.h)));
    const pageX = (s.box.x + s.box.w / 2 - pan.x) / zoom;
    const pageY = (s.box.y + s.box.h / 2 - pan.y) / zoom;
    setZoom(z);
    setPan({ x: canvas.w / 2 - pageX * z, y: canvas.h / 2 - pageY * z });
  };

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const onDown = (e: KeyboardEvent) => {
      if (typing(e.target) || !index) return;
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y")) {
        e.preventDefault();
        if (e.key.toLowerCase() === "y" || e.shiftKey) void redoLast();
        else void undoLast();
        return;
      }
      if (e.key === " ") {
        setPanMode(true);
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["=", "+", "-", "0", "1"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "0") fit();
        else if (e.key === "1") zoomBy(1 / zoom);
        else zoomBy(e.key === "-" ? 1 / 1.25 : 1.25);
        return;
      }
      // Delete takes the selected element out (asking first), Ctrl/⌘+D copies it.
      if ((e.key === "Delete" || e.key === "Backspace") && selected && selFree && selFree.type !== "cell") {
        e.preventDefault();
        setAsking({ kind: "delete", nodeId: selected, name: label(selected), tree: true });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selFree && selFree.type !== "cell") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (e.key === "Escape") {
        if (themeOpen) return setThemeOpen(false);
        setSelected((s) => parentOf(s));
        return;
      }
      if (e.key === "Enter" && selected) {
        if (startText(selected)) return e.preventDefault();
        const first = index.nodes.get(selected)?.children[0];
        if (first) select(first, true);
        return;
      }
      if (e.key.startsWith("Arrow") && selected) {
        e.preventDefault();
        held.current.add(e.key);
        const h = held.current;
        const v = { x: (h.has("ArrowRight") ? 1 : 0) - (h.has("ArrowLeft") ? 1 : 0), y: (h.has("ArrowDown") ? 1 : 0) - (h.has("ArrowUp") ? 1 : 0) };
        const dir = v.x && v.y ? { x: v.x * Math.SQRT1_2, y: v.y * Math.SQRT1_2 } : v.x > 0 ? DIRECTIONS.right : v.x < 0 ? DIRECTIONS.left : v.y > 0 ? DIRECTIONS.down : DIRECTIONS.up;
        const from = shapeOf(selected);
        const next = from ? queenStep(from, shapes.filter((s) => s.id !== index.root), dir, { related: isRelated(index, up) }) : null;
        if (next) select(next.id, true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === " ") setPanMode(false);
      held.current.delete(e.key);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  });

  // The layers list follows what's selected on the page.
  useEffect(() => {
    if (!selected) return;
    document.querySelectorAll(`[data-testid="studio-layer"][data-node="${CSS.escape(selected)}"]`).forEach((el) => el.scrollIntoView({ block: "nearest" }));
  }, [selected]);

  /* ----------------------------------------------------------- drawing */

  const label = (sid: string) => {
    const x = extras.get(sid);
    if (x?.kind === "block" || sid.startsWith("block:")) return `${tr("مشهد", "Scene")} · ${BLOCK_LABEL[x?.kind === "block" ? x.block : sid.slice(6)]?.() ?? sid}`;
    if (x?.kind === "part") return x.count > 1 ? `${partLabel(x.name)} ${x.n + 1}` : partLabel(x.name);
    if (x?.kind === "auto") return x.label ? `${tagLabel(x.tag)} · ${x.label.length > 30 ? `${x.label.slice(0, 30)}…` : x.label}` : tagLabel(x.tag);
    if (x?.kind === "slot" || sid.startsWith("slot:")) {
      const path = x?.kind === "slot" ? x.path : sid.split(":").slice(2).join(":");
      const v = x?.kind === "slot" && x.edit !== "media" ? fieldValue(sectionOf(x.sectionId), wordLang(path) ? main : shopLang, main, parsePath(path)) : null;
      const name = fieldLabel(path);
      return typeof v === "string" && v ? `${name} · ${v.length > 30 ? `${v.slice(0, 30)}…` : v}` : name;
    }
    const n = index?.nodes.get(sid)?.node;
    if (!n) return "";
    if (n.type === "roseBlock") return `${tr("مشهد", "Scene")} · ${BLOCK_LABEL[String(n.props.block)]?.() ?? n.props.block}`;
    if (n.type === "cell" && index) return nodeTitle(index, sid);
    const name = nodeName(n, n.type === "legacy" ? sectionTypes.get(String(n.props.sectionId)) : undefined);
    return n.type === "page" || name === typeLabel(n.type) ? typeLabel(n.type) : `${typeLabel(n.type)} · ${name}`;
  };
  const outline = (sid: string | null, kind: "hover" | "selected" | "parent") => {
    const s = shapeOf(sid);
    if (!s || sid === index?.root) return null;
    // Only what shows of it: a scene many screens tall keeps its label and edges in sight.
    const seen = visiblePart(s.box, frameBox);
    if (!seen) return null;
    const style = { left: seen.box.x - frameBox.x, top: seen.box.y - frameBox.y, width: seen.box.w, height: seen.box.h };
    const cls =
      kind === "selected" ? "border-2 border-accent-400 bg-accent-400/[0.06]" : kind === "hover" ? "border border-dashed border-accent-300/90" : "border border-accent-400/35";
    // Where it goes on past the frame, its side is dashed.
    const cut = { borderTopStyle: seen.above ? "dashed" : undefined, borderBottomStyle: seen.below ? "dashed" : undefined } as const;
    return (
      <div key={`${kind}-${sid}`} className={`pointer-events-none absolute ${cls}`} style={{ ...style, ...cut }} data-testid={`studio-${kind}`} data-cut={seen.above || seen.below ? "1" : undefined}>
        {kind !== "parent" ? (
          // Above the box; inside it when the box touches the top of the frame (or goes on above it).
          <span className={`absolute start-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] ${style.top < 24 || seen.above ? "top-0" : "-top-6"} ${kind === "selected" ? "bg-accent-500 text-white" : "bg-surface-900/90 text-white/85"}`}>
            {seen.above ? <span aria-hidden="true">↑</span> : null}
            <span>{label(sid!)}</span>
            {kind === "selected" ? <span className="opacity-75" dir="ltr">{Math.round(s.box.w / zoom)}×{Math.round(s.box.h / zoom)}</span> : null}
          </span>
        ) : null}
        {kind === "selected" && seen.below ? <span className="absolute bottom-1 start-1/2 -translate-x-1/2 rounded-full bg-accent-500 px-1.5 text-[11px] text-white" aria-hidden="true">↓</span> : null}
      </div>
    );
  };

  const selPath = index ? pathTo(index, selected, up) : [];
  /** A step of the path above what's selected, by its kind. */
  const crumb = (pid: string) => {
    const n = index?.nodes.get(pid)?.node;
    if (n) return n.type === "roseBlock" ? tr("مشهد", "Scene") : typeLabel(n.type);
    const x = extras.get(pid);
    if (x?.kind === "part") return partLabel(x.name);
    if (x?.kind === "auto") return tagLabel(x.tag);
    if (x?.kind === "slot") return x.edit === "media" ? (x.media === "video" ? typeLabel("video") : typeLabel("image")) : x.link ? typeLabel("button") : typeLabel("text");
    return pid.startsWith("block:") ? tr("مشهد", "Scene") : typeLabel("text");
  };
  const parentOf = (sid: string | null) => (sid && index ? pathTo(index, sid, up).slice(-2, -1)[0] ?? null : null);
  const selNode = selected ? index?.nodes.get(selected) : undefined;
  const selShape = shapeOf(selected);
  const selExtra = selected ? extras.get(selected) : undefined;
  const selBlock = selExtra?.kind === "block" ? selExtra.block : selNode?.node.type === "roseBlock" ? String(selNode.node.props.block) : selected?.startsWith("block:") ? selected.slice(6) : null;
  const selSection = selNode?.node.type === "legacy" ? sectionOf(String(selNode.node.props.sectionId)) : undefined;
  const canUndo = history.current.done.length > 0;
  const canRedo = history.current.undone.length > 0;
  const topAt = selected ? pageKids.findIndex((n) => n.id === selected) : -1;

  /* ------------------------------------------------- the tree's own elements */

  const screen: PagesAPI.TreeScreen = device === "tablet" ? "tablet" : device === "phone" ? "mobile" : "base";
  const makeIds = () => idMaker((x) => Boolean(index?.nodes.has(x)));
  const nodeOf = (sid: string | null | undefined) => (sid ? index?.nodes.get(sid)?.node : undefined);
  const selFree = selNode && isFree(selNode.node.type) ? selNode.node : undefined;
  const selSiblings = selNode?.parentId ? index?.nodes.get(selNode.parentId)?.children ?? [] : [];
  const selPos = selected ? selSiblings.indexOf(selected) : -1;
  /** Sends changes; selects `then` once they're saved. */
  const change = async (label: string, ops: PagesAPI.PageDraftOp[], then?: string | null) => {
    if (!ops.length) return;
    if (!(await run(label, ops)) || then === undefined) return;
    setSelected(then);
    revealNext.current = then;
  };
  const probe = (kind: AddKind): PagesAPI.PageTreeNode => {
    const n = makeNode(kind, shopLang, (p) => `__${p}`);
    return { ...n, id: "__new" };
  };
  /** What adding works from: the page, what's measured, and where a scene without a place shows. */
  const insertCtx = (ids = makeIds()): InsertCtx | null => (index ? { index, up, extras, pageIndex: indexAt, ids } : null);
  /** Adds `node` before, after or inside `anchor` (at `spot` over a section). */
  const addNode = (node: PagesAPI.PageTreeNode, where: Where, anchor: string | null, spot?: Spot, label = tr("إضافة", "Add"), ids = makeIds()) => {
    const c = insertCtx(ids);
    const plan = c ? insertOps(c, anchor, node, where, spot) : null;
    if (!plan) return void toast.error(tr("ما بينفع يتضاف هون", "It can't be added here"));
    void change(label, plan.ops, plan.select);
  };
  /** Adds a kind from the Add panel (or a drop); a picture or clip is chosen first. */
  const addKind = (kind: AddKind, src?: string, where: Where = addWhereNow, anchor: string | null = selected, spot?: Spot) => {
    const need = NEEDS[kind];
    if (need && !src) return setAsked({ media: need, then: (url) => addKind(kind, url, where, anchor, spot) });
    const ids = makeIds();
    addNode(makeNode(kind, shopLang, ids, src), where, anchor, spot, tr("إضافة", "Add"), ids);
  };
  /** A new section with columns, after the selection's page item (or at the page's end). */
  const addSection = (widths: number[], where: Where = "after") => {
    const ids = makeIds();
    const node = newSection(widths, ids);
    const c = insertCtx(ids);
    const plan = c ? insertOps(c, selected, node, where) ?? insertOps(c, null, node, "after") : null;
    if (plan) void change(tr("قسم بأعمدة", "Section with columns"), plan.ops, node.children![0].id);
  };
  /** Whether something can go where chosen next to the selection (a probe, nothing is sent). */
  const canAdd = (kind: AddKind, where: Where) => {
    const c = insertCtx((p) => `__${p}`);
    return Boolean(c && insertOps(c, selected, probe(kind), where));
  };
  const whereOk: Record<Where, boolean> = { before: canAdd("heading", "before"), after: canAdd("heading", "after"), inside: canAdd("heading", "inside") || canAdd("section", "inside") };
  const addWhereNow: Where = whereOk[addWhere] ? addWhere : whereOk.after ? "after" : whereOk.inside ? "inside" : "before";
  /** Moves an element to a place (its index there counted without the element itself). */
  const moveTo = (nodeId: string, place: { parentId: string; index: number }) => {
    const at = index?.nodes.get(nodeId);
    const into = index?.nodes.get(place.parentId);
    if (!at || !into) return;
    if (at.parentId === place.parentId && into.children.indexOf(nodeId) === place.index) return;
    void change(tr("نقل", "Move"), [{ op: "move", nodeId, parentId: place.parentId, index: Math.max(0, Math.min(place.index, into.children.filter((c) => c !== nodeId).length)) }], nodeId);
  };
  /** One step earlier or later among the elements beside it. */
  const nudge = (nodeId: string, delta: number) => {
    const at = index?.nodes.get(nodeId);
    if (!at?.parentId || !index) return;
    moveTo(nodeId, { parentId: at.parentId, index: index.nodes.get(at.parentId)!.children.indexOf(nodeId) + delta });
  };
  const copySelected = () => {
    if (!selFree || !selNode?.parentId) return;
    const copy = copyOf(selFree, makeIds());
    void change(tr("نسخة", "Copy"), [{ op: "insert", parentId: selNode.parentId, index: selPos + 1, node: copy }], copy.id);
  };

  /** The place under the pointer that takes `node`, and where among what it holds. */
  const dropAt = (p: Pt, node: PagesAPI.PageTreeNode): Drop | null => {
    if (!index || !inFrame(p)) return null;
    const hit = pickAt(grid.near(p), p);
    for (let at: string | null = hit?.inside ? hit.id : null; at && at !== index.root; at = index.nodes.get(at)?.parentId ?? up.get(at) ?? null) {
      const box = shapeOf(at)?.box;
      // Over an old section or a scene, things are placed freely (dropFor), not in a row.
      const kind = index.nodes.get(at)?.node.type;
      if (!box || kind === "legacy" || kind === "roseBlock" || !index.nodes.has(at) || !canHold(index, at, node)) continue;
      const here = index.nodes.get(at)!;
      const kids = here.children.filter((c) => c !== node.id);
      const across = here.node.type === "columns";
      const rtl = layout?.dir === "rtl";
      let i = kids.length;
      for (let k = 0; k < kids.length; k++) {
        const b = shapeOf(kids[k])?.box;
        if (b && (across ? (rtl ? p.x > b.x + b.w / 2 : p.x < b.x + b.w / 2) : p.y < b.y + b.h / 2)) {
          i = k;
          break;
        }
      }
      const end = i >= kids.length;
      const ref = kids.length ? shapeOf(kids[end ? kids.length - 1 : i])?.box : undefined;
      const line = across
        ? { x: (ref ? (rtl !== end ? ref.x + ref.w : ref.x) : box.x + box.w / 2) - 1, y: box.y, w: 3, h: box.h }
        : { x: box.x, y: (ref ? (end ? ref.y + ref.h : ref.y) : box.y + box.h / 2) - 1, w: box.w, h: 3 };
      return { parentId: at, index: i, line, box };
    }
    return null;
  };

  /**
   * Where something dragged from the Add panel lands: inside a place of the tree that takes
   * it; on the line between two page items (near it); else over the old section or scene
   * under the pointer, placed freely where it's dropped.
   */
  const dropFor = (p: Pt, kind: AddKind): Drop | null => {
    if (!index || !layout || !inFrame(p)) return null;
    const node = probe(kind);
    const inTree = dropAt(p, node);
    if (inTree) return inTree;
    const items = topItems.map((id) => ({ id, box: shapeOf(id)?.box })).filter((x): x is { id: string; box: Box } => Boolean(x.box && x.box.h > 0));
    const band = 28;
    for (let i = 0; i <= items.length; i++) {
      const above = items[i - 1];
      const below = items[i];
      const y = above && below ? (above.box.y + above.box.h + below.box.y) / 2 : above ? above.box.y + above.box.h : below ? below.box.y : null;
      if (y === null || Math.abs(p.y - y) > band) continue;
      const anchor = above ? above.id : below!.id;
      const where: Where = above ? "after" : "before";
      const c = insertCtx((x) => `__${x}`);
      if (!c || !insertOps(c, anchor, node, where)) continue;
      return { parentId: index.root, index: -1, line: { x: frameBox.x, y: y - 2, w: frameBox.w, h: 4 }, box: { x: frameBox.x, y: y - 14, w: frameBox.w, h: 28 }, page: { anchor, where } };
    }
    // Over a section or scene: the page item under the pointer, at the pointer's spot of its layer.
    const under = items.find((x) => p.y >= x.box.y && p.y <= x.box.y + x.box.h);
    if (!under) return null;
    const c = insertCtx((x) => `__${x}`);
    if (!c || !insertOps(c, under.id, node, "inside")) return null;
    // The layer objects sit on: the section, or one screen of a taller scene (it stays in sight).
    const vh = layout.viewport.h * zoom;
    const h = Math.min(under.box.h, vh);
    const top = Math.min(Math.max(under.box.y, frameBox.y), under.box.y + under.box.h - h);
    const holder = { x: under.box.x, y: top, w: under.box.w, h };
    const spot = placeFor({ x: p.x, y: p.y, w: 0, h: 0 }, holder, "center", layout.dir === "rtl");
    const mark = { x: p.x - 60, y: p.y - 22, w: 120, h: 44 };
    return { parentId: index.root, index: -1, line: { x: mark.x, y: mark.y + mark.h - 2, w: mark.w, h: 2 }, box: mark, over: { anchor: under.id, spot } };
  };

  // The lines between side-by-side cells of the selected columns (or of the selected cell's columns).
  const handleCols = selNode?.node.type === "columns" ? selected : selNode?.node.type === "cell" ? selNode.parentId : null;
  const handles = (() => {
    const at = handleCols ? index?.nodes.get(handleCols) : undefined;
    if (!at || editing || at.children.length < 2) return [];
    const boxes = at.children.map((c) => shapeOf(c)?.box);
    if (boxes.some((b) => !b)) return [];
    const bs = boxes as Box[];
    if (bs.some((b) => Math.abs(b.y - bs[0].y) > 2)) return [];
    return bs.slice(0, -1).map((a, i) => {
      const b = bs[i + 1];
      const rtl = a.x > b.x;
      return { i, x: rtl ? (b.x + b.w + a.x) / 2 : (a.x + a.w + b.x) / 2, y: Math.max(a.y, b.y), h: Math.min(a.h, b.h), left: Math.min(a.x, b.x), right: Math.max(a.x + a.w, b.x + b.w), rtl, widths: bs.map((q) => q.w) };
    });
  })();
  const commitWidths = (colsId: string, w12: number[]) => {
    const n = nodeOf(colsId);
    if (n) void change(tr("عرض الأعمدة", "Column widths"), [styleOp(n, screen, { widths: reduceWidths(w12) })]);
  };
  const rel = (b: Box) => ({ left: b.x - frameBox.x, top: b.y - frameBox.y, width: b.w, height: b.h });
  /** The box a freely placed element sits in, on the canvas. */
  const holderOf = (sid: string): Box | null => {
    const it = layout?.items.find((i) => i.kind === "node" && i.id === sid);
    return it && it.kind === "node" && it.holder && layout ? toScreen(it.holder, layout.scroll, pan, zoom) : null;
  };
  const toggleLive = () => {
    const on = !motionLive;
    setMotionLive(on);
    send({ type: "motionLive", on });
  };

  const dragged = useRef<string | null>(null);

  const inspector = () => {
    if (themeOpen) {
      return <ThemePanel themes={themesQ.data ?? []} failed={themesQ.isError} current={currentTheme} preview={themePreview} mode={themeMode} onPreview={(t) => { setThemePreview(t); setThemeMode(null); }} onMode={setThemeMode} saving={themeSaving} onSave={() => setAsking({ kind: "theme" })} />;
    }
    if (!selected || !index) {
      return (
        <p className="text-xs leading-6 text-white/45">
          {tr(
            "كبسة على أي عنصر بتختاره، وكبسة تانية بنفس المكان بتطلع للأب. كبستين على نص بتكتب مكانه. Ctrl مع الكبسة للأعمق. الأسهم بتنقل بين العناصر، وEsc للأب، وEnter لأول ابن أو لكتابة النص. Ctrl+Z للتراجع. Ctrl مع عجلة الماوس للتكبير، والمسطرة مع السحب للتحريك.",
            "Click an element to select it; a second click at the same spot selects its parent. Double-click a text to write in place. Ctrl+click picks the deepest. Arrows move between elements, Esc goes to the parent, Enter to the first child or to write the text. Ctrl+Z undoes. Ctrl+wheel zooms, Space+drag moves the canvas.",
          )}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-white/50" aria-label={tr("المسار", "Path")} data-testid="studio-path">
          {selPath.map((pid, i) => (
            <span key={pid} className="flex items-center gap-1">
              {i ? <span className="inline-block ltr:-scale-x-100">‹</span> : null}
              <button type="button" onClick={() => select(pid, true)} className={`rounded px-1 hover:bg-white/[0.06] ${pid === selected ? "text-white" : ""}`}>
                {crumb(pid)}
              </button>
            </span>
          ))}
        </nav>
        <div>
          <div className="text-base font-semibold">{label(selected)}</div>
          <div className="mt-0.5 font-mono text-[11px] text-white/35" dir="ltr">{selExtra?.kind === "slot" ? selExtra.path : selected}</div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <dt className="text-white/45">{tr("الحجم", "Size")}</dt>
          <dd dir="ltr" className="text-end">{selShape ? `${Math.round(selShape.box.w / zoom)} × ${Math.round(selShape.box.h / zoom)}` : "—"}</dd>
        </dl>

        {selExtra?.kind === "slot" && selExtra.edit === "list" ? (
          <Field
            label={`${tr("سطر لكل لفّة، بلغة الصفحة المعروضة", "One line per turn, in the shown page language")}: ${LANG_NAME[shopLang]}`}
            multiline
            value={(() => {
              const v = fieldValue(sectionOf(selExtra.sectionId), shopLang, main, parsePath(selExtra.path));
              return Array.isArray(v) ? v.join("\n") : "";
            })()}
            onSave={(v) => void setField(selExtra.sectionId, parsePath(selExtra.path), v.split("\n").map((x) => x.trim()).filter(Boolean), shopLang)}
            testId="studio-slot-list"
          />
        ) : null}
        {selExtra?.kind === "slot" && selExtra.link ? (
          <Field
            label={tr("رابط الزر (صفحة بالمتجر متل /shop، أو https://…)", "The button's link (a store page like /shop, or https://…)")}
            value={String(fieldValue(sectionOf(selExtra.sectionId), main, main, parsePath(selExtra.link)) ?? "")}
            onSave={(v) => {
              const t = v.trim();
              if (!t) void setField(selExtra.sectionId, parsePath(selExtra.link!), null, main);
              else if (/^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i.test(t)) void setField(selExtra.sectionId, parsePath(selExtra.link!), t, main);
              else toast.error(tr("الرابط لازم يبلّش بـ / أو https://", "A link starts with / or https://"));
            }}
            testId="studio-slot-link"
          />
        ) : null}
        {selExtra?.kind === "part" || selExtra?.kind === "auto" ? <PartInfo extra={selExtra} /> : null}
        {selExtra?.kind === "slot" && selExtra.edit !== "media" && selExtra.edit !== "list" ? (
          <div className="space-y-2">
            <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" disabled={Boolean(editing)} onClick={() => startText(selected)} data-testid="studio-edit-text">
              {editing ? tr("عم تكتب بالصفحة… (Enter للحفظ، Esc للإلغاء)", "Writing in the page… (Enter saves, Esc cancels)") : tr("كتابة النص مكانه", "Write the text in place")}
            </button>
            <p className="text-[11px] leading-5 text-white/40">
              {selExtra.edit === "lines" ? tr("نص بأكتر من سطر: Enter لسطر جديد، Ctrl+Enter للحفظ.", "Several lines: Enter for a new line, Ctrl+Enter saves.") : null}{" "}
              {tr("بينحفظ بلغة الصفحة المعروضة", "Saved in the shown page language")}: {LANG_NAME[shopLang]}
            </p>
          </div>
        ) : null}
        {selExtra?.kind === "slot" && selExtra.edit === "media" ? (
          <MediaSlot
            kind={selExtra.media === "video" ? "video" : "image"}
            value={String(fieldValue(sectionOf(selExtra.sectionId), main, main, parsePath(selExtra.path)) ?? "")}
            busy={busy}
            onSet={(url) => void setField(selExtra.sectionId, parsePath(selExtra.path), url, main)}
          />
        ) : null}

        {selSection && topAt >= 0 ? (
          <>
            <SectionActions
              canUp={topAt > 0}
              canDown={topAt < pageKids.length - 1}
              hidden={!selSection.isVisible}
              busy={busy}
              onUp={() => void moveItem(selected, -1)}
              onDown={() => void moveItem(selected, 1)}
              onToggle={() => void run(selSection.isVisible ? tr("إخفاء", "Hide") : tr("إظهار", "Show"), [{ op: "setVisible", sectionId: selSection.id, visible: !selSection.isVisible }])}
              onDelete={() => setAsking({ kind: "delete", nodeId: selected, name: label(selected) })}
            />
            {!selSection.isVisible ? <p className="text-[11px] text-amber-200/80">{tr("مخفي عن الزبون. لسا موجود هون وبالطبقات.", "Hidden from customers. Still here and in the layers.")}</p> : null}
            <SectionSettings
              type={selSection.type}
              data={selSection.data as Record<string, unknown>}
              words={(fieldValue(selSection, shopLang, main, []) ?? {}) as Record<string, unknown>}
              busy={busy}
              onSet={(path, value, inLanguage) => void setField(selSection.id, path, value, inLanguage ? shopLang : main)}
            />
            <Link to={`/admin/pages/${id}`} className="block text-[11px] text-accent-300 hover:underline">{tr("كل حقول القسم بالمحرر القديم", "All the section's fields in the old editor")}</Link>
          </>
        ) : null}

        {selBlock ? (
          <div className="space-y-2">
            <SectionActions
              canUp={!FIXED_BLOCKS.has(selBlock) && (topAt >= 0 ? topAt : indexAt(selected)) > 0}
              canDown={!FIXED_BLOCKS.has(selBlock) && (topAt >= 0 ? topAt < pageKids.length - 1 : indexAt(selected) < pageKids.length)}
              hidden={false}
              busy={busy}
              onUp={() => void moveItem(selected, -1)}
              onDown={() => void moveItem(selected, 1)}
              onToggle={() => {
                const flag = BLOCK_FLAG[selBlock];
                if (flag && heroSection) void run(tr("إخفاء", "Hide"), [{ op: "setField", sectionId: heroSection.id, lang: main, path: [flag], value: false }]);
              }}
            />
            {topAt >= 0 ? (
              <button type="button" className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1]" disabled={busy} onClick={() => void run(tr("مكان تلقائي", "Automatic place"), [{ op: "placeBlock", block: selBlock as "seasons", index: null }])}>
                {tr("رجوع لمكانه التلقائي", "Back to its automatic place")}
              </button>
            ) : null}
            <p className="text-[11px] leading-5 text-white/40">
              {tr("الإخفاء بيصير من إعدادات الافتتاح، ومن هناك بيرجع.", "Hiding goes through the opening's settings, and it comes back from there.")}{" "}
              {selBlock === "instagram"
                ? tr("بيطلع لما يكون للمتجر رابط إنستغرام (الإعدادات ← أسفل الصفحة) وما في آراء زبائن بالصفحة.", "It shows when the store has an Instagram link (Settings → footer) and the page has no customer reviews.")
                : selBlock === "fabric"
                  ? tr("مكانه ثابت: بعد أول قسم منتجات.", "Its place is fixed: after the first products section.")
                  : null}
            </p>
          </div>
        ) : null}

        {selFree ? (
          <div className="space-y-3">
            <NodeActions
              canUp={selPos > 0}
              canDown={selPos >= 0 && selPos < selSiblings.length - 1}
              busy={busy}
              onUp={() => nudge(selected, -1)}
              onDown={() => nudge(selected, 1)}
              onCopy={selFree.type === "cell" ? undefined : copySelected}
              onDelete={selFree.type === "cell" ? undefined : () => setAsking({ kind: "delete", nodeId: selected, name: label(selected), tree: true })}
            />
            {selFree.type === "columns" ? <ColumnsPanel node={selFree} screen={screen} busy={busy} ids={makeIds} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "cell" ? (
              <CellPanel node={selFree} cols={nodeOf(selNode?.parentId) ?? null} busy={busy} onOps={(l, ops) => void change(l, ops, ops.some((o) => o.op === "remove" && o.nodeId === selected) ? selNode?.parentId ?? null : undefined)} />
            ) : null}
            {selFree.type === "section" ? <SectionPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {EDITABLE.has(selFree.type) ? <ElementPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "svg" ? <SvgPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "product360" ? <Product360Panel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            <LookPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} onPreview={(vars) => send({ type: "previewLook", nodeId: selected, vars })} />
            <MotionPanel
              node={selFree}
              busy={busy}
              onOps={(l, ops) => {
                playNext.current = selected;
                void change(l, ops);
              }}
              onPlay={() => send({ type: "motionPlay", nodeId: selected })}
            />
            <AddMenu
              kinds={ADDABLE.filter((k) => canAdd(k, "inside") || canAdd(k, "after"))}
              busy={busy}
              title={index && canHold(index, selected, probe("text")) ? tr("إضافة لجوّا", "Add inside") : tr("إضافة بعده", "Add after it")}
              onAdd={(k, src) => addKind(k, src, canAdd(k, "inside") ? "inside" : "after")}
              onDragKind={(k) => (adding.current = k)}
            />
          </div>
        ) : null}

        {selected === index.root || pageItemOf({ index, up, extras, pageIndex: indexAt, ids: makeIds() }, selected) ? (
          <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-add-section">
            <div className="text-xs font-medium text-white/70">
              {selected === index.root ? tr("قسم جديد بأعمدة، آخر الصفحة", "A new section with columns, at the end of the page") : tr("قسم جديد بأعمدة، بعد هاد", "A new section with columns, after this one")}
            </div>
            <SplitPicker busy={busy} onPick={(w) => addSection(w)} testId="studio-new-section" />
            <button type="button" className="w-full rounded-lg bg-accent-500/20 px-2 py-1.5 text-xs text-accent-100 hover:bg-accent-500/30" onClick={() => setLeftTab("add")} data-testid="studio-open-add">
              + {tr("إضافة أي إشي هون (لوحة الإضافة)", "Add anything here (the Add panel)")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={zoomToSelected} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1]">{tr("تكبير على المحدد", "Zoom to selection")}</button>
          {parentOf(selected) ? <button type="button" onClick={() => select(parentOf(selected), true)} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1]">{tr("الأب (Esc)", "Parent (Esc)")}</button> : null}
        </div>
      </div>
    );
  };

  // The page's own items, in order, with the rose scenes that show without a place yet.
  const topItems = (() => {
    // Each scene just before the page item it shows above (in the order they show).
    const keyed = pageKids.map((n, i) => ({ id: n.id, k: i }));
    shapes
      .filter((s) => s.id.startsWith("block:"))
      .sort((a, b) => a.box.y - b.box.y)
      .forEach((s, j) => keyed.push({ id: s.id, k: indexAt(s.id) - 0.5 + j * 1e-3 }));
    return keyed.sort((a, b) => a.k - b.k).map((x) => x.id);
  })();
  /** What's measured inside an old section, scene, field or piece (not the tree's own elements). */
  const piecesOf = (sid: string) => shapes.filter((s) => s.parentId === sid && extras.has(s.id) && extras.get(s.id)!.kind !== "block").map((s) => s.id);
  // The rows under an item that's open: its fields and pieces, and theirs while one of them is open.
  const pieceRows = (sid: string, depth: number, pick: (sid: string) => void): React.ReactNode[] => {
    const kids = piecesOf(sid);
    const shown = kids.length > 40 && !kids.some((k) => selPath.includes(k)) ? kids.slice(0, 40) : kids;
    const rows = shown.flatMap((f) => [
      <button
        key={f}
        type="button"
        onClick={() => pick(f)}
        onMouseEnter={() => setHovered(f)}
        onMouseLeave={() => setHovered(null)}
        className={`flex w-full truncate rounded-md py-0.5 pe-2 text-start text-[11px] ${selected === f ? "bg-accent-500/25 text-white" : hovered === f ? "bg-white/[0.06] text-white" : "text-white/55 hover:bg-white/[0.04]"}`}
        style={{ paddingInlineStart: 20 + depth * 12 }}
        data-testid="studio-layer"
        data-node={f}
      >
        {label(f)}
      </button>,
      ...(selPath.includes(f) ? pieceRows(f, depth + 1, pick) : []),
    ]);
    if (shown.length < kids.length) rows.push(<p key={`${sid}-more`} className="py-0.5 text-[10px] text-white/30" style={{ paddingInlineStart: 20 + depth * 12 }}>+{kids.length - shown.length}</p>);
    return rows;
  };
  const dropOn = (target: string) => {
    const from = dragged.current;
    dragged.current = null;
    if (!from || from === target) return;
    const to = pageKids.findIndex((n) => n.id === target);
    const at = to >= 0 ? to : indexAt(target);
    const block = from.startsWith("block:") ? from.slice(6) : index?.nodes.get(from)?.node.type === "roseBlock" ? String(index.nodes.get(from)!.node.props.block) : null;
    if (block) void run(tr("نقل", "Move"), [{ op: "placeBlock", block: block as "seasons", index: at }]);
    else if (pageKids.some((n) => n.id === from)) void run(tr("نقل", "Move"), [{ op: "move", nodeId: from, index: at }]);
  };
  /** A row dropped on another: the page's own items swap places; an element goes inside a place that takes it, else before the row. */
  const dropAny = (target: string) => {
    const from = dragged.current;
    if (!from || from === target || !index) {
      dragged.current = null;
      return;
    }
    const top = (x: string) => pageKids.some((n) => n.id === x) || x.startsWith("block:");
    if (top(from) && top(target)) return dropOn(target);
    dragged.current = null;
    const node = nodeOf(from);
    if (!node || !isFree(node.type)) return;
    if (canHold(index, target, node)) return moveTo(from, { parentId: target, index: index.nodes.get(target)!.children.filter((c) => c !== from).length });
    const t = index.nodes.get(target);
    if (t?.parentId && canHold(index, t.parentId, node)) moveTo(from, { parentId: t.parentId, index: index.nodes.get(t.parentId)!.children.filter((c) => c !== from).indexOf(target) });
  };
  const layersList = (pick: (sid: string) => void) => (
    <div>
      <button type="button" onClick={() => pick(index!.root)} className={`flex w-full rounded-md px-2 py-1 text-start text-xs ${selected === index!.root ? "bg-accent-500/25 text-white" : "text-white/70 hover:bg-white/[0.04]"}`} data-testid="studio-layer" data-node={index!.root}>
        {typeLabel("page")}
      </button>
      {topItems.map((sid) => {
        const n = index!.nodes.get(sid)?.node;
        const sec = n?.type === "legacy" ? sectionOf(String(n.props.sectionId)) : undefined;
        const open = selPath.includes(sid);
        return (
          <div key={sid} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropAny(sid); }}>
            <button
              type="button"
              draggable
              onDragStart={() => (dragged.current = sid)}
              onClick={() => pick(sid)}
              onMouseEnter={() => setHovered(sid)}
              onMouseLeave={() => setHovered(null)}
              className={`flex w-full cursor-grab items-center gap-1.5 truncate rounded-md py-1 pe-2 ps-5 text-start text-xs ${selected === sid ? "bg-accent-500/25 text-white" : hovered === sid ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"} ${sec && !sec.isVisible ? "opacity-45" : ""}`}
              data-testid="studio-layer"
              data-node={sid}
            >
              <span className="shrink-0 text-white/30">⋮⋮</span>
              <span className="truncate">{label(sid)}</span>
              {sec && !sec.isVisible ? <span className="ms-auto shrink-0 text-[10px]">{tr("مخفي", "Hidden")}</span> : null}
            </button>
            {n && n.type !== "legacy" ? (
              <Layers index={index!} id={sid} selected={selected} hovered={hovered} sectionTypes={sectionTypes} onPick={pick} onHover={setHovered} onDragStart={(x) => (dragged.current = x)} onDropOn={dropAny} depth={2} childrenOnly />
            ) : null}
            {open ? pieceRows(sid, 1, pick) : null}
          </div>
        );
      })}
    </div>
  );

  // The Add panel: what's added goes before, after or inside the selection (see insert.ts).
  const addTarget = (() => {
    if (!index || !selected || selected === index.root) return tr("آخر الصفحة", "at the end of the page");
    const c = insertCtx((x) => `__${x}`);
    const n = index.nodes.get(selected);
    // Beside the tree's own elements; beside (or over) the page item around anything else.
    const beside = n && isFree(n.node.type) && n.parentId !== index.root ? selected : (c && pageItemOf(c, selected)) || selected;
    const what = `«${label(addWhereNow === "inside" ? (n && isFree(n.node.type) ? selected : beside) : beside)}»`;
    return addWhereNow === "before" ? `${tr("قبل", "before")} ${what}` : addWhereNow === "after" ? `${tr("بعد", "after")} ${what}` : `${tr("جوّا أو فوق", "inside or over")} ${what}`;
  })();
  const motionNode = selFree ?? null;
  const addPanel = () => (
    <AddPanel
      where={addWhereNow}
      canWhere={whereOk}
      target={addTarget}
      busy={busy}
      can={(k) => canAdd(k, addWhereNow)}
      onWhere={setAddWhere}
      onAdd={(k) => addKind(k)}
      onDragKind={(k) => (adding.current = k)}
      onSplit={(w) => addSection(w, addWhereNow === "before" ? "before" : "after")}
      motionNode={motionNode}
      motion={motionNode?.motion as Motion | undefined}
      onMotion={(p) => {
        if (!motionNode) return;
        playNext.current = motionNode.id;
        void change(p.label(), [motionOp(motionNode, withPreset(motionNode.motion as Motion | undefined, p))]);
      }}
    />
  );
  const leftTabs = (
    <div className="mb-2 flex gap-1 rounded-xl bg-white/[0.04] p-1" role="tablist" aria-label={tr("لوحة جانبية", "Side panel")}>
      {(["add", "layers"] as const).map((t) => (
        <button key={t} type="button" role="tab" aria-selected={leftTab === t} onClick={() => setLeftTab(t)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs ${leftTab === t ? "bg-accent-500/30 text-white" : "text-white/60 hover:bg-white/[0.06]"}`} data-testid={`studio-tab-${t}`}>
          {t === "add" ? `+ ${tr("إضافة", "Add")}` : tr("الطبقات", "Layers")}
        </button>
      ))}
    </div>
  );

  if (treeQ.isError || pageQ.isError) {
    return <Shell><p className="p-8 text-sm text-red-300">{tr("ما انفتحت الصفحة", "The page didn't open")}: {getApiErrorMessage(treeQ.error ?? pageQ.error)}</p></Shell>;
  }

  return (
    <Shell>
      <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <Link to="/admin/pages" className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white">
          <span className="inline-block ltr:-scale-x-100">→</span> {tr("الصفحات", "Pages")}
        </Link>
        <h1 className="me-2 truncate text-sm font-semibold">{pageQ.data?.name ?? "…"}</h1>
        <button type="button" onClick={() => setSheet((v) => !v)} aria-expanded={sheet} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs md:hidden" data-testid="studio-layers-toggle">
          {tr("الطبقات", "Layers")}
        </button>
        <button
          type="button"
          onClick={() => {
            setLeftTab("add");
            if (window.matchMedia("(max-width: 767.98px)").matches) setSheet(true);
          }}
          aria-pressed={leftTab === "add"}
          className="rounded-lg bg-accent-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-400"
          data-testid="studio-add-toggle"
        >
          + {tr("إضافة", "Add")}
        </button>
        <span className="rounded-md bg-accent-500/15 px-2 py-0.5 text-[11px] text-accent-200">{tr("المحرر الجديد", "New editor")}</span>
        <div className="ms-auto flex flex-wrap items-center gap-1" role="group" aria-label={tr("حجم الشاشة", "Screen size")}>
          {(Object.keys(DEVICES) as Device[]).map((k) => (
            <button key={k} type="button" onClick={() => setDevice(k)} aria-pressed={device === k} className={`rounded-lg px-2 py-1 text-xs ${device === k ? "bg-accent-500/25 text-white" : "text-white/60 hover:bg-white/[0.06]"}`}>
              {DEVICES[k].label()}
            </button>
          ))}
        </div>
        {langs.enabled.length > 1 ? (
          <div className="flex items-center gap-1" role="group" aria-label={tr("لغة الصفحة", "Page language")}>
            {langs.enabled.map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={shopLang === l} className={`rounded-lg px-2 py-1 text-xs ${shopLang === l ? "bg-white/[0.12] text-white" : "text-white/55 hover:bg-white/[0.06]"}`}>
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1" dir="ltr">
          <button type="button" onClick={() => zoomBy(1 / 1.25)} className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/[0.06]" aria-label={tr("تصغير", "Zoom out")}>−</button>
          <button type="button" onClick={fit} className="min-w-[3.5rem] rounded-lg px-1 text-xs text-white/80 hover:bg-white/[0.06]" title={tr("ملاءمة (Ctrl+0)", "Fit (Ctrl+0)")} data-testid="studio-zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/[0.06]" aria-label={tr("تكبير", "Zoom in")}>+</button>
        </div>
        <div className="flex items-center gap-1" data-testid="studio-draft">
          <span className={`rounded-md px-2 py-0.5 text-[11px] ${draft ? "bg-amber-500/15 text-amber-200" : "text-white/40"}`} data-testid="studio-draft-state">
            {busy ? tr("عم نحفظ…", "Saving…") : draft ? tr("مسودة محفوظة، مش منشورة", "Draft saved, not published") : tr("متل المنشور", "Same as published")}
          </span>
          <button type="button" onClick={() => void undoLast()} disabled={!canUndo || busy} className="h-7 rounded-lg px-2 text-xs text-white/75 hover:bg-white/[0.06] disabled:opacity-30" title="Ctrl+Z" data-testid="studio-undo">↶ {tr("تراجع", "Undo")}</button>
          <button type="button" onClick={() => void redoLast()} disabled={!canRedo || busy} className="h-7 rounded-lg px-2 text-xs text-white/75 hover:bg-white/[0.06] disabled:opacity-30" title="Ctrl+Shift+Z" data-testid="studio-redo">↷ {tr("إعادة", "Redo")}</button>
          <button type="button" onClick={toggleLive} aria-pressed={motionLive} title={tr("تشغيل كل الحركة بالصفحة", "Play all the motion on the page")} className={`h-7 rounded-lg px-2 text-xs ${motionLive ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/[0.06]"}`} data-testid="studio-motion-live">{motionLive ? "❚❚" : "▶"} {tr("الحركة", "Motion")}</button>
          <button type="button" onClick={() => setThemeOpen((v) => !v)} aria-pressed={themeOpen} className={`h-7 rounded-lg px-2 text-xs ${themeOpen ? "bg-white/[0.12] text-white" : "text-white/75 hover:bg-white/[0.06]"}`} data-testid="studio-theme-toggle">{tr("الثيم", "Theme")}</button>
          {draft ? <button type="button" onClick={() => setAsking({ kind: "discard" })} disabled={busy} className="h-7 rounded-lg px-2 text-xs text-white/60 hover:bg-white/[0.06] disabled:opacity-30" data-testid="studio-discard">{tr("إلغاء المسودة", "Discard draft")}</button> : null}
          <button type="button" onClick={() => setAsking({ kind: "publish", force: false })} disabled={!draft || busy} className="h-7 rounded-lg bg-accent-500 px-3 text-xs font-medium text-white disabled:opacity-30" data-testid="studio-publish">{tr("نشر", "Publish")}</button>
        </div>
        {origin && pageQ.data ? (
          <a href={`${origin}${shopLang === langs.default ? "" : `/${shopLang}`}${pageQ.data.slug === "/" && shopLang !== langs.default ? "" : pageQ.data.slug}`} target="_blank" rel="noreferrer" className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">
            {tr("فتح بالمتجر", "Open in the store")} ↗
          </a>
        ) : null}
      </header>

      {treeQ.data && treeQ.data.format !== 2 ? (
        <p className="border-b border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200" data-testid="studio-sections-note">
          {tr("الصفحة بالمتجر لسا بتنعرض من الأقسام. هون بتبيّن متل ما رح تطلع بعد التحويل.", "The store still shows this page from its sections. Here it shows as it will after converting.")}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-e border-white/[0.08] p-2 md:block" aria-label={leftTab === "add" ? tr("إضافة", "Add") : tr("الطبقات", "Layers")}>
          {leftTabs}
          {leftTab === "add" ? (
            index ? addPanel() : null
          ) : (
            <>
              {index ? layersList((sid) => select(sid, true)) : null}
              <p className="px-2 pt-2 text-[10px] leading-4 text-white/30">{tr("اسحب سطر لتغيير الترتيب، أو لجوّا خلية.", "Drag a row to change the order, or into a cell.")}</p>
            </>
          )}
        </aside>

        <main
          ref={canvasRef}
          tabIndex={-1}
          className="relative outline-none min-w-0 flex-1 touch-none select-none overflow-hidden bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px]"
          style={{ cursor: panMode ? "grab" : "default" }}
          data-testid="studio-canvas"
        >
          <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: dev.w, height: dev.h }}>
            {src ? (
              <iframe ref={frameRef} key={`${src}#${frameKey}`} title={tr("الصفحة كما يراها الزبون", "The page as the customer sees it")} src={src} width={dev.w} height={dev.h} className="block bg-white shadow-2xl" style={{ border: 0 }} data-testid="studio-frame" />
            ) : null}
          </div>
          <div
            className={`absolute inset-0 ${editing ? "pointer-events-none" : ""}`}
            onDoubleClick={(e) => {
              const p = local(e);
              const at = inFrame(p) ? pickAt(grid.near(p), p) : null;
              if (at && extras.get(at.id)?.kind === "slot") {
                select(at.id);
                startText(at.id);
              }
            }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setHovered(filter.current.push(performance.now() + 1000, null))}
            onDragOver={(e) => {
              const k = adding.current;
              if (!k) return;
              const t = dropFor(local(e), k);
              const same = (a: Drop | null, b: Drop | null) => Boolean(a && b && a.parentId === b.parentId && a.index === b.index && a.page?.anchor === b.page?.anchor && a.page?.where === b.page?.where && !a.over && !b.over);
              setDrop((was) => (same(was, t) ? was : t));
              if (t) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDragLeave={() => setDrop(null)}
            onDrop={(e) => {
              e.preventDefault();
              const k = adding.current;
              // Where the pointer is now (the last dragover may not have been drawn yet).
              const t = k ? dropFor(local(e), k) ?? drop : null;
              adding.current = null;
              setDrop(null);
              if (!k || !t) return;
              if (t.over) addKind(k, undefined, "inside", t.over.anchor, t.over.spot);
              else if (t.page) addKind(k, undefined, t.page.where, t.page.anchor);
              else {
                // Into a place of the tree, at the line shown.
                const need = NEEDS[k];
                const put = (url?: string) => {
                  const node = makeNode(k, shopLang, makeIds(), url);
                  void change(tr("إضافة", "Add"), [{ op: "insert", parentId: t.parentId, index: t.index, node }], node.id);
                };
                if (need) setAsked({ media: need, then: put });
                else put();
              }
            }}
            data-testid="studio-overlay"
            data-shapes={shapes.length}
            data-editing={editing ? "1" : undefined}
          >
            <div className="pointer-events-none absolute overflow-hidden" style={{ left: frameBox.x, top: frameBox.y, width: frameBox.w, height: frameBox.h }}>
              {selNode?.parentId ? outline(selNode.parentId, "parent") : null}
              {hovered && hovered !== selected ? outline(hovered, "hover") : null}
              {outline(selected, "selected")}
              {placing ? (
                <div className="pointer-events-none absolute rounded-md border-2 border-dashed border-sky-400 bg-sky-400/10" style={rel(placing.box)} data-testid="studio-placing">
                  <span className="absolute start-0 -top-6 whitespace-nowrap rounded-md bg-sky-500 px-1.5 py-0.5 text-[11px] text-white" dir="ltr">{placing.x}% · {placing.y}%</span>
                </div>
              ) : null}
              {drop ? (
                <>
                  <div className="pointer-events-none absolute rounded-md border-2 border-dashed border-emerald-400/80 bg-emerald-400/5" style={rel(drop.box)} data-testid="studio-drop" data-drop={drop.over ? "over" : drop.page ? "page" : "inside"}>
                    {drop.over || drop.page ? (
                      <span className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-emerald-500 px-1.5 py-0.5 text-[11px] text-white">
                        {drop.over ? `${tr("فوق القسم", "Over the section")} · ${Math.round(drop.over.spot.x)}% · ${Math.round(drop.over.spot.y)}%` : tr("قسم جديد هون", "A new section here")}
                      </span>
                    ) : null}
                  </div>
                  <div className="pointer-events-none absolute rounded-full bg-emerald-400" style={rel(drop.line)} />
                </>
              ) : null}
              {/* A quick way to add before or after the selected page item, on its edges. */}
              {!drop && !editing && selected && index && selected !== index.root
                ? (() => {
                    const c = insertCtx((x) => `__${x}`);
                    const item = c ? pageItemOf(c, selected) : null;
                    const s = item ? shapeOf(item) : null;
                    const seen = s ? visiblePart(s.box, frameBox) : null;
                    if (!item || !seen) return null;
                    const pill = (where: Where, y: number) =>
                      c && insertOps(c, item, probe("heading"), where) ? (
                        <button
                          key={where}
                          type="button"
                          className="pointer-events-auto absolute start-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-lg hover:bg-accent-400"
                          style={{ top: y - frameBox.y }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            select(item);
                            setAddWhere(where);
                            setLeftTab("add");
                            if (window.matchMedia("(max-width: 767.98px)").matches) setSheet(true);
                          }}
                          data-testid={`studio-add-${where}`}
                        >
                          + {where === "before" ? tr("إضافة قبل", "Add before") : tr("إضافة بعد", "Add after")}
                        </button>
                      ) : null;
                    return [seen.above ? null : pill("before", seen.box.y + 2), seen.below ? null : pill("after", seen.box.y + seen.box.h - 2)];
                  })()
                : null}
              {handles.map((h) => {
                const live = resize && resize.colsId === handleCols && resize.i === h.i ? resize : null;
                const share = live ? live.w12[h.i] / (live.w12[h.i] + live.w12[h.i + 1]) : null;
                const x = share === null ? h.x : h.rtl ? h.right - share * (h.right - h.left) : h.left + share * (h.right - h.left);
                return (
                  <div
                    key={h.i}
                    role="separator"
                    aria-orientation="vertical"
                    tabIndex={0}
                    aria-label={tr("الخط بين خليتين: اسحبه أو استعمل الأسهم", "The line between two cells: drag it or use the arrows")}
                    className="group pointer-events-auto absolute -translate-x-1/2 cursor-col-resize touch-none outline-none"
                    style={{ left: x - frameBox.x, top: h.y - frameBox.y, width: 14, height: h.h }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      const start = twelfths(h.widths);
                      setResize({ colsId: handleCols!, i: h.i, start, w12: start });
                    }}
                    onPointerMove={(e) => {
                      e.stopPropagation();
                      if (!live) return;
                      const p = local(e);
                      const w12 = dragLine(live.start, h.i, h.rtl ? (h.right - p.x) / (h.right - h.left) : (p.x - h.left) / (h.right - h.left));
                      if (w12.join() !== live.w12.join()) setResize({ ...live, w12 });
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      setResize(null);
                      if (live && live.w12.join() !== live.start.join()) commitWidths(live.colsId, live.w12);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                      e.preventDefault();
                      e.stopPropagation();
                      const w12 = twelfths(h.widths);
                      const d = (e.key === "ArrowRight" ? 1 : -1) * (h.rtl ? -1 : 1);
                      w12[h.i] += d;
                      w12[h.i + 1] -= d;
                      if (w12[h.i] >= 1 && w12[h.i + 1] >= 1) commitWidths(handleCols!, w12);
                    }}
                    data-testid="studio-col-handle"
                  >
                    <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-accent-400/70 group-hover:bg-accent-300 group-focus-visible:bg-accent-200" />
                    {live ? (
                      <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-500 px-1.5 py-0.5 text-[11px] text-white" dir="ltr" data-testid="studio-col-share">
                        {h.rtl ? `${live.w12[h.i + 1]}/12 · ${live.w12[h.i]}/12` : `${live.w12[h.i]}/12 · ${live.w12[h.i + 1]}/12`}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          {!layout ? (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm text-white/55" data-testid="studio-waiting">
              {ticketError
                ? `${tr("ما انفتحت المعاينة", "The preview didn't open")}: ${ticketError}`
                : silent
                  ? tr("المتجر ما ردّ. لازم يكون عنوان لوحة الإدارة مضاف بإعدادات المتجر (ADMIN_ORIGIN).", "The store didn't answer. The admin's address has to be in the store's settings (ADMIN_ORIGIN).")
                  : tr("عم نفتح الصفحة…", "Opening the page…")}
            </div>
          ) : null}
        </main>

        {sheet && index ? (
          // Phones: the layers and what's selected; tablets: what's selected (the layers have their own column).
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-y-auto rounded-t-2xl border-t border-white/[0.1] bg-surface-950 p-2 shadow-2xl lg:hidden" data-testid="studio-sheet">
            <div className="flex justify-end">
              <button type="button" onClick={() => setSheet(false)} className="h-7 w-7 rounded-lg text-white/60 hover:bg-white/[0.06]" aria-label={tr("إغلاق", "Close")} data-testid="studio-sheet-close">×</button>
            </div>
            {(selected || themeOpen) && leftTab !== "add" ? <div className="mb-3 border-b border-white/[0.08] px-1 pb-3 text-sm">{inspector()}</div> : null}
            <div className="md:hidden">
              {leftTabs}
              {leftTab === "add"
                ? addPanel()
                : layersList((sid) => {
                    select(sid, true);
                    setSheet(false);
                  })}
            </div>
          </div>
        ) : null}

        <aside className="hidden w-64 shrink-0 overflow-y-auto border-s border-white/[0.08] p-3 text-sm lg:block" aria-label={tr("العنصر المحدد", "Selected element")} data-testid="studio-info">
          {inspector()}
        </aside>
      </div>

      {/* Smaller screens: what's selected, under the canvas. */}
      {selected && index ? (
        <div className="flex items-center gap-2 border-t border-white/[0.08] px-3 py-2 text-xs lg:hidden" data-testid="studio-bar">
          <span className="min-w-0 flex-1 truncate">{label(selected)}</span>
          {selExtra?.kind === "slot" && selExtra.edit !== "media" ? <button type="button" onClick={() => startText(selected)} className="rounded-lg bg-accent-500 px-2 py-1 text-white" data-testid="studio-bar-edit">{tr("كتابة", "Write")}</button> : null}
          <button type="button" onClick={() => setSheet(true)} className="rounded-lg bg-white/[0.06] px-2 py-1" data-testid="studio-bar-more">{tr("إعدادات", "Settings")}</button>
          {parentOf(selected) ? <button type="button" onClick={() => select(parentOf(selected), true)} className="rounded-lg bg-white/[0.06] px-2 py-1">{tr("الأب (Esc)", "Parent (Esc)")}</button> : null}
        </div>
      ) : null}

      {/* A picture or clip for what's being added: from the library (with upload), or a clip's link. */}
      <MediaLibraryModal
        open={asked?.media === "image"}
        onClose={() => setAsked(null)}
        title={tr("صورة", "Picture")}
        onSelect={(u) => {
          const a = asked;
          setAsked(null);
          a?.then(u);
        }}
      />
      <VideoPickerModal
        open={asked?.media === "video" && askedUrl === ""}
        onClose={() => setAsked(null)}
        onPick={({ url }) => {
          const a = asked;
          setAsked(null);
          a?.then(url);
        }}
      />
      {asked?.media === "video" ? (
        <div className="fixed bottom-4 start-1/2 z-[70] w-[min(28rem,92vw)] -translate-x-1/2 space-y-1 rounded-xl border border-white/[0.1] bg-surface-950 p-3 text-xs shadow-2xl" data-testid="studio-video-link">
          <label className="block text-[11px] text-white/55">
            {tr("أو رابط فيديو (MP4، https)", "Or a video link (MP4, https)")}
            <input dir="ltr" className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white" value={askedUrl} onChange={(e) => setAskedUrl(e.target.value)} placeholder="https://…/clip.mp4" data-testid="studio-video-link-url" />
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-lg bg-accent-500 px-2 py-1 text-white disabled:opacity-40"
              disabled={!/^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i.test(askedUrl.trim())}
              onClick={() => {
                const a = asked;
                const u = askedUrl.trim();
                setAsked(null);
                setAskedUrl("");
                a?.then(u);
              }}
              data-testid="studio-video-link-add"
            >
              {tr("إضافة", "Add")}
            </button>
            <button type="button" className="rounded-lg bg-white/[0.06] px-2 py-1" onClick={() => { setAsked(null); setAskedUrl(""); }}>{tr("إلغاء", "Cancel")}</button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={asking !== null}
        variant={asking?.kind === "delete" || (asking?.kind === "publish" && asking.force) ? "danger" : "warning"}
        isLoading={busy || themeSaving}
        title={
          asking?.kind === "delete" ? (asking.tree ? tr("حذف العنصر؟", "Delete the element?") : tr("حذف القسم؟", "Delete the section?"))
          : asking?.kind === "publish" ? (asking.force ? tr("الصفحة تغيّرت من مكان تاني", "The page changed elsewhere") : tr("نشر التغييرات؟", "Publish the changes?"))
          : asking?.kind === "discard" ? tr("إلغاء المسودة؟", "Discard the draft?")
          : tr("حفظ الثيم لكل المتجر؟", "Save the theme for the whole store?")
        }
        message={
          asking?.kind === "delete" ? (asking.tree
            ? `${asking.name}. ${tr("بيروح من المسودة مع كل اللي جوّاه، وبيرجع بالتراجع.", "It leaves the draft with everything inside it, and comes back with undo.")}`
            : `${asking.name}. ${tr("بيروح من المسودة، وبيرجع بالتراجع أو بإلغاء المسودة. بالمتجر بينحذف بس بعد النشر.", "It leaves the draft, and comes back with undo or by discarding the draft. The store loses it only after publishing.")}`)
          : asking?.kind === "publish" ? (asking.force
            ? tr("انحفظت تغييرات على الصفحة بعد ما بلشت المسودة. النشر هلّق بيكتب المسودة فوقها. نسخة من الحالية بتنحفظ بالسجل.", "The page was changed after the draft began. Publishing now writes the draft over it. A copy of the current one is kept in the history.")
            : tr("الزبائن رح يشوفوا الصفحة متل ما هي هون. نسخة من المنشورة هلّق بتنحفظ بالسجل.", "Customers will see the page as it is here. A copy of what's live now is kept in the history."))
          : asking?.kind === "discard" ? tr("كل التغييرات اللي مش منشورة بتروح، والصفحة بترجع متل المنشورة.", "Every unpublished change goes, and the page goes back to what's live.")
          : tr("الثيم بيتغيّر لكل صفحات المتجر فوراً، مش بس هالصفحة.", "The theme changes for every page of the store right away, not only this one.")
        }
        confirmText={asking?.kind === "delete" ? tr("حذف", "Delete") : asking?.kind === "publish" ? tr("نشر", "Publish") : asking?.kind === "discard" ? tr("إلغاء المسودة", "Discard draft") : tr("حفظ", "Save")}
        onClose={() => setAsking(null)}
        onConfirm={async () => {
          const a = asking;
          if (!a) return;
          if (a.kind === "delete") {
            setAsking(null);
            if (await run(tr("حذف", "Delete"), [{ op: "remove", nodeId: a.nodeId }])) setSelected(null);
          } else if (a.kind === "publish") await publish(a.force);
          else if (a.kind === "discard") await discard();
          else {
            setAsking(null);
            await saveTheme();
          }
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-950 text-white" dir={isRtl(adminLang()) ? "rtl" : "ltr"} data-testid="studio">
      {children}
    </div>
  );
}

function Layers({ index, id, selected, hovered, sectionTypes, onPick, onHover, onDragStart, onDropOn, depth = 0, childrenOnly = false }: {
  index: ReturnType<typeof indexTree>;
  id: string;
  selected: string | null;
  hovered: string | null;
  sectionTypes: Map<string, string>;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Rows of the tree's own elements can be dragged onto another row (into it, or before it). */
  onDragStart?: (id: string) => void;
  onDropOn?: (id: string) => void;
  depth?: number;
  childrenOnly?: boolean;
}) {
  const at = index.nodes.get(id);
  if (!at) return null;
  const pass = { index, selected, hovered, sectionTypes, onPick, onHover, onDragStart, onDropOn };
  if (childrenOnly) {
    return <>{at.children.map((c) => <Layers key={c} {...pass} id={c} depth={depth} />)}</>;
  }
  const n = at.node;
  const name = n.type === "page" ? typeLabel("page") : n.type === "cell" ? nodeTitle(index, id) : nodeName(n, n.type === "legacy" ? sectionTypes.get(String(n.props.sectionId)) : undefined);
  const free = isFree(n.type) && Boolean(onDragStart);
  return (
    <div
      onDragOver={onDropOn ? (e) => e.preventDefault() : undefined}
      onDrop={onDropOn ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropOn(id);
      } : undefined}
    >
      <button
        type="button"
        draggable={free}
        onDragStart={free ? (e) => {
          e.stopPropagation();
          onDragStart!(id);
        } : undefined}
        onClick={() => onPick(id)}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        className={`flex w-full items-center gap-1.5 truncate rounded-md py-1 pe-2 text-start text-xs ${selected === id ? "bg-accent-500/25 text-white" : hovered === id ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"}`}
        style={{ paddingInlineStart: 8 + depth * 12 }}
        data-testid="studio-layer"
        data-node={id}
      >
        <span className="shrink-0 text-[10px] text-white/35">{n.type === "cell" ? name : typeLabel(n.type)}</span>
        <span className="truncate">{n.type === "page" || n.type === "cell" || name === typeLabel(n.type) ? "" : name}</span>
      </button>
      {at.children.map((c) => (
        <Layers key={c} {...pass} id={c} depth={depth + 1} />
      ))}
    </div>
  );
}
