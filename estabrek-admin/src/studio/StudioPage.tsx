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
 * Phase 9 drags as plane geometry (space.ts, dragPlan.ts): a freely placed element moves
 * live in the frame, snaps (edges, middles, equal gaps, a grid), stops at, pushes or is
 * pulled flush to what it meets (turned and cut shapes too), stays inside its holder, or
 * goes into another place with its coordinates turned into that place's; elements in the
 * flow find their place by rows (a wrapping grid too), several at once; Shift keeps a
 * line, Ctrl lets go of snapping, Alt leaves a copy, Esc gives up.
 *
 * Phase 10 adds the Looks tab (LooksPanel, studio/looks): about 1,300 ready looks for what's
 * selected (buttons, cards, backgrounds with moving meshes, picture frames, type, word effects,
 * shadows, hovers, ways of coming in, section edges), shown in the frame as the pointer rests.
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
import { ROSE_ID, currentStoreTheme, listStoreThemes, saveStoreTheme, withOwnedTheme } from "./storeThemes";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { toast } from "../lib/toast";
import { History, fieldValue, getPath, looksOf, ownValue, parsePath, undoOf } from "./draft";
import { sendDraftBatches, travelDraftHistory, type HistoryDirection } from "./draftBatches";
import { MotionProfileFields } from "./MotionProfileFields";
import { pageMotionOps, type MotionProfile } from "./motionProfiles";
import { Field, MediaSlot, PartInfo, SceneSettings, SectionActions, SectionSettings, ThemePanel, WordsPanel } from "./StudioPanels";
import { ButtonStylePanel, MediaStylePanel, ShowOnPanel, TextStylePanel } from "./StylePanels";
import { EdgesPanel, ParticlesPanel, PatternPanel } from "./ShapePanels";
import { ScenePanel } from "./ScenePanel";
import { DeckPanel } from "./DeckPanel";
import { Model3dPanel } from "./Model3dPanel";
import { ContentBlocksPanel, PopupPanel } from "./ContentBlocksPanel";
import { BLOCK_KINDS } from "./blockDefaults";
import { ChartPanel, ClockPanel, InstrumentPanel, StickyPanel } from "./CreativePanels";
import { AddMenu, CellPanel, ColumnsPanel, EDITABLE, ElementPanel, NodeActions, SectionPanel, SplitPicker } from "./StudioTreePanels";
import { ADDABLE, canHold, copyOf, dragLine, idMaker, isFree, newSection, reduceWidths, styleOp, twelfths } from "./columns";
import { NEEDS, insertOps, makeNode, pageItemOf, type AddKind, type InsertCtx, type Spot, type Where } from "./insert";
import { AddPanel } from "./AddPanel";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { VideoPickerModal } from "../components/media/VideoPickerModal";
import { LookPanel, MotionPanel, VideoOverlayPanel } from "./LookPanels";
import { BoxPanel, FiltersPanel, PadPanel, StatePresets, StatesBar, TransitionPanel, TypeMorePanel } from "./TypePanels";
import { SiteStyleHead, SiteStylesList, StylePickPanel, useSiteStyles } from "./SiteStylesPanel";
import { BlockLinkPanel, MyBlocks, SaveBlockPanel } from "./BlocksPanel";
import { TemplatesGallery, type UseWhere } from "./TemplatesGallery";
import { ConvertAllPanel, ConvertPanel } from "./ConvertPanel";
import { PageSettingsPanel } from "./PageSettingsPanel";
import { convertSection, type OldSection, type RoseRole } from "./convert";
import { identityOf, storeNameOf } from "../lib/storeIdentity";
import { ROSE_COLOURS, coloursOf } from "./templates/colours";
import { isFamily } from "./templates/words";
import { storeKitOf, templateKitOf } from "./packs";
import { StoreKitContext } from "./storeKit";
import { listProducts } from "../api/catalog.api";
import { styleNode, styleOf, withOps } from "./siteStyles";
import { useAuth } from "../hooks/useAuth";
import { stateOps, stateView, type StateChoice } from "./states";
import { SvgPanel } from "./SvgPanel";
import { Product360Panel } from "./Product360Panel";
import { motionOp, placeFor, placedOn, shownLook, withPreset, type Motion } from "./look";
import { ContextMenu, MultiPanel, type MenuItem, type MultiActions } from "./MultiPanel";
import { Guides, SelectionHandles } from "./CanvasHandles";
import { gapsBetween, nudgeOf, type Gap, type Guide, type ResizeChange } from "./handles";
import { pickCanvasContainer } from "./canvasContainers";
import { effectiveLook, placementBox, placementPatch, readCanvasMode, readScaleContents, resizePatch, saveCanvasMode, saveScaleContents, scaleContentsLimits, scaleContentsPatch, transferPatch, type CanvasMode } from "./canvasManipulation";
import { DragSettings } from "./DragSettings";
import { LooksPanel } from "./LooksPanel";
import { lookOps, withLook, type Ready } from "./looks";
import { decorArt } from "./decor";
import { around, moveAllOps, readDragPrefs, saveDragPrefs, startFreeDrag, stepFreeDrag, type DragPrefs, type FreeDrag } from "./dragPlan";
import { bodyOf, boxBody, lockAxis, slotAt, turnedOf, type Body } from "./space";
import { alignOps, boxOf, clipboardLook, clipboardNodes, copyLook, copyNodes, distributeOps, groupOps, inBox, inTreeOrder, lockedOf, pasteLookOps, pasteOps, saveLocked, ungroupOps, withInside } from "./selection";
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
/** Boxes that can carry a pattern over their background. */
const PATTERNED = new Set(["section", "cell", "columns", "grid", "stack"]);
/** Tree elements whose words are written on the page itself (with a formatting bar). */
const WRITABLE = new Set(["heading", "text", "button"]);
/** Formatted words: a known tag that closes (the shop's pageTree/rich.ts). */
const RICH_TAG = /\[(b|i|u|mark|color=[^\]\s]+|link=[^\]\s]+)\][\s\S]*?\[\/(b|i|u|mark|color|link)\]/;
/** Elements whose words get the text panels in a state (a button and an icon get their colour there too). */
const WORDY_TYPES = new Set(["heading", "text"]);
const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;
/** What a marked piece is drawn as, for its look (the rest are boxes). */
const PART_KIND: Record<string, PagesAPI.LookKind> = {
  "card-image": "image", tile: "image", film: "video",
  "card-name": "text", "card-price": "text", "card-category": "text", category: "text", "closing-text": "text", cue: "text",
  handle: "button", "card-add": "button",
};
/** A field that names its language at its end (a scene's word: roseScenes.seasons.winter.title.en). */
const wordLang = (path: string) => /\.(ar|en|he)$/.test(path);
/**
 * Where a dragged element would land: the place, its index there, and the line to draw;
 * or (from the Add panel) beside a page item, or over a section or scene at a spot of it.
 */
/** A press on the canvas: what it grabbed (and the others selected with it), where they started, a free drag's state. */
type Down = { pointerId: number; p: Pt; pan: Pt; panning: boolean; touch: boolean; moved: boolean; y: number; grab: string | null; group: string[]; starts: Map<string, Box>; free?: FreeDrag; shown?: Pt; into?: { id: string; box: Box } | null };
/** What a freely placed element can be dragged into. */
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
  // The page a saved block was opened from (its "edit the block").
  const fromPage = new URLSearchParams(window.location.search).get("from");
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
  // Other elements selected with it (Shift+click, a box dragged on the page): the tree's own elements only.
  const [more, setMore] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  // Locked in the layers (kept in this browser for the page): clicks on the page go through them.
  const [locked, setLocked] = useState<Set<string>>(() => lockedOf(id));
  const [layerFind, setLayerFind] = useState("");
  // Lines a dragged element snaps to; Alt held shows the distances to what's under the pointer.
  const [guides, setGuides] = useState<Guide[]>([]);
  const [altHeld, setAltHeld] = useState(false);
  // Alt+arrow nudges add up (shown in the frame at once) and are saved together a moment after the last one.
  const nudging = useRef({ dx: 0, dy: 0, timer: 0 });
  // Which look the style panels change: the element's own, or its look with the mouse over it, focused or pressed.
  const [styleState, setStyleState] = useState<StateChoice>("normal");
  const [panMode, setPanMode] = useState(false);
  const [sheet, setSheet] = useState(false); // phones: the layers list as a sheet
  const [busy, setBusy] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  // Words being written in the frame: a field of an old section or scene, or a tree element's words.
  const [editing, setEditing] = useState<{ sectionId: string; path: string } | { nodeId: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePreview, setThemePreview] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [asking, setAsking] = useState<null | { kind: "delete"; nodeId: string; name: string; tree?: boolean } | { kind: "deleteMany"; ids: string[] } | { kind: "publish"; force: boolean } | { kind: "discard" } | { kind: "theme" } | { kind: "deleteBlock"; block: PagesAPI.BlockInfo }>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [resize, setResize] = useState<{ colsId: string; i: number; start: number[]; w12: number[] } | null>(null);
  const adding = useRef<AddKind | null>(null);
  // The left column: the Add panel or the layers; where a click on the Add panel adds.
  const [leftTab, setLeftTab] = useState<"add" | "layers" | "styles" | "looks">("add");
  // The ready look last put on the selected element from the Looks tab (marked there).
  const [lastLook, setLastLook] = useState<{ node: string; id: string } | null>(null);
  // The shared style open in the styles tab (its panels show beside the page instead of an element's).
  const [siteSel, setSiteSel] = useState<string | null>(null);
  const canPublish = useAuth().hasPermission("pages:publish");
  useEffect(() => setStyleState("normal"), [selected, siteSel]);
  // Picking an element on the page leaves the style that was open.
  useEffect(() => setSiteSel(null), [selected]);
  const [addWhere, setAddWhere] = useState<Where>("after");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  /** A picture or clip being chosen for something about to be added. */
  const [asked, setAsked] = useState<{ media: "image" | "video"; then: (url: string) => void } | null>(null);
  const [askedUrl, setAskedUrl] = useState("");
  // Motion in the frame: everything plays while "live"; after a motion change that element plays once.
  const [motionLive, setMotionLive] = useState(false);
  const [pageMotion, setPageMotion] = useState<MotionProfile>({});
  const liveRef = useRef(false);
  liveRef.current = motionLive;
  const playNext = useRef<string | null>(null);
  const [placing, setPlacing] = useState<{ id: string; box: Box; x: number; y: number } | null>(null);
  // A free drag (phase 9): how it behaves (kept in this browser), what it pushes, touches and lines up with, the place it'd go into.
  const [dragPrefs, setDragPrefs] = useState<DragPrefs>(readDragPrefs);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(readCanvasMode);
  const [scaleContents, setScaleContents] = useState(readScaleContents);
  const changeDragPrefs = (p: Partial<DragPrefs>) =>
    setDragPrefs((was) => {
      const next = { ...was, ...p };
      saveDragPrefs(next);
      return next;
    });
  const [dragView, setDragView] = useState<{ pushed: Array<{ id: string; box: Box }>; touching: string[]; marks: Gap[]; into: { id: string; box: Box } | null } | null>(null);
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
  const down = useRef<Down | null>(null);
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
      } else if (d.type === "nodeEdited" || d.type === "nodeCancelled") {
        const m = d as unknown as { nodeId: string; value?: string };
        setEditing(null);
        canvasRef.current?.focus({ preventScroll: true });
        if (d.type === "nodeEdited") onNodeEdited.current(m.nodeId, String(m.value ?? ""));
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
  const lockedIn = useMemo(() => (index ? withInside(index, locked) : new Set<string>()), [index, locked]);
  const grid = useMemo(() => new SpatialGrid(shapes.filter((x) => !lockedIn.has(x.id)), 64, { x: 0, y: 0, w: canvas.w, h: canvas.h }), [shapes, lockedIn, canvas.w, canvas.h]);
  const shapeOf = (sid: string | null) => (sid ? shapes.find((s) => s.id === sid) ?? null : null);
  const frameBox: Box = { x: pan.x, y: pan.y, w: dev.w * zoom, h: dev.h * zoom };

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const inFrame = (p: Pt) => p.x >= frameBox.x && p.x <= frameBox.x + frameBox.w && p.y >= frameBox.y && p.y <= frameBox.y + frameBox.h;
  const select = (sid: string | null, reveal = false) => {
    setSelected(sid);
    setMore([]);
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
  // The shared styles: each saved change reloads the frame, whose preview shows the draft.
  const ss = useSiteStyles(() => reload());
  const run = (label: string, ops: PagesAPI.PageDraftOp[], opts: { reload?: boolean; travel?: HistoryDirection } = {}) => {
    const next = queue.current.then(() => runNow(label, ops, opts));
    queue.current = next.catch(() => {});
    return next;
  };
  const runNow = async (label: string, ops: PagesAPI.PageDraftOp[], opts: { reload?: boolean; travel?: HistoryDirection }) => {
    const at = latest.current;
    if (!at) return false;
    const applied: PagesAPI.PageDraftOp[] = [];
    setBusy(true);
    try {
      const sendBatch = async (chunk: PagesAPI.PageDraftOp[], rev?: number) => (await PagesAPI.changePageDraft(id, chunk, rev)).draft;
      const onApplied = (draft: PagesAPI.PageDraft, chunk: PagesAPI.PageDraftOp[]) => {
        applied.push(...chunk);
        latest.current = draft;
        qc.setQueryData(["pages", id, "draft"], { draft, main });
      };
      if (opts.travel) {
        if (!(await travelDraftHistory(history.current, opts.travel, at, main, sendBatch, onApplied))) return false;
      } else {
        await sendDraftBatches(ops, at, sendBatch, onApplied);
        history.current.push({ label, ops, undo: undoOf(ops, at, main) });
      }
      if (opts.reload !== false) reload();
      return true;
    } catch (e) {
      // A later batch may fail after earlier ones were saved: those still have an undo.
      if (applied.length) {
        if (!opts.travel) history.current.push({ label, ops: applied, undo: undoOf(applied, at, main) });
        reload();
      }
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
  const undoLast = () => run("", [], { travel: "undo" });
  const redoLast = () => run("", [], { travel: "redo" });
  /** Back (negative) or forward through the history, one change at a time; stops at one that fails. */
  const stepHistory = async (n: number) => {
    setHistoryOpen(false);
    for (let i = 0; i < Math.abs(n); i++) {
      if (!(await run("", [], { travel: n < 0 ? "undo" : "redo" }))) break;
    }
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
  // A tree element's words written in place: saved in the language shown, as formatted words when they carry any.
  const onNodeEdited = useRef<(nodeId: string, value: string) => void>(() => {});
  onNodeEdited.current = (nodeId, value) => {
    const n = index?.nodes.get(nodeId)?.node;
    if (!n) return;
    const field = n.type === "button" ? "label" : "text";
    const words = { ...((n.props[field] ?? {}) as Record<string, string>) };
    if ((words[shopLang] ?? "") === value) return;
    if (value.trim()) words[shopLang] = value;
    else delete words[shopLang];
    const rich = Object.values(words).some((w) => RICH_TAG.test(w));
    void change(tr("الكلام", "The words"), [{ op: "setProps", nodeId, props: { ...n.props, [field]: words, rich: rich || undefined } }]);
  };
  /** Writing a heading's, text's or button's words on the page (with its formatting bar). */
  const startNodeText = (sid: string | null) => {
    const n = sid ? index?.nodes.get(sid)?.node : undefined;
    if (!n || !WRITABLE.has(n.type)) return false;
    setEditing({ nodeId: n.id });
    send({ type: "editNode", nodeId: n.id, lines: n.type === "text", linkable: n.type !== "button" });
    return true;
  };
  const startText = (sid: string | null) => {
    if (startNodeText(sid)) return true;
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
    if (d && d.pointerId !== e.pointerId) return;
    if (d) {
      if (Math.hypot(p.x - d.p.x, p.y - d.p.y) > 4) d.moved = true;
      if (d.grab && d.moved) {
        // Placed freely: it moves over its holder, meets what's beside it, or goes into another place.
        if (d.free) return moveFree(d, p, e);
        const n = nodeOf(d.grab);
        const t = n ? dropAt(p, n, d.group) : null;
        setDrop((was) => (was && t && was.parentId === t.parentId && was.index === t.index ? was : t));
        return;
      }
      if (d.panning) {
        setPan({ x: d.pan.x + p.x - d.p.x, y: d.pan.y + p.y - d.p.y });
        return;
      }
      if (d.moved && !d.grab && !d.touch && inFrame(d.p)) {
        setMarquee({ a: d.p, b: p });
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
    if (busy || editing || e.button > 1 || down.current && down.current.pointerId !== e.pointerId) return;
    const p = local(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const panning = e.button === 1 || panMode || !inFrame(p);
    const touch = e.pointerType === "touch";
    // Dragging a selected element (or from inside it) moves it, and the others selected with it; sections move in the layers. With Shift a box is drawn instead.
    const movable = (x: string | null) => Boolean(x && isFree(nodeOf(x)?.type) && !["section", "cell", "columns", "page"].includes(nodeOf(x)?.type ?? "") && !lockedIn.has(x) && (directGeometrySafe(x) || canvasMode === "flow" && !placedOn(nodeOf(x)!, screen)));
    const hit = !panning && !e.shiftKey && e.button === 0 ? pickAt(grid.near(p), p) : null;
    const path = hit && index ? pathTo(index, hit.id, up) : [];
    const grab = movable(selected) && path.includes(selected!) ? selected : chosen.length > 1 ? chosen.find((c) => movable(c) && path.includes(c)) ?? null : !touch && hit && movable(hit.id) ? hit.id : null;
    // What's inside another selected element goes with it.
    const group = grab && chosen.length > 1 && chosen.includes(grab) && index ? loose.filter((x) => movable(x) && !loose.some((y) => y !== x && pathTo(index, x, up).includes(y))) : grab ? [grab] : [];
    const starts = new Map(group.map((x) => [x, shapeOf(x)?.box] as const).filter((v): v is [string, Box] => Boolean(v[1])));
    if (grab && !chosen.includes(grab)) select(grab);
    if (grab && motionLive) { setMotionLive(false); send({ type: "motionLive", on: false }); }
    down.current = { pointerId: e.pointerId, p, pan, panning, touch, moved: false, y: p.y, grab, group, starts, free: grab ? freeDragOf(grab, group) : undefined };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = down.current;
    if (d && d.pointerId !== e.pointerId) return;
    down.current = null;
    if (marquee) {
      const picked = index ? inBox(boxOf(marquee.a, marquee.b), shapes, index, (x) => lockedIn.has(x)) : [];
      setMarquee(null);
      if (picked.length) {
        setSelected(picked[picked.length - 1]);
        setMore(e.shiftKey ? [...new Set([...chosen, ...picked.slice(0, -1)])] : picked.slice(0, -1));
      }
      return;
    }
    setGuides([]);
    if (d?.grab && d.moved) {
      // Returning to the original pointer position cancels the gesture. Taking a
      // flow child out can shift siblings under that point; don't reparent into
      // one of those siblings on a zero-distance release.
      if (d.free && Math.hypot(local(e).x - d.p.x, local(e).y - d.p.y) < 0.5) {
        unpreview(d);
        clearGeometry();
        setDrop(null); setPlacing(null); setDragView(null);
        return;
      }
      if (d.free) moveFree(d, local(e), e);
      const n = nodeOf(d.grab);
      const t = d.free ? null : (n ? dropAt(local(e), n, d.group) : null) ?? drop;
      setDrop(null);
      setPlacing(null);
      setDragView(null);
      // Alt as it's let go leaves the original where it was and puts a copy there.
      if (d.free) dropFree(d, e.altKey);
      else if (t) dropFlow(d, t, e.altKey);
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
    if (e.shiftKey && target && isFree(index.nodes.get(target)?.node.type)) return toggleChosen(target);
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
      // Delete takes the selected elements out (asking first), Ctrl/⌘+D copies them.
      if ((e.key === "Delete" || e.key === "Backspace") && loose.length) {
        e.preventDefault();
        if (loose.length > 1) setAsking({ kind: "deleteMany", ids: loose });
        else setAsking({ kind: "delete", nodeId: loose[0], name: label(loose[0]), tree: true });
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "d" && loose.length) {
        e.preventDefault();
        duplicateChosen();
        return;
      }
      // The clipboard: elements (Ctrl+C/X/V) and looks (Ctrl+Alt+C/V); grouping (Ctrl+G, Shift to undo it); all beside it (Ctrl+A).
      if (mod && e.altKey && (k === "c" || k === "v")) {
        e.preventDefault();
        if (k === "c") copyLookOf();
        else pasteLook();
        return;
      }
      if (mod && (k === "c" || k === "x") && chosen.length) {
        e.preventDefault();
        if (k === "c") copyChosen();
        else cutChosen();
        return;
      }
      if (mod && k === "v") {
        e.preventDefault();
        pasteHere();
        return;
      }
      if (mod && k === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupChosen();
        return;
      }
      if (mod && k === "a" && selected) {
        e.preventDefault();
        selectBeside();
        return;
      }
      if (e.key === "Escape") {
        if (down.current?.grab && down.current.moved) return cancelDrag();
        if (themeOpen) return setThemeOpen(false);
        if (more.length) return setMore([]);
        setSelected((s) => parentOf(s));
        return;
      }
      if (e.key === "Enter" && selected) {
        if (startText(selected)) return e.preventDefault();
        const first = index.nodes.get(selected)?.children[0];
        if (first) select(first, true);
        return;
      }
      if (e.key === "Alt") {
        e.preventDefault();
        setAltHeld(true);
        return;
      }
      if (e.altKey && e.key.startsWith("Arrow") && chosen.length) {
        // (Alt+Left would also go back a page in the browser.)
        e.preventDefault();
        const d = nudgeOf(e.key, e.shiftKey);
        if (d) nudgeBy(d);
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
      if (e.key === "Alt") setAltHeld(false);
      held.current.delete(e.key);
    };
    // Leaving the window with Alt down (Alt+Tab) never sends its key up.
    const onBlur = () => setAltHeld(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
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

  /* -------------------------------------- looks: parts of old sections and scenes */

  /** What's selected as a look's target (a field or marked piece of an old section or scene, or the whole of one). */
  const lookTarget: { target: string; kind: PagesAPI.LookKind } | null = (() => {
    const x = selExtra;
    // A scene's words are one look for every language (…title, not …title.en).
    if (x?.kind === "slot") return { target: `${x.owner}/${x.path.replace(/\.(ar|en|he)$/, "")}`, kind: x.edit === "media" ? (x.media === "video" ? "video" : "image") : x.link ? "button" : "text" };
    if (x?.kind === "part") return { target: `${x.owner}/@${x.name}`, kind: PART_KIND[x.name] ?? "box" };
    if (selSection) return { target: `s:${selSection.id}`, kind: "box" };
    if (selBlock) return { target: `b:${selBlock}`, kind: "box" };
    return null;
  })();
  const looks = looksOf(working);
  /** The look as a node, for the look and motion panels (their changes become setLookStyle/setLookMotion). */
  const lookSel: PagesAPI.PageTreeNode | null = lookTarget
    ? { id: `look:${lookTarget.target}`, type: { text: "text", button: "button", image: "image", video: "video", box: "section" }[lookTarget.kind], props: {}, style: looks[lookTarget.target]?.style, motion: looks[lookTarget.target]?.motion }
    : null;
  /**
   * The style panels for a state of `node` (mouse over, focused, pressed): they edit the
   * state's view and their changes go back inside each screen's look (states.ts).
   */
  const stateLooks = (node: PagesAPI.PageTreeNode, state: Exclude<StateChoice, "normal">, onOps: (label: string, ops: PagesAPI.PageDraftOp[]) => void, wordy: boolean) => {
    const view = stateView(node, state);
    const put = (label: string, ops: PagesAPI.PageDraftOp[]) => onOps(label, stateOps(node, state, ops));
    return (
      <div className="space-y-3" data-testid="studio-state-panels" data-state={state}>
        <StatePresets node={node} view={view} state={state} screen={screen} busy={busy} onOps={put} onOwn={onOps} />
        {node.type === "button" ? <ButtonStylePanel node={view} screen={screen} busy={busy} onOps={put} inState /> : null}
        {wordy || node.type === "button" || node.type === "icon" ? <TextStylePanel node={view} screen={screen} busy={busy} onOps={put} only={node.type === "button" ? ["weight", "letters"] : node.type === "icon" ? ["color"] : ["weight", "color", "letters"]} /> : null}
        {wordy ? <TypeMorePanel node={view} screen={screen} busy={busy} onOps={put} inState /> : null}
        <BoxPanel node={view} screen={screen} busy={busy} onOps={put} skip={node.type === "button" ? ["bg", "border", "radius"] : undefined} />
        <FiltersPanel node={view} screen={screen} busy={busy} onOps={put} />
        <LookPanel node={view} screen={screen} busy={busy} onOps={put} onPreview={() => undefined} limited={node.id.startsWith("look:")} inState />
        <TransitionPanel node={node} screen={screen} busy={busy} onOps={onOps} />
      </div>
    );
  };
  const lookChange = (label: string, ops: PagesAPI.PageDraftOp[]) => {
    if (!lookTarget) return;
    const mapped = ops.map((o): PagesAPI.PageDraftOp =>
      o.op === "setStyle" && o.nodeId.startsWith("look:")
        ? { op: "setLookStyle", target: o.nodeId.slice(5), kind: lookTarget.kind, screen: o.screen, style: o.style }
        : o.op === "setMotion" && o.nodeId.startsWith("look:")
          ? { op: "setLookMotion", target: o.nodeId.slice(5), kind: lookTarget.kind, motion: o.motion }
          : o,
    );
    void change(label, mapped);
  };
  /** A field's words in a language: a scene's word in its own field (…title.en), else that language's own. */
  const wordOf = (x: Extract<Extra, { kind: "slot" }>, l: Lang) => {
    const s = sectionOf(x.sectionId);
    const v = wordLang(x.path) ? getPath(s?.data, parsePath(x.path.replace(/\.(ar|en|he)$/, `.${l}`))) : ownValue(s, l, main, parsePath(x.path));
    return typeof v === "string" ? v : "";
  };
  const saveWord = (x: Extract<Extra, { kind: "slot" }>, l: Lang, v: string) => {
    const empty = !v.trim();
    if (wordLang(x.path)) return void setField(x.sectionId, parsePath(x.path.replace(/\.(ar|en|he)$/, `.${l}`)), empty ? null : v, main);
    void setField(x.sectionId, parsePath(x.path), empty ? null : v, l);
  };
  const canUndo = history.current.done.length > 0;
  const canRedo = history.current.undone.length > 0;
  const topAt = selected ? pageKids.findIndex((n) => n.id === selected) : -1;

  /* ------------------------------------------------- the tree's own elements */

  const screen: PagesAPI.TreeScreen = device === "tablet" ? "tablet" : device === "phone" ? "mobile" : "base";
  const makeIds = () => idMaker((x) => Boolean(index?.nodes.has(x)));
  const nodeOf = (sid: string | null | undefined) => (sid ? index?.nodes.get(sid)?.node : undefined);
  const selFree = selNode && isFree(selNode.node.type) ? selNode.node : undefined;
  // The frame shows the state being edited on the element (the editor's mouse never reaches the page), again after each reload.
  const siteOpen = leftTab === "styles" && siteSel ? styleOf(ss.styles, siteSel) : null;
  const stateTarget = styleState === "normal" ? "" : siteOpen ? `s:${siteOpen.kind}:${siteOpen.id}` : lookTarget && lookTarget.kind !== "box" ? `t:${lookTarget.target}` : selFree ? `n:${selFree.id}` : "";
  const frameReady = Boolean(layout);
  useEffect(() => {
    if (!frameReady) return;
    if (!stateTarget) send({ type: "previewState", state: null });
    else if (stateTarget.startsWith("s:")) {
      const [, kind, id] = stateTarget.split(":");
      send({ type: "previewState", state: styleState, style: { id, kind } });
    } else send({ type: "previewState", state: styleState, ...(stateTarget.startsWith("t:") ? { target: stateTarget.slice(2) } : { nodeId: stateTarget.slice(2) }) });
  }, [stateTarget, styleState, frameReady, send]);
  const selSiblings = selNode?.parentId ? index?.nodes.get(selNode.parentId)?.children ?? [] : [];
  const selPos = selected ? selSiblings.indexOf(selected) : -1;
  /** Sends changes; selects `then` once they're saved. */
  const change = async (label: string, ops: PagesAPI.PageDraftOp[], then?: string | null) => {
    if (!ops.length) return;
    if (!(await run(label, ops)) || then === undefined) return;
    setSelected(then);
    setMore([]);
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
    const made = makeNode(kind, shopLang, ids, src);
    // A new 3D model takes the store pack's finish, lights and floor.
    const node = made.type === "model3d" && storeKit ? { ...made, props: { ...made.props, finish: storeKit.model.finish, lights: { preset: storeKit.model.lights }, floor: storeKit.model.floor } } : made;
    addNode(node, where, anchor, spot, tr("إضافة", "Add"), ids);
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
  /** Where a page-level item goes: after the selection's own page-level item, else at the end. */
  const pageSpot = () => {
    const kids = index?.nodes.get(index.root)?.children ?? [];
    let at = selected;
    while (at && index?.nodes.get(at)?.parentId && index.nodes.get(at)!.parentId !== index.root) at = index.nodes.get(at)!.parentId;
    const i = at ? kids.indexOf(at) : -1;
    return i >= 0 ? i + 1 : kids.length;
  };
  /** A block's published sections as copies of their own (new ids), to place on this page. */
  const blockCopies = async (blockId: string) => {
    const { tree } = await PagesAPI.getPageTree(blockId);
    const ids = makeIds();
    return (tree.root.children ?? []).filter((n) => n.type === "section").map((n) => copyOf(n, ids));
  };
  const saveBlock = async (section: PagesAPI.PageTreeNode, name: string, link: boolean) => {
    try {
      const block = await PagesAPI.createBlock(name, [section]);
      void qc.invalidateQueries({ queryKey: ["page-blocks"] });
      toast.success(tr("انحفظ البلوك", "The block was saved"));
      if (!link || !index) return;
      const at = index.nodes.get(index.root)?.children.indexOf(section.id) ?? -1;
      const linkNode: PagesAPI.PageTreeNode = { id: makeIds()("blk"), type: "block", props: { blockId: block.id } };
      void change(tr("ربط البلوك", "Link the block"), [{ op: "insert", parentId: index.root, index: Math.max(0, at), node: linkNode }, { op: "remove", nodeId: section.id }], linkNode.id);
    } catch (e) {
      toast.error(tr("ما انحفظ البلوك", "The block wasn't saved"), { description: getApiErrorMessage(e) });
    }
  };
  const addBlock = async (b: PagesAPI.BlockInfo, linked: boolean) => {
    if (!index) return;
    const at = pageSpot();
    if (linked) {
      const linkNode: PagesAPI.PageTreeNode = { id: makeIds()("blk"), type: "block", props: { blockId: b.id } };
      return void change(tr("بلوك مربوط", "Linked block"), [{ op: "insert", parentId: index.root, index: at, node: linkNode }], linkNode.id);
    }
    try {
      const copies = await blockCopies(b.id);
      if (copies.length) void change(tr("نسخة من بلوك", "A copy of a block"), copies.map((node, i) => ({ op: "insert" as const, parentId: index.root, index: at + i, node })), copies[0].id);
    } catch (e) {
      toast.error(tr("ما قدرنا نجيب البلوك", "Couldn't get the block"), { description: getApiErrorMessage(e) });
    }
  };
  /** A linked block becomes copies of its sections here, changed on their own. */
  const unlinkBlock = async (linkNode: PagesAPI.PageTreeNode) => {
    if (!index) return;
    try {
      const copies = await blockCopies(String(linkNode.props.blockId));
      const at = index.nodes.get(index.root)?.children.indexOf(linkNode.id) ?? -1;
      if (at < 0) return;
      void change(tr("فكّ ربط البلوك", "Unlink the block"), [...copies.map((node, i) => ({ op: "insert" as const, parentId: index.root, index: at + i, node })), { op: "remove", nodeId: linkNode.id }], copies[0]?.id);
    } catch (e) {
      toast.error(tr("ما قدرنا نجيب البلوك", "Couldn't get the block"), { description: getApiErrorMessage(e) });
    }
  };
  /** Every selected element of the tree (the main one last), and those that can be copied or deleted (not cells). */
  const chosen = [...new Set([...more, ...(selected ? [selected] : [])])].filter((x) => isFree(index?.nodes.get(x)?.node.type));
  const loose = chosen.filter((x) => nodeOf(x)?.type !== "cell");
  const multi = chosen.length > 1;
  const rtl = layout?.dir === "rtl";
  /** Shift+click: adds an element to the selection, or takes it out. */
  const toggleChosen = (x: string) => {
    if (chosen.includes(x)) {
      const rest = chosen.filter((c) => c !== x);
      setSelected(rest.at(-1) ?? null);
      setMore(rest.slice(0, -1));
    } else {
      setMore(chosen);
      setSelected(x);
    }
  };
  /** Ctrl+A: everything beside the selected element (in the same place). */
  const selectBeside = () => {
    const parent = selected ? index?.nodes.get(selected)?.parentId : null;
    const all = parent ? (index!.nodes.get(parent)!.children.filter((c) => isFree(index!.nodes.get(c)?.node.type))) : [];
    if (all.length < 2) return;
    setSelected(all[all.length - 1]);
    setMore(all.slice(0, -1));
  };
  /** Every element of the page like the selected one (same kind). */
  const selectSimilar = () => {
    const type = selFree?.type;
    if (!index || !type) return;
    const all = inTreeOrder(index, [...index.nodes.values()].filter((n) => n.node.type === type).map((n) => n.node.id));
    setSelected(all[all.length - 1] ?? null);
    setMore(all.slice(0, -1));
  };
  const copyChosen = () => {
    if (!index || !loose.length) return;
    if (copyNodes(inTreeOrder(index, loose).map((x) => nodeOf(x)!))) toast.success(loose.length > 1 ? tr(`انسخوا ${loose.length}`, "{0} copied", [loose.length]) : tr("انسخ", "Copied"));
  };
  const cutChosen = () => {
    if (!loose.length) return;
    copyChosen();
    void change(tr("قص", "Cut"), loose.map((x): PagesAPI.PageDraftOp => ({ op: "remove", nodeId: x })), null);
  };
  const pasteHere = () => {
    if (!index) return;
    const nodes = clipboardNodes();
    if (!nodes.length) return void toast.error(tr("ما في إشي منسوخ", "Nothing is copied"));
    const plan = pasteOps(index, selected && index.nodes.has(selected) ? selected : null, nodes, makeIds());
    if (plan) void change(tr("لصق", "Paste"), plan.ops, plan.first);
  };
  /** Each selected element copied right after itself (the last ones first, so places stay right). */
  const duplicateChosen = () => {
    if (!index || !loose.length) return;
    const ids = makeIds();
    const ops: PagesAPI.PageDraftOp[] = [];
    for (const x of inTreeOrder(index, loose).reverse()) {
      const at = index.nodes.get(x);
      if (!at?.parentId) continue;
      ops.push({ op: "insert", parentId: at.parentId, index: index.nodes.get(at.parentId)!.children.indexOf(x) + 1, node: copyOf(at.node, ids) });
    }
    const last = ops[0];
    void change(tr("نسخة", "Copy"), ops, last && last.op === "insert" ? last.node.id : null);
  };
  const copyLookOf = () => {
    const n = nodeOf(selected);
    if (n && isFree(n.type) && copyLook(n)) toast.success(tr("انسخ الشكل", "The look was copied"));
  };
  const pasteLook = () => {
    const look = clipboardLook();
    if (!look) return void toast.error(tr("ما في شكل منسوخ", "No look is copied"));
    if (chosen.length) void change(tr("لصق الشكل", "Paste the look"), chosen.flatMap((x) => pasteLookOps(nodeOf(x)!, look)));
  };
  const groupChosen = () => {
    const g = index ? groupOps(index, chosen, makeIds()) : null;
    if (g) void change(tr("تجميع", "Group"), g.ops, g.group);
  };
  const ungroupSelected = () => {
    const ops = index && selected ? ungroupOps(index, selected) : null;
    if (ops) void change(tr("فك التجميع", "Ungroup"), ops, index!.nodes.get(selected!)?.children[0] ?? null);
  };
  const toggleLock = (x: string) => {
    const next = new Set(locked);
    if (next.has(x)) next.delete(x);
    else next.add(x);
    setLocked(next);
    saveLocked(id, next);
  };
  /** Hidden on the screen shown (and the smaller ones that follow it), or shown again there. */
  const hiddenHere = (x: string) => {
    const n = nodeOf(x);
    return Boolean(n && shownLook(n, screen, "hidden") === true);
  };
  const toggleHidden = (x: string) => {
    const n = nodeOf(x);
    if (!n || !isFree(n.type)) return;
    const hide = !hiddenHere(x);
    void change(hide ? tr("إخفاء", "Hide") : tr("إظهار", "Show"), [styleOp(n, screen, { hidden: hide ? true : screen === "base" ? null : false })]);
  };
  const rename = (x: string, name: string) => void change(tr("اسم", "Name"), [{ op: "setName", nodeId: x, name: name.trim() || null }]);
  const placedItems = () =>
    chosen.flatMap((x) => {
      const node = nodeOf(x);
      const box = shapeOf(x)?.box;
      const holder = holderOf(x);
      return node && box && holder ? [{ node, box, holder }] : [];
    });
  const allPlaced = multi && chosen.every((x) => Boolean(placedOn(nodeOf(x)!, screen)));
  const multiActions: MultiActions = {
    onDelete: () => setAsking({ kind: "deleteMany", ids: loose }),
    onDuplicate: duplicateChosen,
    onCopy: copyChosen,
    onGroup: index && groupOps(index, chosen, (x) => `__${x}`) ? groupChosen : null,
    onAlign: allPlaced ? (how) => void change(tr("صفّ", "Line up"), alignOps(placedItems(), how, screen, rtl)) : null,
    onDistribute: allPlaced && chosen.length >= 3 ? (across) => void change(tr("مسافات متساوية", "Even gaps"), distributeOps(placedItems(), across, screen, rtl)) : null,
    onSelf: (self) => void change(tr("وين بيقعدوا", "Where they sit"), chosen.map((x) => styleOp(nodeOf(x)!, screen, { self }))),
    onSameWidth: () => {
      const first = shapeOf(chosen[0]);
      if (first) void change(tr("نفس العرض", "Same width"), chosen.slice(1).map((x) => styleOp(nodeOf(x)!, screen, { width: `${Math.round(first.box.w / zoom)}px` })));
    },
    onSameLook: () => {
      const first = nodeOf(chosen[0]);
      if (first) void change(tr("نفس الشكل", "Same look"), chosen.slice(1).flatMap((x) => pasteLookOps(nodeOf(x)!, { v: 1, style: first.style, motion: first.motion, type: first.type })));
    },
    onClear: () => setMore([]),
  };
  /** The right-click menu for what's selected. */
  const menuItems = (): MenuItem[] => {
    const one = selected && isFree(nodeOf(selected)?.type) ? selected : null;
    const kind = nodeOf(selected)?.type;
    return [
      { label: tr("نسخ", "Copy"), keys: "Ctrl+C", onClick: copyChosen, disabled: !loose.length },
      { label: tr("قص", "Cut"), keys: "Ctrl+X", onClick: cutChosen, disabled: !loose.length },
      { label: tr("لصق", "Paste"), keys: "Ctrl+V", onClick: pasteHere, disabled: !clipboardNodes().length },
      { label: tr("نسخة هون", "Duplicate"), keys: "Ctrl+D", onClick: duplicateChosen, disabled: !loose.length },
      "line",
      { label: tr("نسخ الشكل", "Copy the look"), keys: "Ctrl+Alt+C", onClick: copyLookOf, disabled: !one },
      { label: tr("لصق الشكل", "Paste the look"), keys: "Ctrl+Alt+V", onClick: pasteLook, disabled: !chosen.length || !clipboardLook() },
      "line",
      { label: tr("جمّعهم", "Group them"), keys: "Ctrl+G", onClick: groupChosen, disabled: !(index && groupOps(index, chosen, (x) => `__${x}`)) },
      { label: tr("فك التجميع", "Ungroup"), keys: "Ctrl+Shift+G", onClick: ungroupSelected, disabled: !(index && selected && ungroupOps(index, selected)) },
      { label: tr("حدد الأب", "Select the parent"), keys: "Esc", onClick: () => select(parentOf(selected), true), disabled: !parentOf(selected) },
      { label: tr("حدد كل اللي متله", "Select all like it"), onClick: selectSimilar, disabled: !one },
      { label: tr("حدد اللي جنبه", "Select those beside it"), keys: "Ctrl+A", onClick: selectBeside, disabled: !one },
      "line",
      { label: one && locked.has(one) ? tr("فك القفل", "Unlock") : tr("اقفل (ما بينختار بالكبس)", "Lock (clicks pass through)"), onClick: () => one && toggleLock(one), disabled: !one || kind === "cell" },
      { label: one && hiddenHere(one) ? tr("أظهره على هالشاشة", "Show it on this screen") : tr("خبّيه على هالشاشة", "Hide it on this screen"), onClick: () => one && toggleHidden(one), disabled: !one },
      "line",
      { label: multi ? tr(`احذف ${loose.length}`, "Delete {0}", [loose.length]) : tr("احذف", "Delete"), keys: "Del", danger: true, onClick: () => (loose.length > 1 ? setAsking({ kind: "deleteMany", ids: loose }) : loose[0] && setAsking({ kind: "delete", nodeId: loose[0], name: label(loose[0]), tree: true })), disabled: !loose.length },
    ];
  };
  /** Alt+arrow: the selected elements move by a pixel (Shift: ten), freely placed ones over their container. */
  const nudgeBy = (d: Pt) => {
    const targets = chosen;
    const nz = nudging.current;
    nz.dx += d.x;
    nz.dy += d.y;
    for (const x of targets) {
      const n = nodeOf(x);
      if (!n) continue;
      const bx = Number(shownLook(n, screen, "moveX") ?? 0);
      const by = Number(shownLook(n, screen, "moveY") ?? 0);
      send({ type: "previewLook", nodeId: x, vars: { "--pt-x": `${bx + nz.dx}px`, "--pt-y": `${by + nz.dy}px` } });
    }
    window.clearTimeout(nz.timer);
    nz.timer = window.setTimeout(() => {
      const { dx, dy } = nudging.current;
      nudging.current = { dx: 0, dy: 0, timer: 0 };
      const round = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
      const within = (v: number) => Math.max(-1000, Math.min(1000, v));
      const ops = targets.flatMap((x): PagesAPI.PageDraftOp[] => {
        const n = nodeOf(x);
        if (!n) return [];
        const place = placedOn(n, screen);
        const holder = holderOf(x);
        if (place && holder) {
          const w = holder.w / zoom;
          const h = holder.h / zoom;
          return [styleOp(n, screen, { layer: { ...place, x: round(place.x + (dx / w) * 100 * (rtl ? -1 : 1)), y: round(place.y + (dy / h) * 100) } })];
        }
        const mx = within(Number(shownLook(n, screen, "moveX") ?? 0) + dx);
        const my = within(Number(shownLook(n, screen, "moveY") ?? 0) + dy);
        return [styleOp(n, screen, { moveX: mx || null, moveY: my || null })];
      });
      void change(tr("تحريك", "Nudge"), ops);
    }, 450);
  };
  const copySelected = () => {
    if (!selFree || !selNode?.parentId) return;
    const copy = copyOf(selFree, makeIds());
    void change(tr("نسخة", "Copy"), [{ op: "insert", parentId: selNode.parentId, index: selPos + 1, node: copy }], copy.id);
  };

  /**
   * The place under the pointer that takes `node` (and the others dragged with it, `group`), and
   * where among what it holds: the pointer projected onto its rows (space.ts slotAt), so a wrapping
   * grid works by row and then along it. The index is counted without what's dragged.
   */
  const dropAt = (p: Pt, node: PagesAPI.PageTreeNode, group: string[] = [node.id]): Drop | null => {
    if (!index || !inFrame(p)) return null;
    const dragged = new Set([node.id, ...group]);
    const nodes = [...dragged].map((x) => index.nodes.get(x)?.node).filter((x): x is PagesAPI.PageTreeNode => Boolean(x));
    const hit = pickAt(grid.near(p).filter((x) => !dragged.has(x.id)), p);
    for (let at: string | null = hit?.inside ? hit.id : null; at && at !== index.root; at = index.nodes.get(at)?.parentId ?? up.get(at) ?? null) {
      const box = shapeOf(at)?.box;
      // Over an old section or a scene, things are placed freely (dropFor), not in a row.
      const kind = index.nodes.get(at)?.node.type;
      if (!box || kind === "legacy" || kind === "roseBlock" || !index.nodes.has(at) || !nodes.every((n) => canHold(index, at!, n))) continue;
      const kids = index.nodes.get(at)!.children.filter((c) => !dragged.has(c));
      // What's placed freely isn't in the rows.
      const inRows = kids.map((c) => ({ c, b: shapeOf(c)?.box, n: index.nodes.get(c)?.node })).filter((x): x is { c: string; b: Box; n: PagesAPI.PageTreeNode } => Boolean(x.b && x.b.w > 0 && x.b.h > 0 && x.n && !placedOn(x.n, screen)));
      const slot = slotAt(p, inRows.map((x) => x.b), holdsOf(at) ?? box, rtl);
      const i = slot.index >= inRows.length ? kids.length : kids.indexOf(inRows[slot.index].c);
      return { parentId: at, index: i, line: slot.line, box };
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

  /* ------------------------------------------------- dragging (phase 9) */

  const itemOf = (sid: string) => {
    const it = layout?.items.find((i) => i.kind === "node" && i.id === sid);
    return it && it.kind === "node" ? it : null;
  };
  /** Where what a place holds sits, on the canvas: a section's inner box, else its own. */
  const holdsOf = (sid: string): Box | null => {
    const it = itemOf(sid);
    return it?.inner && layout ? toScreen(it.inner, layout.scroll, pan, zoom) : shapeOf(sid)?.box ?? null;
  };
  /** An element's own size before its turn and scale, on the screen (a shop that measures it). */
  const sizeOf = (sid: string) => {
    const it = itemOf(sid);
    return it?.size ? { w: it.size.w * zoom, h: it.size.h * zoom } : null;
  };
  const parentScaleOf = (sid: string) => itemOf(sid)?.parentScale ?? 1;
  const holderScaleOf = (sid: string) => {
    const it = itemOf(sid);
    if (it?.innerScale === null || it?.parentScale === null) return null;
    return it?.innerScale ?? parentScaleOf(sid) * Number(shownLook(nodeOf(sid)!, screen, "scale") ?? 1);
  };
  const directGeometrySafe = (sid: string) => {
    const n = nodeOf(sid);
    return Boolean(n && itemOf(sid)?.parentScale !== null && !Number(shownLook(n, screen, "rotateX") ?? 0) && !Number(shownLook(n, screen, "rotateY") ?? 0));
  };
  const clearGeometry = () => send({ type: "previewGeometry", nodes: null });
  const pinHolder = (parentId: string): PagesAPI.PageDraftOp[] => {
    const parent = nodeOf(parentId), size = sizeOf(parentId);
    return parent && size && isFree(parent.type) ? [styleOp(parent, screen, { minHeight: `${Math.min(9999, Math.ceil(size.h / zoom))}px` })] : [];
  };
  const previewGeometry = (ops: PagesAPI.PageDraftOp[]) => {
    const nodes = ops.flatMap(op => {
      if (op.op !== "setStyle" || !op.style) return [];
      const node = nodeOf(op.nodeId);
      return node ? [{ id: node.id, type: node.type, props: {}, style: { base: { ...effectiveLook(node, screen), ...op.style } } }] : [];
    });
    send({ type: "previewGeometry", nodes });
  };
  const resizeOps = (node: PagesAPI.PageTreeNode, w: number | null, h: number | null, change: ResizeChange) => {
    const parentId = index?.nodes.get(node.id)?.parentId;
    const holder = holderOf(node.id) ?? (parentId ? holdsOf(parentId) : null);
    const size = sizeOf(node.id) ?? { w: change.start.w, h: change.start.h };
    const group = scaleContents && Boolean(node.children?.length) && change.frame;
    // Group scaling preserves its original layout context, including auto and %
    // dimensions. Only ordinary frame resizing converts flow to free placement.
    const free = Boolean(placedOn(node, screen)) || !group && canvasMode === "free";
    const patch = group
      ? scaleContentsPatch(node, screen, change.start, change.box, size, group.current.w / group.start.w, zoom, parentScaleOf(node.id))
      : resizePatch(node, screen, change.start, change.box, size, w, h, holder, zoom, rtl, free, parentScaleOf(node.id));
    return patch ? [...(free && !placedOn(node, screen) && parentId ? pinHolder(parentId) : []), styleOp(node, screen, patch)] : [];
  };
  const lookNum = (n: PagesAPI.PageTreeNode, key: string, or: number) => {
    const v = Number(shownLook(n, screen, key));
    return Number.isFinite(v) ? v : or;
  };
  /** An element as what collides: its box turned by its own turn, cut to its shape. */
  const bodyFor = (sid: string): Body | null => {
    const s = shapeOf(sid);
    const n = nodeOf(sid);
    if (!s || !n) return null;
    const k = lookNum(n, "scale", 1) * parentScaleOf(sid);
    const size = sizeOf(sid);
    const shape = shownLook(n, screen, "shape");
    return bodyOf(turnedOf(s.box, lookNum(n, "rotateZ", 0), size ? { w: size.w * k, h: size.h * k } : null), typeof shape === "string" ? shape : null);
  };
  /** The box the shop places a freely placed element by, from where it's seen (less its own move, at its own size). */
  const placeBoxOf = (sid: string, seen: Box) => {
    const n = nodeOf(sid);
    const size = sizeOf(sid);
    return n && size ? placementBox(n, screen, seen, size, zoom, parentScaleOf(sid)) ?? seen : seen;
  };
  /** The frame shows an element moved by `by` (screen pixels) on top of its own move, before anything is saved. */
  const previewMove = (sid: string, by: Pt) => {
    const n = nodeOf(sid);
    if (!n) return;
    const r = (v: number) => Math.round(Math.max(-9999, Math.min(9999, v)) * 10) / 10;
    const unit = zoom * parentScaleOf(sid);
    send({ type: "previewLook", nodeId: sid, vars: { "--pt-x": `${r(lookNum(n, "moveX", 0) + by.x / unit)}px`, "--pt-y": `${r(lookNum(n, "moveY", 0) + by.y / unit)}px` } });
  };
  /** A drag of what's placed freely: the grabbed one and those selected with it in the same holder, and what's beside them. */
  const freeDragOf = (grab: string, group: string[]): FreeDrag | undefined => {
    const n = nodeOf(grab);
    const parentId = index?.nodes.get(grab)?.parentId;
    const holder = holderOf(grab) ?? (canvasMode === "free" && parentId ? holdsOf(parentId) : null);
    const own = shapeOf(grab);
    if (!n || !holder || !own || !directGeometrySafe(grab) || !placedOn(n, screen) && canvasMode !== "free") return undefined;
    const ids = group.filter((x) => {
      const m = nodeOf(x);
      return Boolean(m && directGeometrySafe(x) && (canvasMode === "free" || placedOn(m, screen)) && shapeOf(x)?.parentId === own.parentId);
    });
    const start = ids.length > 1 ? around(ids.map((x) => shapeOf(x)!.box)) : own.box;
    const body = ids.length > 1 ? boxBody(start) : bodyFor(grab) ?? boxBody(start);
    const beside = shapes
      .filter((x) => x.parentId === own.parentId && !ids.includes(x.id) && x.box.w > 0 && x.box.h > 0 && index?.nodes.has(x.id))
      .map((x) => {
        const m = nodeOf(x.id);
        return { id: x.id, box: x.box, body: bodyFor(x.id) ?? boxBody(x.box), push: Boolean(m && directGeometrySafe(x.id) && isFree(m.type) && placedOn(m, screen) && !lockedIn.has(x.id)) };
      });
    return startFreeDrag(ids.length ? ids : [grab], start, body, holder, beside);
  };
  /** Out of its holder, over another place that takes what's dragged: that place, and the box it'd be placed in. */
  const intoAt = (p: Pt, f: FreeDrag): { id: string; box: Box } | null => {
    if (!index || !inFrame(p)) return null;
    const target = pickCanvasContainer(index, grid.near(p), p, f.ids, index.nodes.get(f.ids[0])?.parentId ?? null, lockedIn);
    if (!target || holderScaleOf(target) === null) return null;
    const kid = index.nodes.get(target)!.children.find(c => nodeOf(c) && placedOn(nodeOf(c)!, screen) && holderOf(c));
    const box = (kid ? holderOf(kid) : null) ?? holdsOf(target);
    const scale = holderScaleOf(target)!;
    const fits = box && f.ids.every(id => {
      const node = nodeOf(id), size = sizeOf(id), shape = shapeOf(id);
      return node && size && shape && transferPatch(node, screen, shape.box, box, size, zoom, rtl, parentScaleOf(id), scale);
    });
    return box && fits ? { id: target, box } : null;
  };
  /** One step of a free drag: snapped, stopped or pushing, kept inside, or over another place it'd go into. */
  const moveFree = (d: Down, p: Pt, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    const f = d.free!;
    const n = nodeOf(d.grab);
    const start = d.grab ? d.starts.get(d.grab) : undefined;
    if (!n || !start) return;
    const into = intoAt(p, f);
    let by: Pt;
    if (into) {
      // Going into another place: it follows the pointer, and what it pushed goes back.
      const raw = { x: p.x - d.p.x, y: p.y - d.p.y };
      by = e.shiftKey ? lockAxis(raw) : raw;
      setGuides([]);
      setDragView({ pushed: [], touching: [], marks: [], into });
      for (const x of f.pushed.keys()) previewMove(x, { x: 0, y: 0 });
    } else {
      const step = stepFreeDrag(f, { x: p.x - d.p.x, y: p.y - d.p.y }, { straight: e.shiftKey, loose: e.ctrlKey || e.metaKey }, dragPrefs);
      by = step.d;
      setGuides(step.guides);
      setDragView({
        pushed: [...step.pushed]
          .filter(([, v]) => Math.hypot(v.x, v.y) > 0.5)
          .map(([id, v]) => {
            const b = f.beside.find((x) => x.id === id)!.box;
            return { id, box: { ...b, x: b.x + v.x, y: b.y + v.y } };
          }),
        touching: step.touching,
        marks: step.marks,
        into: null,
      });
      for (const [x, v] of step.pushed) previewMove(x, v);
    }
    d.shown = by;
    d.into = into;
    const lead = { ...start, x: start.x + by.x, y: start.y + by.y };
    const box = f.ids.length > 1 ? { ...f.start, x: f.start.x + by.x, y: f.start.y + by.y } : lead;
    setPlacing({ id: n.id, box, ...placeFor(placeBoxOf(n.id, lead), into?.box ?? f.holder, placedOn(n, screen)?.anchor ?? "center", rtl) });
    const preview: PagesAPI.PageDraftOp[] = [];
    for (const x of f.ids) {
      const moving = nodeOf(x), startBox = d.starts.get(x), measured = sizeOf(x);
      if (!moving || !startBox || !measured) continue;
      const parentId = index?.nodes.get(x)?.parentId;
      if (!placedOn(moving, screen) && parentId) preview.push(...pinHolder(parentId));
      const seen = into ? startBox : { ...startBox, x: startBox.x + by.x, y: startBox.y + by.y };
      const patch = placementPatch(moving, screen, seen, f.holder, measured, zoom, rtl, !placedOn(moving, screen), parentScaleOf(x));
      if (patch) preview.push(styleOp(moving, screen, patch));
      previewMove(x, into ? by : { x: 0, y: 0 });
    }
    previewGeometry(preview);
  };
  /** A drag let go of or given up: the frame shows things where they are again. */
  const unpreview = (d: Down) => {
    for (const x of [...(d.free?.ids ?? []), ...(d.free?.pushed.keys() ?? [])]) previewMove(x, { x: 0, y: 0 });
  };
  const cancelDrag = () => {
    const d = down.current;
    down.current = null;
    if (d) unpreview(d);
    clearGeometry();
    setDrop(null);
    setPlacing(null);
    setDragView(null);
    setGuides([]);
  };
  /**
   * Lets go of a free drag: each one's place saved for this screen (in its new place when it went
   * into one, its coordinates turned into that place's), and where what it pushed went. With
   * `copy` the originals stay and copies go there. One step to undo.
   */
  const dropFree = (d: Down, copy: boolean) => {
    const f = d.free!;
    const by = d.shown ?? { x: 0, y: 0 };
    const into = d.into ?? null;
    if (!index || (!into && Math.hypot(by.x, by.y) < 0.5)) { clearGeometry(); return unpreview(d); }
    const ids = makeIds();
    const ops: PagesAPI.PageDraftOp[] = [];
    const holder = into?.box ?? f.holder;
    const order = inTreeOrder(index, f.ids);
    let first: string | null = null;
    let added = 0;
    // Copies beside their originals go in from the last, so the places counted stay right.
    for (const x of copy && !into ? [...order].reverse() : order) {
      const n = nodeOf(x);
      const s = d.starts.get(x);
      const was = n ? placedOn(n, screen) : null;
      const parentId = index.nodes.get(x)?.parentId;
      if (!n || !s || !parentId) continue;
      const measured = sizeOf(x) ?? { w: s.w, h: s.h };
      const sourceScale = parentScaleOf(x), targetScale = into ? holderScaleOf(into.id) ?? sourceScale : sourceScale;
      const seen = { ...s, x: s.x + by.x, y: s.y + by.y };
      const patch = into ? transferPatch(n, screen, seen, holder, measured, zoom, rtl, sourceScale, targetScale) : placementPatch(n, screen, seen, holder, measured, zoom, rtl, !was, sourceScale);
      if (!patch) continue;
      if (!was) ops.push(...pinHolder(parentId));
      if (copy) {
        const c = copyOf(n, ids);
        const style = (c.style ?? {}) as Record<string, Record<string, unknown> | undefined>;
        const node = { ...c, style: { ...style, [screen]: { ...(style[screen] ?? {}), ...patch } } } as PagesAPI.PageTreeNode;
        const at = into ? index.nodes.get(into.id)!.children.length + added++ : index.nodes.get(parentId)!.children.indexOf(x) + 1;
        ops.push({ op: "insert", parentId: into?.id ?? parentId, index: at, node });
        first ??= c.id;
      } else {
        if (into) ops.push({ op: "move", nodeId: x, parentId: into.id, index: index.nodes.get(into.id)!.children.length + added++ });
        ops.push(styleOp(n, screen, patch));
      }
    }
    // What it pushed stays where it went (not when it went into another place).
    if (!into)
      for (const [x, v] of f.pushed) {
        const n = nodeOf(x);
        const was = n ? placedOn(n, screen) : null;
        const b = f.beside.find((y) => y.id === x)?.box;
        if (!n || !was || !b || Math.hypot(v.x, v.y) < 0.5) continue;
        ops.push(styleOp(n, screen, { layer: { ...was, ...placeFor(placeBoxOf(x, { ...b, x: b.x + v.x, y: b.y + v.y }), f.holder, was.anchor ?? "center", rtl) } }));
      }
    if (!ops.length) { clearGeometry(); return unpreview(d); }
    void change(copy ? tr("نسخة", "Copy") : into ? tr("نقل لجوّا", "Move into") : tr("المكان", "Place"), ops, first ?? undefined).finally(() => { unpreview(d); clearGeometry(); });
  };
  /** Lets go in the flow: what's dragged (with what's selected with it) goes to the place shown, or a copy of it with `copy`. */
  const dropFlow = (d: Down, t: Drop, copy: boolean) => {
    if (!index) return;
    const moving = inTreeOrder(index, d.group.filter((x) => index.nodes.has(x) && canHold(index, t.parentId, nodeOf(x)!)));
    if (!moving.length) return;
    if (copy) {
      // t.index is counted without what's dragged; the originals stay, so it's counted with them here.
      const kids = index.nodes.get(t.parentId)?.children ?? [];
      const without = kids.filter((c) => !moving.includes(c));
      const before = t.index > 0 ? without[Math.min(t.index, without.length) - 1] : null;
      const at = before ? kids.indexOf(before) + 1 : 0;
      const ids = makeIds();
      const copies = moving.map((x) => copyOf(nodeOf(x)!, ids));
      return void change(tr("نسخة", "Copy"), copies.map((node, i) => ({ op: "insert" as const, parentId: t.parentId, index: at + i, node })), copies[0].id);
    }
    if (moving.length === 1) return moveTo(moving[0], t);
    const ops = moveAllOps((x) => index.nodes.get(x)?.children ?? [], (x) => index.nodes.get(x)?.parentId ?? null, moving, t);
    if (ops.length) void change(tr("نقل", "Move"), ops, d.grab);
  };
  const toggleLive = () => {
    const on = !motionLive;
    setMotionLive(on);
    send({ type: "motionLive", on });
  };

  const dragged = useRef<string | null>(null);

  /** A shared style's panels: like an element's, with its states and screens; each change saves the styles' draft. */
  const siteInspector = () => {
    const s = siteOpen;
    if (!s) return null;
    const vnode = styleNode(s);
    const onOps = (_label: string, ops: PagesAPI.PageDraftOp[]) => void ss.save(withOps(ss.styles, s.id, ops));
    const wordy = vnode.type === "heading" || vnode.type === "text";
    return (
      <div className="space-y-3" data-testid="studio-site-editor" data-style={s.id}>
        <SiteStyleHead s={s} ss={ss} onGone={() => setSiteSel(null)} />
        <StatesBar node={vnode} state={styleState} onState={setStyleState} />
        {styleState !== "normal" ? (
          stateLooks(vnode, styleState, onOps, wordy)
        ) : (
          <>
            {wordy ? <TextStylePanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} /> : null}
            {wordy ? <TypeMorePanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} /> : null}
            {vnode.type === "button" ? (
              <>
                <ButtonStylePanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} />
                <TextStylePanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} only={["font", "size", "weight", "letters"]} />
              </>
            ) : null}
            <BoxPanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} skip={vnode.type === "button" ? ["bg", "border", "radius"] : undefined} />
            {vnode.type === "section" ? <PadPanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} /> : null}
            <FiltersPanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} />
            <LookPanel node={vnode} screen={screen} busy={ss.busy} limited onOps={onOps} onPreview={() => undefined} />
          </>
        )}
      </div>
    );
  };
  const inspector = () => {
    if (leftTab === "styles" && siteOpen) return siteInspector();
    if (themeOpen) {
      return <ThemePanel themes={withOwnedTheme(themesQ.data ?? [], settings.data?.header)} failed={themesQ.isError} current={currentTheme} preview={themePreview} mode={themeMode} onPreview={(t) => { setThemePreview(t); setThemeMode(null); }} onMode={setThemeMode} saving={themeSaving} onSave={() => setAsking({ kind: "theme" })} />;
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
    if (multi) return <MultiPanel names={chosen.map(label)} busy={busy} actions={multiActions} />;
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

        {selFree?.children?.length && !["page", "section", "cell", "columns"].includes(selFree.type) ? <label className="flex items-start gap-2 rounded-lg border border-white/10 p-2 text-xs">
          <input type="checkbox" checked={scaleContents} disabled={busy} data-testid="studio-scale-contents" onChange={event => { const on = event.target.checked; setScaleContents(on); saveScaleContents(on); }} />
          <span>{tr("تحجيم المحتوى مع الحاوية", "Scale contents with the container")}<span className="mt-1 block text-[11px] text-white/45">{tr("كل العناصر والنصوص بداخلها تكبر وتصغر بنفس النسبة. أطفئه لتغيير حدود الحاوية وحدها.", "All nested objects and text grow and shrink in proportion. Turn off to resize only the container frame.")}</span></span>
        </label> : null}

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
        {selExtra?.kind === "slot" && (selExtra.edit === "text" || selExtra.edit === "lines") ? (
          <WordsPanel
            langs={langs.enabled}
            main={main}
            names={LANG_NAME}
            multiline={selExtra.edit === "lines"}
            busy={busy}
            valueOf={(l) => wordOf(selExtra, l)}
            onSave={(l, v) => saveWord(selExtra, l, v)}
          />
        ) : null}
        {selExtra?.kind === "slot" && selExtra.edit === "media" ? (
          <MediaSlot
            kind={selExtra.media === "video" ? "video" : "image"}
            value={String(fieldValue(sectionOf(selExtra.sectionId), main, main, parsePath(selExtra.path)) ?? "")}
            busy={busy}
            onSet={(url) => void setField(selExtra.sectionId, parsePath(selExtra.path), url, main)}
          />
        ) : null}

        {/* A part of an old section or scene: its look and motion (all of its kind, for a marked piece). */}
        {lookSel && lookTarget ? (
          <div className="space-y-3" data-testid="studio-look-target" data-target={lookTarget.target}>
            {selExtra?.kind === "part" && selExtra.count > 1 ? <p className="text-[11px] leading-5 text-accent-200/80">{tr(`الشكل والحركة بيتغيّروا للـ ${selExtra.count} كلهم.`, "The look and motion change for all {0} of them.", [selExtra.count])}</p> : null}
            {lookTarget.kind !== "box" ? <StatesBar node={lookSel} state={styleState} onState={setStyleState} /> : null}
            {styleState !== "normal" && lookTarget.kind !== "box" ? (
              stateLooks(lookSel, styleState, lookChange, lookTarget.kind === "text" || lookTarget.kind === "button")
            ) : (
              <>
                {lookTarget.kind === "text" ? <TextStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {lookTarget.kind === "text" ? <TypeMorePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {lookTarget.kind === "button" ? (
                  <>
                    <ButtonStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} />
                    <TextStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} only={["font", "size", "weight"]} />
                  </>
                ) : null}
                {lookTarget.kind === "image" || lookTarget.kind === "video" ? <MediaStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {lookTarget.kind === "image" || lookTarget.kind === "video" ? <FiltersPanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                <ShowOnPanel node={lookSel} busy={busy} onOps={lookChange} />
                {lookTarget.kind !== "box" ? <LookPanel node={lookSel} screen={screen} busy={busy} limited onOps={lookChange} onPreview={(vars) => send({ type: "previewLook", target: lookTarget.target, vars })} /> : null}
              </>
            )}
            {!lookTarget.target.startsWith("b:") || lookTarget.target.includes("/") ? (
              <MotionPanel
                node={lookSel}
                busy={busy}
                onOps={(l, ops) => {
                  playNext.current = lookTarget.target;
                  lookChange(l, ops);
                }}
                onPlay={() => send({ type: "motionPlay", nodeId: lookTarget.target })}
              />
            ) : null}
          </div>
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
            <ConvertPanel section={selSection as OldSection} main={main} rose={roseOf(selSection as OldSection)} busy={busy} onConvert={() => convertOld([selected!])} />
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
            {heroSection ? (
              <SceneSettings
                block={selBlock}
                scene={(((heroSection.data as Record<string, unknown>)?.roseScenes ?? {}) as Record<string, Record<string, unknown> | undefined>)[selBlock]}
                shown={(heroSection.data as Record<string, unknown>)?.[BLOCK_FLAG[selBlock]] !== false}
                busy={busy}
                onShown={(on) => void run(on ? tr("إظهار", "Show") : tr("إخفاء", "Hide"), [{ op: "setField", sectionId: heroSection.id, lang: main, path: [BLOCK_FLAG[selBlock]], value: on }])}
                onSeed={(part, hex) => void setField(heroSection.id, ["roseScenes", selBlock, part, "seed"], hex, main)}
              />
            ) : null}
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

        {selNode?.node.type === "block" ? (
          <div className="space-y-3">
            <NodeActions
              canUp={selPos > 0}
              canDown={selPos >= 0 && selPos < selSiblings.length - 1}
              busy={busy}
              onUp={() => nudge(selected, -1)}
              onDown={() => nudge(selected, 1)}
              onDelete={() => setAsking({ kind: "delete", nodeId: selected, name: label(selected), tree: true })}
            />
            <BlockLinkPanel node={selNode.node} busy={busy} onEdit={(blockId) => window.location.assign(`/studio/${encodeURIComponent(blockId)}?from=${encodeURIComponent(id)}`)} onUnlink={() => void unlinkBlock(selNode.node)} />
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
            {selFree.type === "section" ? <EdgesPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "section" ? <ParticlesPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "section" ? <ScenePanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "deck" ? <DeckPanel node={selFree} lang={shopLang} busy={busy} ids={makeIds()} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "section" && selNode?.parentId === index.root && pageQ.data?.kind !== "block" ? <SaveBlockPanel node={selFree} busy={busy} onSave={(name, link) => saveBlock(selFree, name, link)} /> : null}
            {WRITABLE.has(selFree.type) ? (
              <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" disabled={Boolean(editing) || busy} onClick={() => startText(selected)} data-testid="studio-edit-node">
                {editing ? tr("عم تكتب بالصفحة… (Enter للحفظ، Esc للإلغاء)", "Writing in the page… (Enter saves, Esc cancels)") : tr("اكتب بالصفحة مع تنسيق (أو كبستين عليه)", "Write on the page with formatting (or double-click it)")}
              </button>
            ) : null}
            {EDITABLE.has(selFree.type) ? <ElementPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "video" ? <VideoOverlayPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} onPreview={(vars) => send({ type: "previewLook", nodeId: selected, vars })} /> : null}
            <StylePickPanel node={selFree} ss={ss} busy={busy} onOps={(l, ops) => void change(l, ops)} onEdit={(sid) => { setLeftTab("styles"); setSiteSel(sid); }} />
            <StatesBar node={selFree} state={styleState} onState={setStyleState} />
            {styleState !== "normal" ? (
              stateLooks(selFree, styleState, (l, ops) => void change(l, ops), WORDY_TYPES.has(selFree.type))
            ) : (
              <>
                {selFree.type === "heading" || selFree.type === "text" ? <TextStylePanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "heading" || selFree.type === "text" ? <TypeMorePanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "icon" ? <TextStylePanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} only={["iconSize", "size", "color", "align"]} /> : null}
                {selFree.type === "button" ? (
                  <>
                    <ButtonStylePanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                    <TextStylePanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} only={["font", "size", "weight"]} />
                  </>
                ) : null}
                {selFree.type === "image" || selFree.type === "video" || selFree.type === "slider" ? <MediaStylePanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type !== "spacer" ? <BoxPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} skip={selFree.type === "button" ? ["bg", "border", "radius"] : undefined} /> : null}
                <StickyPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                {PATTERNED.has(selFree.type) ? <PatternPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                <FiltersPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                {selFree.type !== "cell" ? <ShowOnPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "svg" ? <SvgPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "popup" ? <PopupPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {(BLOCK_KINDS as readonly string[]).includes(selFree.type) ? <ContentBlocksPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "instrument" ? <InstrumentPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "chart" ? <ChartPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "clock" ? <ClockPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "model3d" ? <Model3dPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                {selFree.type === "product360" ? <Product360Panel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                <LookPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} onPreview={(vars) => send({ type: "previewLook", nodeId: selected, vars })} />
              </>
            )}
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

        {selected === index.root ? <div className="space-y-3 rounded-xl border border-white/[0.08] p-3" data-testid="studio-page-motion">
          <div className="text-xs font-medium text-white/70">{tr("حركة عناصر الصفحة", "Page element motion")}</div>
          <p className="text-[11px] leading-5 text-white/45">{tr("بتتطبق على عناصر هالصفحة وبتقدر تتراجع عنها. تشغيل الفيديو وحركة الموديل ثلاثي الأبعاد إلهم إعداداتهم الخاصة.", "Applies to this page's elements and can be undone. Video playback and 3D model movement have their own settings.")}</p>
          <MotionProfileFields value={pageMotion} onChange={setPageMotion} busy={busy} />
          <button type="button" className="w-full rounded-lg bg-accent-500/20 px-2 py-2 text-xs text-accent-100 disabled:opacity-40" disabled={busy || (!pageMotion.engine && (!pageMotion.preset || pageMotion.preset === "original"))} onClick={() => {
            const root = latest.current?.tree.root;
            if (root) void change(tr("حركة عناصر الصفحة", "Page element motion"), pageMotionOps(root, pageMotion));
          }} data-testid="studio-page-motion-apply">{tr("تطبيق على الصفحة", "Apply to page")}</button>
        </div> : null}
        {selected === index.root && pageQ.data && (pageQ.data.kind ?? "page") === "page" ? <PageSettingsPanel key={pageQ.data.id} page={pageQ.data} langs={langs.enabled} /> : null}
        {selected === index.root ? <ConvertAllPanel sections={oldOnPage.map((x) => x.section)} main={main} roseOf={roseOf} busy={busy} onConvert={() => convertOld(oldOnPage.map((x) => x.node.id))} /> : null}

        {selected === index.root ? (
          <label className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] p-3 text-xs" data-testid="studio-page-smooth">
            <span className="text-white/75">
              {tr("سكرول ناعم للصفحة كلها", "Smooth scrolling for the whole page")}
              <span className="block text-[10px] text-white/40">{tr("مش للي طالب حركة أقل بجهازه.", "Not for whoever asked their device for less motion.")}</span>
            </span>
            <input
              type="checkbox" disabled={busy} checked={index.nodes.get(index.root)?.node.props?.smooth === true}
              onChange={(e) => void change(tr("سكرول ناعم", "Smooth scrolling"), [{ op: "setProps", nodeId: index.root, props: { smooth: e.target.checked || undefined } }])}
            />
          </label>
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
  // The layers' search: rows whose name, kind or words match, and the rows above them.
  const layerMatch = (() => {
    const q = layerFind.trim().toLowerCase();
    if (!q || !index) return null;
    const hit = new Set<string>();
    for (const [nid] of index.nodes) {
      if (!label(nid).toLowerCase().includes(q)) continue;
      for (let at: string | null = nid; at; at = index.nodes.get(at)?.parentId ?? null) hit.add(at);
    }
    return hit;
  })();
  const rowTools = { locked, chosen, match: layerMatch, hidden: hiddenHere, onLock: toggleLock, onHide: toggleHidden, onRename: rename };
  const layersList = (pick: (sid: string, add?: boolean) => void) => (
    <div>
      <input
        type="search" value={layerFind} onChange={(e) => setLayerFind(e.target.value)} placeholder={tr("دوّر بالطبقات", "Find in the layers")}
        className="mb-1.5 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white" data-testid="studio-layer-find"
      />
      <button type="button" onClick={() => pick(index!.root)} className={`flex w-full rounded-md px-2 py-1 text-start text-xs ${selected === index!.root ? "bg-accent-500/25 text-white" : "text-white/70 hover:bg-white/[0.04]"}`} data-testid="studio-layer" data-node={index!.root}>
        {typeLabel("page")}
      </button>
      {topItems.filter((sid) => !layerMatch || layerMatch.has(sid)).map((sid) => {
        const n = index!.nodes.get(sid)?.node;
        const sec = n?.type === "legacy" ? sectionOf(String(n.props.sectionId)) : undefined;
        const open = selPath.includes(sid);
        return (
          <div key={sid} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropAny(sid); }}>
            <button
              type="button"
              draggable
              onDragStart={() => (dragged.current = sid)}
              onClick={(e) => pick(sid, e.shiftKey)}
              onMouseEnter={() => setHovered(sid)}
              onMouseLeave={() => setHovered(null)}
              className={`flex w-full cursor-grab items-center gap-1.5 truncate rounded-md py-1 pe-2 ps-5 text-start text-xs ${selected === sid || chosen.includes(sid) ? "bg-accent-500/25 text-white" : hovered === sid ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"} ${sec && !sec.isVisible ? "opacity-45" : ""}`}
              data-testid="studio-layer"
              data-node={sid}
            >
              <span className="shrink-0 text-white/30">⋮⋮</span>
              <span className="truncate">{label(sid)}</span>
              {sec && !sec.isVisible ? <span className="ms-auto shrink-0 text-[10px]">{tr("مخفي", "Hidden")}</span> : null}
            </button>
            {n && n.type !== "legacy" ? (
              <Layers index={index!} id={sid} selected={selected} hovered={hovered} sectionTypes={sectionTypes} onPick={pick} onHover={setHovered} onDragStart={(x) => (dragged.current = x)} onDropOn={dropAny} depth={2} childrenOnly tools={rowTools} />
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
  // Motion from the Add panel goes on the selected element, or on the selected part of a section or scene.
  const motionNode = selFree ?? (lookTarget && lookTarget.kind !== "box" ? lookSel : null);

  // Templates (studio/templates): built for the shown theme's kind of store, drawn in its colours, with the store's own photos.
  const shownThemeInfo = withOwnedTheme(themesQ.data ?? [], settings.data?.header).find((t) => t.id === (themePreview ?? currentTheme));
  const ownedDesign = (settings.data?.header as { storeDesign?: { mode?: string; homeId?: string; headerId?: string; footerId?: string } } | null)?.storeDesign;
  const templateFamily = isFamily(shownThemeInfo?.family) ? shownThemeInfo.family : "fashion";
  const templateColours = shownThemeInfo ? coloursOf(shownThemeInfo.palettes?.[themeMode ?? savedTheme?.mode ?? shownThemeInfo.mode]) : ROSE_COLOURS;
  // The store's pack (the applied kit over its theme's): templates, new 3D models and the icon picker follow it.
  const storeKit = useMemo(() => storeKitOf(settings.data?.header, shownThemeInfo?.kit, null), [settings.data?.header, shownThemeInfo?.kit]);
  const templateKit = useMemo(() => templateKitOf(storeKit), [storeKit]);
  const productPics = useQuery({
    queryKey: ["template-pictures"],
    queryFn: async () => (await listProducts("active")).map((p) => p.summary?.thumbUrl).filter((u): u is string => typeof u === "string" && u.startsWith("https://")).slice(0, 12),
    enabled: templatesOpen,
    staleTime: 300_000,
  });
  const pageItemNode = (() => {
    const c = index && selected && selected !== index.root ? insertCtx((x) => `__${x}`) : null;
    const item = c ? pageItemOf(c, selected) : null;
    return item ? index?.nodes.get(item)?.node ?? null : null;
  })();
  // The rose design (no store theme, a modest fashion store) draws old sections its own way: the home's
  // first HERO is its opening (it stays), the rest take the rose look that converting leaves behind.
  const who = identityOf(settings.data?.header);
  const roseDesign = !savedTheme?.id && who.industry === "fashion" && who.audience === "women";
  const roseOf = (s: OldSection): RoseRole | undefined => (!roseDesign ? undefined : pageQ.data?.slug === "/" && s.id === heroSection?.id ? "opening" : "look");
  /** The page's old sections (the old editor's), in order, with their data. */
  const oldOnPage = pageKids.flatMap((n) => {
    const section = n.type === "legacy" ? sectionOf(String(n.props.sectionId)) : undefined;
    return section ? [{ node: n, section: section as OldSection }] : [];
  });
  /** Old sections turned into new ones in their places, as one change (Undo brings them back); the ones that can't stay. */
  const convertOld = (nodeIds: string[]) => {
    if (!index) return;
    const ids = makeIds();
    const ops: PagesAPI.PageDraftOp[] = [];
    let first: string | null = null;
    let kept = 0;
    for (const { node, section } of oldOnPage) {
      if (!nodeIds.includes(node.id)) continue;
      const r = convertSection(section, main, ids, roseOf(section));
      if (!r.ok) {
        kept++;
        continue;
      }
      // In its place: the new one goes in before it, then the old one goes to the bin.
      ops.push({ op: "insert", parentId: index.root, index: pageKids.indexOf(node), node: r.node }, { op: "remove", nodeId: node.id });
      first ??= r.node.id;
    }
    if (!ops.length) return void toast.error(tr("ولا قسم بيتحوّل هون", "No section here can be turned"));
    void change(tr("لعناصر جديدة", "To new elements"), ops, first);
    if (kept) toast.success(tr(`انحوّلوا، و${kept} ضلّوا أقسام قديمة`, "Turned; {0} stay old sections", [kept]));
  };
  /** A template's sections (or popup) after the selection's page item, or at the page's end: one change. */
  const placeTemplate = (nodes: PagesAPI.PageTreeNode[], where: UseWhere, name: string) => {
    if (!index || !nodes.length) return;
    const at = where === "here" ? pageSpot() : (index.nodes.get(index.root)?.children.length ?? 0);
    void change(name, nodes.map((node, i) => ({ op: "insert", parentId: index.root, index: at + i, node })), nodes[0].id);
  };
  const addPanel = () => (
    <>
    <button
      type="button"
      disabled={busy || !index}
      onClick={() => setTemplatesOpen(true)}
      className="mb-3 flex w-full items-center gap-2 rounded-xl border border-accent-400/40 bg-accent-500/15 px-3 py-2.5 text-start text-xs text-white hover:bg-accent-500/25 disabled:opacity-40"
      data-testid="studio-templates-open"
    >
      <span className="text-base" aria-hidden="true">▦</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{tr("معرض القوالب", "Templates gallery")}</span>
        <span className="block text-[10px] text-white/55">{tr("تصاميم المتجر الجديدة، أقسام وصفحات جاهزة", "New store designs, ready sections and pages")}</span>
      </span>
    </button>
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
        const op = motionOp(motionNode, withPreset(motionNode.motion as Motion | undefined, p));
        if (motionNode === selFree) {
          playNext.current = motionNode.id;
          void change(p.label(), [op]);
        } else if (lookTarget) {
          playNext.current = lookTarget.target;
          lookChange(p.label(), [op]);
        }
      }}
    />
    {pageQ.data?.kind === "block" ? null : (
      <div className="mt-4">
        <MyBlocks busy={busy} onLink={(b) => void addBlock(b, true)} onCopy={(b) => void addBlock(b, false)} onDelete={(b) => setAsking({ kind: "deleteBlock", block: b })} />
      </div>
    )}
    </>
  );
  /** The ready looks for the selected element: resting on one shows it in the frame, a click puts it on. */
  const looksPanel = () => {
    if (!selFree || selFree.type === "page") return <p className="px-2 py-4 text-xs leading-5 text-white/45" data-testid="studio-looks-pick">{tr("اختار عنصر عالصفحة (زر، صورة، عنوان، قسم…) لتشوف الأشكال الجاهزة اللي بتناسبه.", "Pick an element on the page (a button, a picture, a heading, a section…) to see the ready looks that suit it.")}</p>;
    const node = selFree;
    return (
      <LooksPanel
        key={node.id}
        node={node}
        label={label(node.id)}
        colours={templateColours}
        busy={busy}
        current={lastLook?.node === node.id ? lastLook.id : null}
        onRest={(r) => send({ type: "previewStyle", node: r && r.kind !== "edge" && r.kind !== "entrance" ? withLook(node, screen, r) : null })}
        onPick={(r: Ready) => {
          const ops = lookOps(node, screen, r, (svg) => decorArt(svg, true));
          send({ type: "previewStyle", node: null });
          if (!ops.length) return;
          setLastLook({ node: node.id, id: r.id });
          void change(`${tr("شكل جاهز", "A ready look")}: ${r.name()}`, ops);
        }}
      />
    );
  };
  const leftTabs = (
    <div className="mb-2 flex gap-1 rounded-xl bg-white/[0.04] p-1" role="tablist" aria-label={tr("لوحة جانبية", "Side panel")}>
      {(["add", "layers", "looks", "styles"] as const).map((t) => (
        <button key={t} type="button" role="tab" aria-selected={leftTab === t} onClick={() => setLeftTab(t)} className={`flex-1 rounded-lg px-1.5 py-1.5 text-xs ${leftTab === t ? "bg-accent-500/30 text-white" : "text-white/60 hover:bg-white/[0.06]"}`} data-testid={`studio-tab-${t}`}>
          {t === "add" ? `+ ${tr("إضافة", "Add")}` : t === "layers" ? tr("الطبقات", "Layers") : t === "looks" ? tr("الأشكال", "Looks") : tr("الستايلات", "Styles")}
        </button>
      ))}
    </div>
  );

  if (treeQ.isError || pageQ.isError) {
    return <Shell><p className="p-8 text-sm text-red-300">{tr("ما انفتحت الصفحة", "The page didn't open")}: {getApiErrorMessage(treeQ.error ?? pageQ.error)}</p></Shell>;
  }

  return (
    <StoreKitContext.Provider value={storeKit}>
    <Shell>
      <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <Link to="/admin/pages" className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white">
          <span className="inline-block ltr:-scale-x-100">→</span> {tr("الصفحات", "Pages")}
        </Link>
        <h1 className="me-2 truncate text-sm font-semibold">{pageQ.data?.name ?? "…"}</h1>
        {ownedDesign?.mode === "cms" ? <nav className="flex flex-wrap gap-1" aria-label={tr("أجزاء التصميم", "Design documents")}>
          {([["homeId", tr("الصفحة الرئيسية", "Home page")], ["headerId", tr("الهيدر", "Header")], ["footerId", tr("الفوتر", "Footer")]] as const).map(([key, label]) => ownedDesign[key] ? <Link key={key} to={`/studio/${ownedDesign[key]}`} aria-current={id === ownedDesign[key] ? "page" : undefined} className={`rounded-lg px-2 py-1 text-xs ${id === ownedDesign[key] ? "bg-accent-500/20 text-accent-100" : "bg-white/5 text-white/60"}`}>{label}</Link> : null)}
          <Link to="/setup" className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/70">{tr("اختيار قالب آخر", "Choose another template")}</Link>
        </nav> : null}
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
        {pageQ.data?.kind === "block" ? (
          // A saved block: what it changes reaches every page that links it once it's published.
          <span className="flex items-center gap-2 rounded-md bg-amber-300/10 px-2 py-0.5 text-[11px] text-amber-100" data-testid="studio-block-banner">
            ⧉ {tr("عم تعدّل بلوك محفوظ: نشره بيغيّر كل صفحة مربوط فيها.", "Editing a saved block: publishing it changes every page that links it.")}
            {fromPage ? <a href={`/studio/${encodeURIComponent(fromPage)}`} className="text-accent-300 hover:underline">{tr("رجوع للصفحة", "Back to the page")}</a> : null}
          </span>
        ) : null}
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
        <DragSettings prefs={dragPrefs} onChange={changeDragPrefs} />
        <div className="flex shrink-0 gap-1 rounded-lg bg-white/5 p-0.5" role="group" aria-label={tr("طريقة التحريك", "Positioning mode")}>
          {([["free", tr("تحريك حر", "Free move")], ["flow", tr("ترتيب", "Flow layout")]] as const).map(([mode, label]) => <button key={mode} type="button" disabled={busy} aria-pressed={canvasMode === mode} className={`h-7 rounded px-2 text-xs ${canvasMode === mode ? "bg-accent-500/30 text-white" : "text-white/60"}`} data-testid={`studio-canvas-mode-${mode}`} onClick={() => { cancelDrag(); setCanvasMode(mode); saveCanvasMode(mode); }}>{label}</button>)}
        </div>
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
          <div className="relative">
            <button type="button" onClick={() => setHistoryOpen((v) => !v)} disabled={(!canUndo && !canRedo) || busy} aria-expanded={historyOpen} className="h-7 rounded-lg px-2 text-xs text-white/75 hover:bg-white/[0.06] disabled:opacity-30" data-testid="studio-history-toggle">☰ {tr("السجل", "History")}</button>
            {historyOpen ? (
              <HistoryList
                done={history.current.done.map((x) => x.label)}
                undone={history.current.undone.map((x) => x.label)}
                busy={busy}
                onBack={(n) => void stepHistory(-n)}
                onForward={(n) => void stepHistory(n)}
                onClose={() => setHistoryOpen(false)}
              />
            ) : null}
          </div>
          <button type="button" onClick={toggleLive} aria-pressed={motionLive} title={tr("تشغيل كل الحركة بالصفحة", "Play all the motion on the page")} className={`h-7 rounded-lg px-2 text-xs ${motionLive ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/[0.06]"}`} data-testid="studio-motion-live">{motionLive ? "❚❚" : "▶"} {tr("الحركة", "Motion")}</button>
          <button type="button" disabled={!index} onClick={() => { setThemeOpen(false); setLeftTab("layers"); if (index) select(index.root, true); }} className="h-7 rounded-lg px-2 text-xs text-white/75 hover:bg-white/[0.06]" data-testid="studio-page-motion-open">{tr("حركة الصفحة", "Page motion")}</button>
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
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-e border-white/[0.08] p-2 md:block" aria-label={leftTab === "add" ? tr("إضافة", "Add") : leftTab === "styles" ? tr("الستايلات", "Styles") : leftTab === "looks" ? tr("الأشكال", "Looks") : tr("الطبقات", "Layers")}>
          {leftTabs}
          {leftTab === "add" ? (
            index ? addPanel() : null
          ) : leftTab === "styles" ? (
            <SiteStylesList ss={ss} selected={siteSel} canPublish={canPublish} onPick={setSiteSel} />
          ) : leftTab === "looks" ? (
            looksPanel()
          ) : (
            <>
              {index ? layersList((sid, add) => (add && isFree(nodeOf(sid)?.type) ? toggleChosen(sid) : select(sid, true))) : null}
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
              if (at && (extras.get(at.id)?.kind === "slot" || WRITABLE.has(index?.nodes.get(at.id)?.node.type ?? ""))) {
                select(at.id);
                startText(at.id);
              }
            }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={(event) => { if (down.current?.pointerId === event.pointerId) cancelDrag(); }}
            onLostPointerCapture={(event) => { if (down.current?.pointerId === event.pointerId) cancelDrag(); }}
            onPointerLeave={() => setHovered(filter.current.push(performance.now() + 1000, null))}
            onContextMenu={(e) => {
              e.preventDefault();
              const p = local(e);
              const hit = inFrame(p) ? pickAt(grid.near(p), p) : null;
              if (hit && !chosen.includes(hit.id)) select(hit.id);
              setMenu({ x: e.clientX, y: e.clientY });
            }}
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
              {more.filter((x) => x !== selected).map((x) => outline(x, "selected"))}
              {marquee ? <div className="pointer-events-none absolute border border-sky-400 bg-sky-400/10" style={rel(boxOf(marquee.a, marquee.b))} data-testid="studio-marquee" /> : null}
              {placing ? (
                <div className="pointer-events-none absolute rounded-md border-2 border-dashed border-sky-400 bg-sky-400/10" style={rel(placing.box)} data-testid="studio-placing">
                  <span className="absolute start-0 -top-6 whitespace-nowrap rounded-md bg-sky-500 px-1.5 py-0.5 text-[11px] text-white" dir="ltr">{placing.x}% · {placing.y}%</span>
                </div>
              ) : null}
              {dragView?.pushed.map((x) => (
                <div key={`push-${x.id}`} className="pointer-events-none absolute rounded-md border-2 border-dashed border-amber-400 bg-amber-400/10" style={rel(x.box)} data-testid="studio-pushed" data-node={x.id} />
              ))}
              {dragView?.touching.map((x) => {
                const b = dragView.pushed.find((y) => y.id === x)?.box ?? shapeOf(x)?.box;
                return b ? <div key={`touch-${x}`} className="pointer-events-none absolute rounded-md ring-2 ring-amber-300" style={rel(b)} data-testid="studio-touching" data-node={x} /> : null;
              })}
              {dragView?.into ? (
                <div className="pointer-events-none absolute rounded-md border-2 border-dashed border-emerald-400/80 bg-emerald-400/5" style={rel(dragView.into.box)} data-testid="studio-into" data-node={dragView.into.id}>
                  <span className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-emerald-500 px-1.5 py-0.5 text-[11px] text-white">
                    {tr("لجوّا", "Into")} {label(dragView.into.id)}
                  </span>
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
          {selFree && selShape && !editing && !directGeometrySafe(selFree.id) ? <div role="status" className="pointer-events-none absolute bottom-3 start-3 max-w-sm rounded bg-black/80 px-3 py-2 text-xs text-white/80">{tr("للعناصر المائلة ثلاثيّاً أو داخل حاوية مدوّرة، استخدم إعدادات المكان والحجم من اللوحة.", "Use the layout controls for 3D objects or objects inside rotated containers.")}</div> : null}
          {selFree && !multi && !editing && !placing && !drop && selShape && directGeometrySafe(selFree.id) && !["section", "cell", "columns", "page"].includes(selFree.type) ? (
            <SelectionHandles
              key={`${selFree.id}:${screen}`}
              box={selShape.box}
              proportional={scaleContents && Boolean(selFree.children?.length)}
              ratioLimits={scaleContents && selFree.children?.length && itemOf(selFree.id)?.size ? handle => scaleContentsLimits(selFree, screen, itemOf(selFree.id)!.size!, handle) : undefined}
              zoom={zoom * parentScaleOf(selFree.id) * Math.max(.1, Number(shownLook(selFree, screen, "scale") ?? 1))}
              frame={sizeOf(selFree.id) ? { w: sizeOf(selFree.id)!.w * parentScaleOf(selFree.id) * Number(shownLook(selFree, screen, "scale") ?? 1), h: sizeOf(selFree.id)!.h * parentScaleOf(selFree.id) * Number(shownLook(selFree, screen, "scale") ?? 1), rotation: Number(shownLook(selFree, screen, "rotateZ") ?? 0) } : undefined}
              sides={["heading", "text"].includes(selFree.type) ? "width" : "all"}
              turn={Number(shownLook(selFree, screen, "rotateZ") ?? 0)}
              local={local}
              onSizeLive={(w, h, gesture) => {
                if (motionLive) { setMotionLive(false); send({ type: "motionLive", on: false }); }
                previewGeometry(resizeOps(selFree, w, h, gesture));
              }}
              onSize={(w, h, gesture) => void change(tr("الحجم", "Size"), resizeOps(selFree, w, h, gesture)).finally(clearGeometry)}
              onCancel={() => { clearGeometry(); send({ type: "previewLook", nodeId: selFree.id, vars: { "--pt-rz": `${Number(shownLook(selFree, screen, "rotateZ") ?? 0)}deg` } }); }}
              onReset={() => void change(tr("الحجم الطبيعي", "Natural size"), [styleOp(selFree, screen, { width: null, height: null, maxWidth: null, minHeight: null, ...(scaleContents && selFree.children?.length ? { scale: null } : {}) })])}
              onTurnLive={(deg) => send({ type: "previewLook", nodeId: selFree.id, vars: { "--pt-rz": `${deg}deg` } })}
              onTurn={(deg) => void change(tr("دوران", "Turn"), [styleOp(selFree, screen, { rotateZ: deg || null })])}
            />
          ) : null}
          <Guides
            guides={guides}
            gaps={dragView?.marks.length ? dragView.marks : altHeld && selShape && hovered && hovered !== selected && shapeOf(hovered) ? gapsBetween(selShape.box, shapeOf(hovered)!.box) : []}
            zoom={zoom}
          />
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
            {(selected || themeOpen || siteOpen) && leftTab !== "add" ? <div className="mb-3 border-b border-white/[0.08] px-1 pb-3 text-sm">{inspector()}</div> : null}
            <div className="md:hidden">
              {leftTabs}
              {leftTab === "add"
                ? addPanel()
                : leftTab === "styles"
                  ? <SiteStylesList ss={ss} selected={siteSel} canPublish={canPublish} onPick={setSiteSel} />
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

      {menu ? <ContextMenu at={menu} items={menuItems()} onClose={() => setMenu(null)} /> : null}
      <ConfirmDialog
        open={asking !== null}
        variant={asking?.kind === "delete" || asking?.kind === "deleteMany" || asking?.kind === "deleteBlock" || (asking?.kind === "publish" && asking.force) ? "danger" : "warning"}
        isLoading={busy || themeSaving}
        title={
          asking?.kind === "delete" ? (asking.tree ? tr("حذف العنصر؟", "Delete the element?") : tr("حذف القسم؟", "Delete the section?"))
          : asking?.kind === "deleteMany" ? tr(`حذف ${asking.ids.length} عناصر؟`, "Delete {0} elements?", [asking.ids.length])
          : asking?.kind === "publish" ? (asking.force ? tr("الصفحة تغيّرت من مكان تاني", "The page changed elsewhere") : tr("نشر التغييرات؟", "Publish the changes?"))
          : asking?.kind === "discard" ? tr("إلغاء المسودة؟", "Discard the draft?")
          : asking?.kind === "deleteBlock" ? tr("حذف البلوك؟", "Delete the block?")
          : tr("حفظ الثيم لكل المتجر؟", "Save the theme for the whole store?")
        }
        message={
          asking?.kind === "delete" ? (asking.tree
            ? `${asking.name}. ${tr("بيروح من المسودة مع كل اللي جوّاه، وبيرجع بالتراجع.", "It leaves the draft with everything inside it, and comes back with undo.")}`
            : `${asking.name}. ${tr("بيروح من المسودة، وبيرجع بالتراجع أو بإلغاء المسودة. بالمتجر بينحذف بس بعد النشر.", "It leaves the draft, and comes back with undo or by discarding the draft. The store loses it only after publishing.")}`)
          : asking?.kind === "deleteMany" ? tr("بيروحوا من المسودة مع كل اللي جوّاهم، وبيرجعوا بالتراجع.", "They leave the draft with everything inside them, and come back with undo.")
          : asking?.kind === "publish" ? (asking.force
            ? tr("انحفظت تغييرات على الصفحة بعد ما بلشت المسودة. النشر هلّق بيكتب المسودة فوقها. نسخة من الحالية بتنحفظ بالسجل.", "The page was changed after the draft began. Publishing now writes the draft over it. A copy of the current one is kept in the history.")
            : tr("الزبائن رح يشوفوا الصفحة متل ما هي هون. نسخة من المنشورة هلّق بتنحفظ بالسجل.", "Customers will see the page as it is here. A copy of what's live now is kept in the history."))
          : asking?.kind === "discard" ? tr("كل التغييرات اللي مش منشورة بتروح، والصفحة بترجع متل المنشورة.", "Every unpublished change goes, and the page goes back to what's live.")
          : asking?.kind === "deleteBlock" ? `${asking.block.name}. ${asking.block.uses ? tr(`مربوط بـ ${asking.block.uses} صفحات: هالأماكن ما رح يبيّن فيها إشي.`, "Linked on {0} pages: nothing will show in those places.", [asking.block.uses]) : tr("مش مربوط بأي صفحة.", "It isn't linked on any page.")} ${tr("النسخ اللي انحطت كنسخة بتضل.", "Copies placed as copies stay.")}`
          : tr("الثيم بيتغيّر لكل صفحات المتجر فوراً، مش بس هالصفحة.", "The theme changes for every page of the store right away, not only this one.")
        }
        confirmText={asking?.kind === "delete" || asking?.kind === "deleteMany" || asking?.kind === "deleteBlock" ? tr("حذف", "Delete") : asking?.kind === "publish" ? tr("نشر", "Publish") : asking?.kind === "discard" ? tr("إلغاء المسودة", "Discard draft") : tr("حفظ", "Save")}
        onClose={() => setAsking(null)}
        onConfirm={async () => {
          const a = asking;
          if (!a) return;
          if (a.kind === "delete") {
            setAsking(null);
            if (await run(tr("حذف", "Delete"), [{ op: "remove", nodeId: a.nodeId }])) setSelected(null);
          } else if (a.kind === "deleteMany") {
            setAsking(null);
            if (await run(tr("حذف", "Delete"), a.ids.map((x): PagesAPI.PageDraftOp => ({ op: "remove", nodeId: x })))) {
              setSelected(null);
              setMore([]);
            }
          } else if (a.kind === "deleteBlock") {
            setAsking(null);
            try {
              await PagesAPI.deletePage(a.block.id);
              void qc.invalidateQueries({ queryKey: ["page-blocks"] });
              reload();
            } catch (e) {
              toast.error(tr("ما انحذف البلوك", "The block wasn't deleted"), { description: getApiErrorMessage(e) });
            }
          } else if (a.kind === "publish") await publish(a.force);
          else if (a.kind === "discard") await discard();
          else {
            setAsking(null);
            await saveTheme();
          }
        }}
      />
      <TemplatesGallery
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        lang={shopLang}
        family={templateFamily}
        colours={templateColours}
        pics={productPics.data ?? []}
        busy={busy}
        here={pageItemNode ? label(pageItemNode.id) : null}
        pageName={pageQ.data?.name ?? ""}
        storeName={{ ar: storeNameOf(settings.data, "ar"), en: storeNameOf(settings.data, "en"), he: storeNameOf(settings.data, "he") }}
        pageSections={() => pageKids.filter((n) => n.type === "section" || n.type === "popup")}
        selectedSection={pageItemNode?.type === "section" ? pageItemNode : null}
        makeIds={makeIds}
        onUse={placeTemplate}
        kit={templateKit}
      />
    </Shell>
    </StoreKitContext.Provider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-950 text-white" dir={isRtl(adminLang()) ? "rtl" : "ltr"} data-testid="studio">
      {children}
    </div>
  );
}

/** What a layer row can do beside picking: lock it, hide it on the screen shown, rename it; the search's matches. */
type RowTools = {
  locked: Set<string>;
  chosen: string[];
  /** Rows the layers' search keeps (null = all). */
  match: Set<string> | null;
  hidden: (id: string) => boolean;
  onLock: (id: string) => void;
  onHide: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

function Layers({ index, id, selected, hovered, sectionTypes, onPick, onHover, onDragStart, onDropOn, depth = 0, childrenOnly = false, tools }: {
  index: ReturnType<typeof indexTree>;
  id: string;
  selected: string | null;
  hovered: string | null;
  sectionTypes: Map<string, string>;
  /** `add`: Shift was held (adds the element to the selection, or takes it out). */
  onPick: (id: string, add?: boolean) => void;
  onHover: (id: string | null) => void;
  /** Rows of the tree's own elements can be dragged onto another row (into it, or before it). */
  onDragStart?: (id: string) => void;
  onDropOn?: (id: string) => void;
  depth?: number;
  childrenOnly?: boolean;
  tools?: RowTools;
}) {
  const [naming, setNaming] = useState(false);
  const at = index.nodes.get(id);
  if (!at) return null;
  if (tools?.match && !tools.match.has(id)) return null;
  const pass = { index, selected, hovered, sectionTypes, onPick, onHover, onDragStart, onDropOn, tools };
  if (childrenOnly) {
    return <>{at.children.map((c) => <Layers key={c} {...pass} id={c} depth={depth} />)}</>;
  }
  const n = at.node;
  const name = n.type === "page" ? typeLabel("page") : n.type === "cell" ? nodeTitle(index, id) : nodeName(n, n.type === "legacy" ? sectionTypes.get(String(n.props.sectionId)) : undefined);
  const free = isFree(n.type) && Boolean(onDragStart);
  const isLocked = Boolean(tools?.locked.has(id));
  const isHidden = Boolean(tools && isFree(n.type) && tools.hidden(id));
  const on = selected === id || Boolean(tools?.chosen.includes(id));
  return (
    <div
      onDragOver={onDropOn ? (e) => e.preventDefault() : undefined}
      onDrop={onDropOn ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropOn(id);
      } : undefined}
    >
      <div className={`group flex items-center rounded-md ${on ? "bg-accent-500/25 text-white" : hovered === id ? "bg-white/[0.06] text-white" : "text-white/70 hover:bg-white/[0.04]"} ${isHidden ? "opacity-45" : ""}`}>
        {naming && tools ? (
          <input
            autoFocus defaultValue={n.name ?? ""} maxLength={60} aria-label={tr("اسم العنصر", "The element's name")}
            className="m-0.5 min-w-0 flex-1 rounded border border-accent-400/60 bg-surface-925 px-1.5 py-0.5 text-xs text-white"
            style={{ marginInlineStart: 6 + depth * 12 }}
            onBlur={(e) => {
              setNaming(false);
              if (e.target.value.trim() !== (n.name ?? "")) tools.onRename(id, e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setNaming(false);
            }}
            data-testid="studio-layer-name"
          />
        ) : (
          <button
            type="button"
            draggable={free && !isLocked}
            onDragStart={free ? (e) => {
              e.stopPropagation();
              onDragStart!(id);
            } : undefined}
            onClick={(e) => onPick(id, e.shiftKey)}
            onDoubleClick={() => tools && isFree(n.type) && setNaming(true)}
            onMouseEnter={() => onHover(id)}
            onMouseLeave={() => onHover(null)}
            className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-1 pe-1 text-start text-xs"
            style={{ paddingInlineStart: 8 + depth * 12 }}
            title={tools && isFree(n.type) ? tr("كبستين لتغيير الاسم", "Double-click to rename") : undefined}
            data-testid="studio-layer"
            data-node={id}
          >
            <span className="shrink-0 text-[10px] text-white/35">{n.type === "cell" ? name : typeLabel(n.type)}</span>
            <span className="truncate">{n.type === "page" || n.type === "cell" || name === typeLabel(n.type) ? "" : name}</span>
          </button>
        )}
        {tools && isFree(n.type) && !naming ? (
          <span className={`flex shrink-0 items-center pe-1 ${isLocked || isHidden ? "" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}>
            <button type="button" className="h-5 w-5 rounded text-[11px] hover:bg-white/[0.1]" onClick={() => tools.onHide(id)} aria-pressed={isHidden} aria-label={isHidden ? tr("أظهره على هالشاشة", "Show it on this screen") : tr("خبّيه على هالشاشة", "Hide it on this screen")} title={isHidden ? tr("أظهره على هالشاشة", "Show it on this screen") : tr("خبّيه على هالشاشة", "Hide it on this screen")} data-testid="studio-layer-hide">{isHidden ? "◌" : "◉"}</button>
            {n.type !== "cell" ? <button type="button" className="h-5 w-5 rounded text-[11px] hover:bg-white/[0.1]" onClick={() => tools.onLock(id)} aria-pressed={isLocked} aria-label={isLocked ? tr("فك القفل", "Unlock") : tr("اقفل", "Lock")} title={isLocked ? tr("فك القفل", "Unlock") : tr("اقفل (ما بينختار بالكبس على الصفحة)", "Lock (not picked by clicks on the page)")} data-testid="studio-layer-lock">{isLocked ? "🔒" : "🔓"}</button> : null}
          </span>
        ) : null}
      </div>
      {at.children.map((c) => (
        <Layers key={c} {...pass} id={c} depth={depth + 1} />
      ))}
    </div>
  );
}

/**
 * The changes made in this visit, newest first: a click goes back to just after that one
 * (undoing the newer ones); the ones undone can be done again up to the one clicked.
 */
function HistoryList({ done, undone, busy, onBack, onForward, onClose }: { done: string[]; undone: string[]; busy: boolean; onBack: (n: number) => void; onForward: (n: number) => void; onClose: () => void }) {
  return (
    <div className="absolute end-0 top-8 z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-white/[0.1] bg-surface-950 p-1 text-xs shadow-2xl" role="menu" data-testid="studio-history" onMouseLeave={onClose}>
      {undone.length ? (
        <>
          <div className="px-2 pb-1 pt-1.5 text-[10px] text-white/40">{tr("بترجع بالإعادة", "Can be redone")}</div>
          {undone.map((label, i) => (
            // The last one undone is first to come back.
            <button key={`u${i}`} type="button" role="menuitem" disabled={busy} className="block w-full truncate rounded-lg px-2 py-1 text-start text-white/40 line-through hover:bg-white/[0.06] disabled:opacity-40" onClick={() => onForward(undone.length - i)} data-testid="studio-history-redo">
              {label}
            </button>
          ))}
          <div className="my-1 border-t border-white/[0.08]" />
        </>
      ) : null}
      {[...done].reverse().map((label, i) => (
        <button key={`d${i}`} type="button" role="menuitem" disabled={busy || i === 0} className="block w-full truncate rounded-lg px-2 py-1 text-start text-white/80 hover:bg-white/[0.06] disabled:cursor-default disabled:hover:bg-transparent" onClick={() => onBack(i)} title={i ? tr("رجوع لهون (بيتراجع عن اللي بعده)", "Back to here (undoes what came after)") : undefined} data-testid="studio-history-step">
          {i === 0 ? "● " : ""}{label}
        </button>
      ))}
      {!done.length ? <div className="px-2 py-1 text-white/40">{tr("لسا ما في تغييرات", "No changes yet")}</div> : null}
    </div>
  );
}
