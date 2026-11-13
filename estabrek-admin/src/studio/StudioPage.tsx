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
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../api/pages.api";
import { getApiErrorMessage } from "../api/http";
import { ROSE_ID, currentStoreTheme, currentStoreThemeId, loadStoreThemes, saveStoreTheme, withOwnedTheme } from "./storeThemes";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PagePublishDialog } from "./PagePublishDialog";
import { PagePublicationStatus } from "./PagePublicationStatus";
import { CommercePanel, COMMERCE_TYPES } from "./CommercePanel";
import { VisualControlsPanel } from "./VisualControlsPanel";
import { candidateStack, clickPick, PointSelection } from "./selectionPicking";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { TokensContext, useDesignTokens } from "./designTokens";
import { VariablesPanel } from "./VariablesPanel";
import { say } from "./say";
import { partDragOffset } from "./partDrag";
import { contentBinding, replaceContent, bindingLink } from "./partContent";
import { PartSizeFields } from "./PartSizeFields";
import { PartKindCard } from "./PartKindCard";
import { toast } from "../lib/toast";
import { History, fieldValue, getPath, looksOf, ownValue, parsePath, undoOf } from "./draft";
import { PreviewRefresh, PreviewRefreshCancelled } from "./previewRefresh";
import { sendDraftBatches, travelDraftHistory, type HistoryDirection } from "./draftBatches";
import { MotionProfileFields } from "./MotionProfileFields";
import { pageMotionOps, type MotionProfile } from "./motionProfiles";
import { Field, MediaSlot, PartInfo, SceneSettings, SectionActions, SectionSettings, ThemePanel, WordsPanel } from "./StudioPanels";
import { ButtonStylePanel, MediaStylePanel, ShowOnPanel, TextStylePanel } from "./StylePanels";
import { EdgesPanel, ParticlesPanel, PatternPanel } from "./ShapePanels";
import { CoverPanel, PaintPanel } from "./CoverPanel";
import { CursorTextPanel, PageCursorPanel } from "./CursorPanel";
import { canCover } from "./coverPin";
import { ScenePanel } from "./ScenePanel";
import { ScrollEffectsPanel } from "./ScrollEffectsPanel";
import { CuePanel, ScrollScenePanel } from "./ScrollScenePanel";
import { KeyframesPanel, OverflowPanel } from "./KeyframesPanel";
import { TriggersPanel } from "./TriggersPanel";
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
import { BoxPanel, FiltersPanel, PadPanel, StatePresets, StatesBar, TransitionPanel, TypeMorePanel, boxSkip } from "./TypePanels";
import { SiteStyleHead, SiteStylesList, StylePickPanel, useSiteStyles } from "./SiteStylesPanel";
import { BlockLinkPanel, MyBlocks, SaveBlockPanel } from "./BlocksPanel";
import { ComponentDocPanel, ComponentInstancePanel, detached, MakeComponentPanel, newInstance, placeOnly, useComponents } from "./ComponentsPanel";
import { BindPanel, bindContext, CollectionListPanel, useCollections } from "./CollectionsStudio";
import { newCollectionList } from "../features/collections/collectionForms";
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
import { canFocus, focusGroup, focusParts, focusTitle, focusTrail, type FocusPart } from "./focus/focusKinds";
import { focusView, sameView, viewAt, type View } from "./focus/focusView";
import { FocusBar, FocusMask, FocusParts, type Crumb } from "./focus/FocusChrome";
import { MorphSettings, SvgPartPanel, type Morph } from "./focus/SvgPartPanel";
import { PathHandles, compose } from "./focus/PathHandles";
import { SparklePanel } from "./focus/SparklePanel";
import { SparkleHandles } from "./focus/SparkleHandles";
import { ImageEditPanel } from "./focus/ImageEditPanel";
import { VideoEditor } from "./focus/VideoEditor";
import { ModelPartPanel, ModelSpotsPanel, ModelViewsPanel, type ModelPartInfo, type Spot3d } from "./focus/ModelPanels";
import { CurvePanel, SlidePanel } from "./focus/KindPanels";
import { PageBudget, PerfPanel, type Sample } from "./focus/PerfPanel";
import { SlowdownAlert, SpeedCheck, keepLab, type Lab } from "./focus/SpeedCheck";
import { lightenAll } from "./focus/perfCost";
import * as SpeedAPI from "../api/speed.api";
import { BodyPanel, WORLD_HOSTS, WorldPanel, worldOfNode, type BakedKeys } from "./PhysicsPanels";
import { CodePanel, FormPanel } from "./FormPanels";
import { InspectorGroup, InspectorJump, type InspectorGroupId } from "./InspectorNav";
import { besidePlace, dockPref, frameFor, saveDock, saveSections, sectionsPref, sideOf } from "./beside";
import { wheelOver } from "./canvasWheel";
import { ContentPanel } from "./MediaPanels";
import { BesideStrips } from "./BesideStrips";
import { makeVideo } from "../api/videos.api";
import { editImage } from "../api/uploads.api";
import type { Sparkle } from "../../../shared/sparkle";
import { withArtAttrs } from "./focus/focusKinds";
import type { Matrix } from "./focus/pathData";
import { SectionObjectsPanel } from "./SectionObjectsPanel";
import { Product360Panel } from "./Product360Panel";
import { motionOp, placeFor, placedOn, previewOf, shownLook, togglePreset, type Motion } from "./look";
import { ContextMenu, MultiPanel, type MenuItem, type MultiActions } from "./MultiPanel";
import { Guides, SelectionHandles } from "./CanvasHandles";
import { gapsBetween, nudgeOf, type Gap, type Guide, type ResizeChange, distancesAround } from "./handles";
import { pickCanvasContainer } from "./canvasContainers";
import { effectiveLook, placementBox, placementPatch, readCanvasMode, readScaleContents, resizePatch, saveCanvasMode, saveScaleContents, scaleContentsLimits, scaleContentsPatch, transferPatch, type CanvasMode } from "./canvasManipulation";
import { canvasPlane,effectiveConstraints,movementOf,validResponsiveConstraints,planeMoveLocalPatch,planeNudgePatch,planeResizePatch } from "./engineGeometry";
import { constrainSize,spaceBoxes,type SizeConstraints } from "./layoutConstraints";
import { LayoutConstraintsPanel } from "./LayoutConstraintsPanel";
import { startPlaneDrag,stepPlaneDrag,type PlaneDrag } from "./planeDrag";
import { boundsOfQuad,inverse3,multiply3,planeQuad,project3,resizePlane,type Plane } from "../../../shared/geometry/plane";
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
import { DIRECTIONS, HoverFilter, SpatialGrid, pickAt, queenStep, toScreen, visiblePart, zoomAround, type Box, type Pt, type Shape, TINY_SEEN, outlineIsBox } from "./geometry";
import { fieldLabel, indexTree, isRelated, nodeName, nodeTitle, partLabel, pathTo, shapesOf, tagLabel, typeLabel, type BridgeLayout, type Extra } from "./treeIndex";

const SOURCE = "estabrek-studio";
/** How long the canvas stays still after a press before it comes closer to what was picked: longer than the gap
 *  between the two clicks of a double click, so the second one lands where the first did. */
const PICK_REST = 300;
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
  particles: () => tr("الجزيئات", "Particles"),
  world: () => tr("عالم المتجر", "The store's world"),
  rooms: () => tr("غرف القطع", "The rooms"),
};
/** The opening's switch that shows each rose scene. */
const BLOCK_FLAG: Record<string, string> = { seasons: "roseSeasonsEnabled", stories: "roseStoriesEnabled", instagram: "roseInstagramEnabled", fabric: "rose3dEnabled", particles: "roseParticlesEnabled", world: "roseWorldEnabled", rooms: "roseRoomsEnabled" };
/** Scenes that show only once switched on (the rest show unless switched off). */
const BLOCK_OFF_BY_DEFAULT = new Set(["rooms"]);
const blockShown = (data: Record<string, unknown> | undefined, block: string) =>
  BLOCK_OFF_BY_DEFAULT.has(block) ? data?.[BLOCK_FLAG[block]] === true : data?.[BLOCK_FLAG[block]] !== false;
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
type PlaneItem={id:string;frame:Plane;look:Record<string,unknown>;parentId:string;free:boolean};
type PartMove = { vars: Record<string, string | number>; inlineBox?: boolean; target: string; kind: PagesAPI.LookKind; parent: Plane; start: Pt; screen: PagesAPI.TreeScreen; style: Record<string, unknown> };
type Down = { partMove?: PartMove; before?: string | null; pointerId: number; p: Pt; pan: Pt; panning: boolean; touch: boolean; moved: boolean; y: number; grab: string | null; group: string[]; starts: Map<string, Box>; free?: FreeDrag; shown?: Pt; into?: { id: string; box: Box } | null; analytic?:{drag:PlaneDrag;holder:Plane;items:PlaneItem[];peers:PlaneItem[];movement:"horizontal"|"vertical"|"both"|"free";ops?:PagesAPI.PageDraftOp[]} };
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
  return <StudioDocument key={id} />;
}

/** A document owns its preview ticket, history and pending editor gestures. */
function StudioDocument() {
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
  // The inspector beside what's selected (beside.ts) or docked at the side; one section of settings at a time or
  // all of them; the section open, the sections the selection has, and whether the floating panel is open.
  const [dock, setDock] = useState<"beside" | "side">(dockPref);
  const [sections, setSections] = useState<boolean>(sectionsPref);
  const [inspGroup, setInspGroup] = useState<InspectorGroupId>("content");
  const [inspGroups, setInspGroups] = useState<InspectorGroupId[]>([]);
  const [inspOpen, setInspOpen] = useState(true);
  // With nothing selected the floating panel stays off the page (it would cover its corner) until asked for.
  const [idleOpen, setIdleOpen] = useState(false);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches === true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches === true);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  const beside = dock === "beside" && wide;
  // The last press on the canvas: a drag, or a pick (a newly selected element is brought into view only after a pick).
  const lastPress = useRef<{ moved: boolean; at: number; p: Pt | null }>({ moved: false, at: 0, p: null });
  // The view to go back to when nothing is selected any more.
  const homeView = useRef<View | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Other elements selected with it (Shift+click, a box dragged on the page): the tree's own elements only.
  const [more, setMore] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; candidates?: string[] } | null>(null);
  const [deepSelection, setDeepSelection] = useState(() => { try { return localStorage.getItem("studio.deepSelection") !== "off"; } catch { return true; } });
  const pointSelection = useRef(new PointSelection());
  useEffect(() => () => pointSelection.current.cancel(), [id]);
  // Locked in the layers (kept in this browser for the page): clicks on the page go through them.
  const [locked, setLocked] = useState<Set<string>>(() => lockedOf(id));
  const [layerFind, setLayerFind] = useState("");
  // Lines a dragged element snaps to; Alt held shows the distances to what's under the pointer.
  const [guides, setGuides] = useState<Guide[]>([]);
  const [altHeld, setAltHeld] = useState(false);
  /** The list of shortcuts ("?"). */
  const [keysOpen, setKeysOpen] = useState(false);
  const [fixedGap,setFixedGap]=useState(24);
  // Alt+arrow nudges add up (shown in the frame at once) and are saved together a moment after the last one.
  const nudging = useRef<{dx:number;dy:number;timer:number;planes?:Array<PlaneItem&{holder:Plane;movement:"horizontal"|"vertical"|"both"|"free"}>}>({ dx: 0, dy: 0, timer: 0 });
  // Which look the style panels change: the element's own, or its look with the mouse over it, focused or pressed.
  const [styleState, setStyleState] = useState<StateChoice>("normal");
  const [panMode, setPanMode] = useState(false);
  const [sheet, setSheet] = useState(false); // phones: the layers list as a sheet
  const [busy, setBusy] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const liveView = useRef(false);
  // Words being written in the frame: a field of an old section or scene, or a tree element's words.
  const [editing, setEditing] = useState<{ sectionId: string; path: string } | { nodeId: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePreview, setThemePreview] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | null | undefined>(undefined);
  const [themeSaving, setThemeSaving] = useState(false);
  const [commerceIssues, setCommerceIssues] = useState<Array<{ code: string; nodeType: string }>>([]);
  const [asking, setAsking] = useState<null | { kind: "delete"; nodeId: string; name: string; tree?: boolean } | { kind: "deleteMany"; ids: string[] } | { kind: "publish"; force: boolean; options?: PagesAPI.PublishPageOptions } | { kind: "discard" } | { kind: "theme" } | { kind: "deleteBlock"; block: PagesAPI.BlockInfo }>(null);
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
  // Focus mode (focus/): one element opened on its own, the part of it being edited, and the view to go back to.
  const [focus, setFocus] = useState<{ id: string; part: FocusPart | null; back: View; lite?: boolean } | null>(null);
  const [focusAll, setFocusAll] = useState(false);
  const glide = useRef(0);
  // A drawing opened in focus mode: its shapes as the frame measured them (page box, the matrix from their own
  // numbers to the page, their own box), and the shape a click asked the frame for.
  const [artInfo, setArtInfo] = useState<{ nodeId: string; parts: Array<{ id: string; tag: string; rect: Box; ctm: Matrix | null; box: Box }> } | null>(null);
  const artPick = useRef<{ requestId: string; done: (part: string | null) => void } | null>(null);
  const artSeq = useRef(0);
  // A picture's sparkling stars in focus mode: the frame's search for their places, what it said, and the pen.
  const sparkleWait = useRef<{ requestId: string; done: (points: Array<{ x: number; y: number; s?: number }> | null, problem?: string) => void } | null>(null);
  const [sparkleFinding, setSparkleFinding] = useState(false);
  const [sparkleNote, setSparkleNote] = useState<string | null>(null);
  const [sparklePen, setSparklePen] = useState(false);
  // A 3D model in focus mode: its parts as the frame read them, the click asked about, and the points' pen.
  const [modelInfo, setModelInfo] = useState<{ nodeId: string; parts: ModelPartInfo[]; ready: boolean } | null>(null);
  const modelWait = useRef<{ requestId: string; done: (part: string | null, at: [number, number, number] | null) => void } | null>(null);
  const [spotPen, setSpotPen] = useState(false);
  // The page measured in the frame (speed per element: the page's budget).
  const perfWait = useRef<{ requestId: string; done: (s: Sample | null) => void } | null>(null);
  // The page's speed checked in the frame before publishing (perfLab → perfLabbed), and its last result.
  const labWait = useRef<{ requestId: string; done: (l: Lab | null) => void } | null>(null);
  const labResult = useRef<Lab | null>(null);
  // A world being baked in the frame (physicsBake → physicsBaked).
  const bakeWait = useRef<{ requestId: string; done: (k: BakedKeys | null) => void } | null>(null);
  // The video editor (focus mode on a video): open or not.
  const [videoEditor, setVideoEditor] = useState(false);
  // A picture open in focus mode: its own size (from the frame), for the crop's ratios.
  const [imgInfo, setImgInfo] = useState<{ nodeId: string; w: number; h: number } | null>(null);
  const history = useRef(new History());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef<PagesAPI.PageDraft | null>(null);
  const keepScroll = useRef<number | null>(null);
  const revealNext = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const filter = useRef(new HoverFilter());
  const last = useRef<{ p: Pt; t: number; gone?: boolean } | null>(null);
  const down = useRef<Down | null>(null);
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
  const themesQ = useQuery({ queryKey: ["store-themes", "full"], queryFn: loadStoreThemes, staleTime: 300_000 });
  const savedTheme = currentStoreTheme(settings.data?.header);
  const currentTheme = currentStoreThemeId(settings.data?.header, themesQ.data?.defaults);
  const shownTheme = themePreview ?? currentTheme;
  const shownThemeMode = themeMode === undefined ? (themePreview ? null : savedTheme?.mode ?? null) : themeMode;
  const currentCustom = !themePreview && savedTheme?.custom && typeof savedTheme.custom === "object" ? `&themeCustom=${encodeURIComponent(JSON.stringify(savedTheme.custom))}` : "";
  // Name the current design too: a framed visit may retain an earlier trial theme.
  const theme = `&storeTheme=${encodeURIComponent(shownTheme)}${shownThemeMode ? `&themeMode=${shownThemeMode}` : ""}${currentCustom}`;
  const src = ticket && origin ? `${origin}${shopLang === langs.default ? "" : `/${shopLang}`}/studio-frame?token=${encodeURIComponent(ticket.token)}${theme}` : "";
  const viewRefresh = useMemo(() => new PreviewRefresh(requestId => {
    const target = frameRef.current?.contentWindow;
    if (!target) throw new Error("Preview unavailable");
    target.postMessage({ source: SOURCE, type: "refreshView", requestId }, origin);
  }), [origin, src, frameKey]);
  useEffect(() => { viewRefresh.activate(); return () => viewRefresh.dispose(); }, [viewRefresh]);

  // What the shop's bridge says.
  useEffect(() => {
    liveView.current = false;
    setLayout(null);
    setSilent(false);
    // A new page in the frame: words being written there are gone with the old one, so the canvas takes the mouse again.
    setEditing(null);
    const quiet = window.setTimeout(() => setSilent(true), 20_000);
    let first = true;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as (BridgeLayout & { source?: string; type?: string }) | null;
      if (!d || d.source !== SOURCE) return;
      if (d.type === "ready") {
        liveView.current = (d as unknown as { liveView?: boolean }).liveView === true;
        // The frame (re)loaded by itself: no words are being written in it any more.
        setEditing(null);
      } else if (d.type === "pointPicked") {
        const value = d as unknown as { requestId?: unknown; candidates?: unknown };
        if (typeof value.requestId === "string" && Array.isArray(value.candidates)) pointSelection.current.resolve(value.requestId, value.candidates.filter((v): v is string => typeof v === "string").slice(0, 100));
      } else if (d.type === "artParts") {
        const m = d as unknown as { nodeId?: unknown; parts?: unknown };
        if (typeof m.nodeId === "string" && Array.isArray(m.parts)) {
          const parts = m.parts
            .filter((x): x is { id: string; tag: string; rect: Box; ctm: Matrix | null; box: Box } => Boolean(x) && typeof (x as { id?: unknown }).id === "string" && typeof (x as { rect?: unknown }).rect === "object")
            .slice(0, 200);
          setArtInfo({ nodeId: m.nodeId, parts });
        }
      } else if (d.type === "artPicked") {
        const m = d as unknown as { requestId?: unknown; part?: unknown };
        const wait = artPick.current;
        if (wait && m.requestId === wait.requestId) {
          artPick.current = null;
          wait.done(typeof m.part === "string" ? m.part : null);
        }
      } else if (d.type === "perfLabbed") {
        const m = d as unknown as Partial<Lab> & { requestId?: unknown };
        const wait = labWait.current;
        if (wait && m.requestId === wait.requestId) {
          labWait.current = null;
          wait.done({ fps: Number(m.fps) || 0, slow: Number(m.slow) || 0, longMs: Number(m.longMs) || 0, cls: Number(m.cls) || 0, ms: Number(m.ms) || 0 });
        }
      } else if (d.type === "physicsBaked") {
        const m = d as unknown as { requestId?: unknown; keys?: unknown };
        const wait = bakeWait.current;
        if (wait && m.requestId === wait.requestId) {
          bakeWait.current = null;
          const keys = m.keys && typeof m.keys === "object" && !Array.isArray(m.keys) ? (m.keys as BakedKeys) : null;
          wait.done(keys ? Object.fromEntries(Object.entries(keys).filter(([k, v]) => /^[A-Za-z0-9_-]{1,64}$/.test(k) && Array.isArray(v)).map(([k, v]) => [k, v.slice(0, 16)])) : null);
        }
      } else if (d.type === "perfSampled") {
        const m = d as unknown as Sample & { requestId?: unknown };
        const wait = perfWait.current;
        if (wait && m.requestId === wait.requestId) {
          perfWait.current = null;
          wait.done({ fps: Number(m.fps) || 0, longMs: Number(m.longMs) || 0, animations: Number(m.animations) || 0, canvases: Number(m.canvases) || 0, videos: Number(m.videos) || 0, nodes: Number(m.nodes) || 0 });
        }
      } else if (d.type === "modelParts") {
        const m = d as unknown as { nodeId?: unknown; parts?: unknown; ready?: unknown };
        if (typeof m.nodeId === "string" && Array.isArray(m.parts)) setModelInfo({ nodeId: m.nodeId, parts: (m.parts as ModelPartInfo[]).filter((x) => x && typeof x.key === "string").slice(0, 120), ready: m.ready === true });
      } else if (d.type === "modelPicked") {
        const m = d as unknown as { requestId?: unknown; part?: unknown; at?: unknown };
        const wait = modelWait.current;
        if (wait && m.requestId === wait.requestId) {
          modelWait.current = null;
          wait.done(typeof m.part === "string" ? m.part : null, Array.isArray(m.at) && m.at.length === 3 ? (m.at as [number, number, number]) : null);
        }
      } else if (d.type === "imageInfo") {
        const m = d as unknown as { nodeId?: unknown; w?: unknown; h?: unknown };
        if (typeof m.nodeId === "string" && typeof m.w === "number" && typeof m.h === "number") setImgInfo({ nodeId: m.nodeId, w: m.w, h: m.h });
      } else if (d.type === "sparkleFound") {
        const m = d as unknown as { requestId?: unknown; points?: unknown; problem?: unknown };
        const wait = sparkleWait.current;
        if (wait && m.requestId === wait.requestId) {
          sparkleWait.current = null;
          const points = Array.isArray(m.points) ? (m.points as Array<{ x: number; y: number; s?: number }>).filter((p) => p && typeof p.x === "number" && typeof p.y === "number").slice(0, 80) : null;
          wait.done(points, typeof m.problem === "string" ? m.problem : undefined);
        }
      } else if (d.type === "viewUpdated") {
        pointSelection.current.cancel();
        const requestId = (d as unknown as { requestId?: unknown }).requestId;
        if (typeof requestId === "string") viewRefresh.acknowledge(requestId);
      } else if (d.type === "motionStateRequest") {
        frameRef.current?.contentWindow?.postMessage({source:SOURCE,type:"motionLive",on:liveRef.current},origin);
      } else if (d.type === "layout") {
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
      } else if (d.type === "partEdited" || d.type === "partCancelled") {
        const m = d as unknown as { nodeId: string; path: string; line?: number; lang: Lang; value?: string };
        setEditing(null);
        canvasRef.current?.focus({ preventScroll: true });
        if (d.type === "partEdited") onPartEdited.current(m.nodeId, m.path, m.line, m.lang, String(m.value ?? ""));
      } else if (d.type === "key") {
        onFrameKey.current((d as unknown as { action?: string }).action);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      pointSelection.current.cancel();
      window.clearTimeout(quiet);
    };
  }, [src, origin, frameKey, viewRefresh]);

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
    pointSelection.current.cancel();
    cancelAnimationFrame(glide.current);
    homeView.current = null;
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
  const pickableShapes = useMemo(() => shapes.filter(x => (deepSelection || !x.id.startsWith("detail:")) && (!index || !pathTo(index, x.id, up).some(id => lockedIn.has(id)))), [shapes, deepSelection, index, up, lockedIn]);
  const grid = useMemo(() => new SpatialGrid(pickableShapes, 64, { x: 0, y: 0, w: canvas.w, h: canvas.h }), [pickableShapes, canvas.w, canvas.h]);
  const shapeOf = (sid: string | null) => (sid ? shapes.find((s) => s.id === sid) ?? null : null);
  const frameBox: Box = { x: pan.x, y: pan.y, w: dev.w * zoom, h: dev.h * zoom };
  // The page moved under a still pointer (the wheel, the canvas coming closer, a change): the highlight is what's
  // under the pointer now, not what was there before; it's what a click would pick.
  useEffect(() => {
    // (Not once the pointer has left the canvas: its last place is only kept for "Choose object".)
    const at = last.current && !last.current.gone ? last.current.p : null;
    if (!at || down.current) return;
    const inside = at.x >= pan.x && at.x <= pan.x + dev.w * zoom && at.y >= pan.y && at.y <= pan.y + dev.h * zoom;
    const now = inside ? pickAt(grid.near(at), at) : null;
    if ((now?.id ?? null) === filter.current.current) return;
    filter.current.reset();
    setHovered(filter.current.push(performance.now(), now?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const inFrame = (p: Pt) => p.x >= frameBox.x && p.x <= frameBox.x + frameBox.w && p.y >= frameBox.y && p.y <= frameBox.y + frameBox.h;
  const select = (sid: string | null, reveal = false) => {
    pointSelection.current.cancel();
    setSelected(sid);
    setMore([]);
    if (!reveal || !sid || !index) return;
    const x = extras.get(sid);
    if (x?.kind === "region") { const shape = shapeOf(sid); if (shape && layout) send({ type: "scrollTo", y: Math.max(0, (shape.box.y - pan.y) / zoom + layout.scroll.y - dev.h / 3) }); return; }
    if (x?.kind === "slot") return send({ type: "reveal", owner: x.owner, sectionId: x.sectionId, path: x.path });
    if (x?.kind === "part") return send({ type: "reveal", owner: x.owner, part: x.name, n: x.n });
    if (x?.kind === "detail") { const shape = shapeOf(sid); if (shape && layout) send({ type: "scrollTo", y: Math.max(0, (shape.box.y - pan.y) / zoom + layout.scroll.y - dev.h / 3) }); return; }
    if (x?.kind === "auto") return send({ type: "reveal", owner: x.owner });
    if (x?.kind === "block") return send({ type: "reveal", block: x.block });
    const n = index.nodes.get(sid)?.node;
    if (n?.type === "legacy") send({ type: "reveal", sectionId: n.props.sectionId });
    else if (n?.type === "roseBlock") send({ type: "reveal", block: n.props.block });
    else if (n && n.type !== "page") send({ type: "reveal", nodeId: n.id });
  };

  /* ------------------------------------------------------------ changes */
  const pickPoint = (point: Pt, done: (ids: string[]) => void) => {
    if (!index) return;
    const fallback = candidateStack(pickableShapes, point, [], index, up, lockedIn, deepSelection);
    const requestId = pointSelection.current.request(fallback, painted => done(candidateStack(pickableShapes, point, painted, index, up, lockedIn, deepSelection)));
    send({ type: "pickPoint", requestId, x: (point.x - pan.x) / zoom, y: (point.y - pan.y) / zoom });
  };

  const reload = async () => {
    // Compatibility with a frame opened before the live-view protocol was deployed.
    if (!liveView.current) {
      keepScroll.current = layout?.scroll.y ?? 0;
      setFrameKey(k => k + 1);
      return;
    }
    try {
      await viewRefresh.refresh();
      if (playNext.current) {
        send({ type: "motionPlay", nodeId: playNext.current });
        playNext.current = null;
      }
    } catch (error) {
      if (error instanceof PreviewRefreshCancelled) return;
      toast.error(tr("التغيير محفوظ، لكن تحديث المعاينة تعذّر. جرّب زر تحديث المعاينة.", "The change is saved, but the preview could not update. Try Refresh preview."), { description: getApiErrorMessage(error), durationMs: 7000 });
    }
  };
  /** Sends changes to the draft; records how to undo them unless it is an undo/redo itself. */
  // The shared-style draft also reconciles inside the existing preview document.
  const ss = useSiteStyles(reload);
  // The design variables (designTokens.tsx): every picker offers them; the preview shows their draft.
  const dt = useDesignTokens(reload);
  // Main components (ComponentsPanel.tsx): made here, used with variants and own changes.
  const componentsQ = useComponents();
  // Collections (CollectionsStudio.tsx): lists of their items, and elements connected to their fields.
  const collectionsQ = useCollections();
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
      if (opts.reload !== false) await reload();
      return true;
    } catch (e) {
      // A later batch may fail after earlier ones were saved: those still have an undo.
      if (applied.length) {
        if (!opts.travel) history.current.push({ label, ops: applied, undo: undoOf(applied, at, main) });
        await reload();
      }
      if (statusOf(e) === 409) {
        await draftQ.refetch();
        await reload();
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
  const partContentOf = (sid: string | null) => {
    const part = sid ? extras.get(sid) : undefined;
    if (part?.kind !== "detail" || !part.owner.startsWith("n:") || typeof part.text !== "string") return null;
    const owner = index?.nodes.get(part.owner.slice(2))?.node;
    const binding = owner ? contentBinding(owner.props, part.text, shopLang, main, part.propPath, part.propLine, owner.type) : null;
    return owner && binding ? { part, owner, binding } : null;
  };
  const savePartContent = (sid: string | null, value: string) => {
    const bound = partContentOf(sid); if (!bound) return;
    const props = replaceContent(bound.owner.props, bound.binding, shopLang, value, main, bound.owner.type);
    if (props) void change(tr("الكلام", "The words"), [{ op: "setProps", nodeId: bound.owner.id, props }]);
  };
  const onPartEdited = useRef<(nodeId: string, path: string, line: number | undefined, lang: Lang, value: string) => void>(() => {});
  onPartEdited.current = (nodeId, path, line, lang, value) => {
    const owner = index?.nodes.get(nodeId)?.node;
    if (!owner || !["ar", "en", "he"].includes(lang) || typeof path !== "string") return;
    const props = replaceContent(owner.props, { path: parsePath(path), line, value: "" }, lang, value, main, owner.type);
    if (props) void change(tr("الكلام", "The words"), [{ op: "setProps", nodeId, props }]);
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
    pointSelection.current.cancel();
    const bound = partContentOf(sid);
    if (bound) {
      setEditing({ nodeId: bound.owner.id });
      send({ type: "editPart", nodeId: bound.owner.id, target: bound.part.target, path: bound.binding.path.join("."), line: bound.binding.line, lang: shopLang, value: bound.binding.value });
      return true;
    }
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
    if (!themePreview && themeMode === undefined) return;
    setThemeSaving(true);
    try {
      const id = themePreview ?? currentTheme;
      await saveStoreTheme(id === ROSE_ID ? null : { ...(id === currentTheme ? savedTheme : {}), id, mode: shownThemeMode });
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setThemePreview(null);
      setThemeMode(undefined);
      reload();
      toast.success(tr("انحفظ الثيم لكل المتجر", "The theme was saved for the whole store"));
    } catch (e) {
      toast.error(tr("ما انحفظ الثيم", "The theme wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setThemeSaving(false);
    }
  };
  /** The page scrolled top to bottom in the frame with everything moving, measured (StudioBridge perfLab). */
  const runLab = useCallback(() => new Promise<Lab | null>((resolve) => {
    const requestId = `lab${++artSeq.current}`;
    const timer = window.setTimeout(() => { if (labWait.current?.requestId === requestId) labWait.current = null; resolve(null); }, 15000);
    labWait.current = { requestId, done: (l) => { window.clearTimeout(timer); resolve(l); } };
    send({ type: "perfLab", requestId });
  }), [send]);
  // Publishing: the speed is checked first (with nothing over the frame), then the dialog shows it.
  const [labShown, setLabShown] = useState<Lab | null | "waiting">(null);
  const askPublish = async () => {
    // No page in the frame yet: nothing to check.
    if (!frameReady) { labResult.current = null; setLabShown(null); setAsking({ kind: "publish", force: false }); return; }
    setLabShown("waiting");
    const l = await runLab();
    labResult.current = l;
    setLabShown(l);
    setAsking({ kind: "publish", force: false });
  };
  // Real shoppers' speed lately (RUM), asked for when the page itself is picked.
  const rumAlerts = useQuery({ queryKey: ["rum-alerts"], queryFn: SpeedAPI.getRumAlerts, enabled: Boolean(index) && selected === index?.root, staleTime: 10 * 60_000, retry: false });
  /** Back to the page as it was before its last publish (its revision), after shoppers' speed got worse. */
  const rollback = async (revisionId: string) => {
    setBusy(true);
    try {
      await PagesAPI.restorePageRevision(id, revisionId, "Back after shoppers' speed got worse");
      toast.success(tr("رجعت الصفحة للنسخة اللي قبل", "The page went back to the version before"));
      await Promise.all([qc.invalidateQueries({ queryKey: ["pages", id] }), qc.invalidateQueries({ queryKey: ["rum-alerts"] })]);
      reload();
    } catch (e) {
      toast.error(tr("ما رجعت الصفحة", "The page didn't go back"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const publish = async (force: boolean, options: PagesAPI.PublishPageOptions = {}) => {
    setBusy(true);
    try {
      const page = pageQ.data;
      if (!page) return;
      const result = await PagesAPI.publishPageDraft(id, force, { ...options, rev: draft?.rev, expectedPublication: { status: page.status, slug: page.slug, publishAt: page.publishAt ?? null, unpublishAt: page.unpublishAt ?? null } });
      setCommerceIssues([]);
      // The speed checked before this publish is what the next one is compared with.
      keepLab(id, labResult.current);
      history.current = new History();
      await Promise.all([qc.invalidateQueries({ queryKey: ["pages", id] }), qc.invalidateQueries({ queryKey: ["pages"] })]);
      setAsking(null);
      if (result.publication?.state === "scheduled") toast.success(tr("انحفظ المحتوى حسب موعد النشر", "Content saved for the scheduled publication"));
      else if (result.publication?.state === "expired") toast.success(tr("انحفظ المحتوى؛ موعد إتاحة الصفحة منتهي", "Content saved; the publication window has ended"));
      else if (result.delivery?.state === "delivered") toast.success(tr("انحفظ النشر وتحدّث الموقع", "Publication saved and storefront refreshed"));
      else toast.success(tr("انحفظ النشر؛ تحديث الموقع لسه بحاجة تحقق", "Publication saved; storefront refresh still needs verification"));
      reload();
    } catch (e) {
      const code = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (statusOf(e) === 409 && code === "PAGE_CHANGED") setAsking({ kind: "publish", force: true, options });
      else if (code === "COMMERCE_PAGE_INVALID") {
        const issues = (e as { response?: { data?: { issues?: Array<{ code: string; nodeType: string }> } } }).response?.data?.issues;
        setCommerceIssues(Array.isArray(issues) ? issues : []);
        setAsking(null);
        toast.error(tr("راجع عناصر التجارة قبل النشر", "Review the commerce objects before publishing"));
      }
      else if (code === "PUBLICATION_CHANGED" || code === "DRAFT_CHANGED") {
        setAsking(null);
        await qc.invalidateQueries({ queryKey: ["pages", id] });
        toast.error(tr("حالة الصفحة أو المسودة تغيّرت؛ راجعها قبل النشر", "The page status or draft changed; review it before publishing"));
        reload();
      }
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

  const movePart = (d: Down, point: Pt) => {
    if (!d.partMove || !layout) return null;
    const documentPoint = (p: Pt) => ({ x: (p.x - pan.x) / zoom + layout.scroll.x, y: (p.y - pan.y) / zoom + layout.scroll.y });
    const offset = partDragOffset(d.partMove.parent, documentPoint(d.p), documentPoint(point), d.partMove.start);
    if (offset) send({ type: "previewLook", reset: true, inlineBox: d.partMove.inlineBox, target: d.partMove.target, vars: { ...d.partMove.vars, ...previewOf("moveX", offset.x), ...previewOf("moveY", offset.y) } });
    return offset;
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const p = local(e);
    const d = down.current;
    if (d && d.pointerId !== e.pointerId) return;
    if (d) {
      if (Math.hypot(p.x - d.p.x, p.y - d.p.y) > 4) d.moved = true;
      if (d.partMove && d.moved) { movePart(d, p); return; }
      if (d.grab && d.moved) {
        // Placed freely: it moves over its holder, meets what's beside it, or goes into another place.
        if (d.free) return moveFree(d, p, e);
        const n = nodeOf(d.grab);
        const t = n ? dropAt(p, n, d.group) : null;
        setDrop((was) => (was && t && was.parentId === t.parentId && was.index === t.index ? was : t));
        return;
      }
      if (d.panning) {
        if (d.moved) homeView.current = null;
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
    pointSelection.current.cancel();
    if (busy || editing || e.button > 1 || down.current && down.current.pointerId !== e.pointerId) return;
    // The canvas stops where it is (it may be gliding to the last pick): what's pressed stays under the pointer,
    // and the press isn't given up by the zoom changing under it.
    cancelAnimationFrame(glide.current);
    const p = local(e);
    if (focus && e.button === 0 && !panMode && inFrame(p)) {
      const fb = shapeOf(focus.id)?.box;
      if (fb && (p.x < fb.x - 6 || p.x > fb.x + fb.w + 6 || p.y < fb.y - 6 || p.y > fb.y + fb.h + 6)) closeFocus();
      else if (fb && sparklePen && index?.nodes.get(focus.id)?.node.type === "image") {
        const n = index.nodes.get(focus.id)!.node;
        const props = (n.props ?? {}) as Record<string, unknown>;
        const was = (props.sparkle as Sparkle | undefined) ?? { points: [] };
        if (was.points.length < 80) {
          const at = { x: Math.round(((p.x - fb.x) / fb.w) * 1000) / 1000, y: Math.round(((p.y - fb.y) / fb.h) * 1000) / 1000 };
          if (at.x >= 0 && at.x <= 1 && at.y >= 0 && at.y <= 1) void change(say("نجمة جديدة|A new star|כוכב חדש"), [{ op: "setProps", nodeId: n.id, props: { ...props, sparkle: { ...was, points: [...was.points, at] } } }]);
        }
        return;
      }
      else if (fb && focusModel && index) {
        const n = index.nodes.get(focusModel)!.node;
        const requestId = `m${++artSeq.current}`;
        modelWait.current = {
          requestId,
          done: (key, at) => {
            if (spotPen) {
              if (!at) return;
              const props = (n.props ?? {}) as Record<string, unknown>;
              const spots = (props.spots as Spot3d[] | undefined) ?? [];
              if (spots.length < 12) void change(say("نقطة على المجسّم|A point on the model|נקודה על המודל"), [{ op: "setProps", nodeId: n.id, props: { ...props, spots: [...spots, { id: `p${Date.now().toString(36)}`, at }] } }]);
              return;
            }
            const info = key ? modelInfo?.parts.find((x) => x.key === key) : undefined;
            setFocus((f) => (f && f.id === n.id ? { ...f, part: key ? { id: key, label: info?.label || key, kind: "mesh", depth: 0 } : null } : f));
          },
        };
        if (selected !== n.id) select(n.id);
        send({ type: "modelPick", requestId, nodeId: n.id, x: (p.x - pan.x) / zoom, y: (p.y - pan.y) / zoom });
        return;
      }
      else if (fb && focusArt && index) {
        // Inside an open drawing a click picks its shape (the frame knows which is under the point).
        const art = focusArt;
        const requestId = `art${++artSeq.current}`;
        artPick.current = {
          requestId,
          done: (pid) => {
            const n = index.nodes.get(art)?.node;
            const fp = pid && n ? focusParts(n, index).find((x) => x.id === pid) ?? null : null;
            setFocus((f) => (f && f.id === art ? { ...f, part: fp } : f));
          },
        };
        if (selected !== art) select(art);
        send({ type: "artPick", requestId, nodeId: art, x: (p.x - pan.x) / zoom, y: (p.y - pan.y) / zoom });
        return;
      }
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const panning = e.button === 1 || panMode || !inFrame(p);
    const touch = e.pointerType === "touch";
    // Dragging a selected element (or from inside it) moves it, and the others selected with it; sections move in the layers. With Shift a box is drawn instead.
    const movable = (x: string | null) => Boolean(x && isFree(nodeOf(x)?.type) && !["section", "cell", "columns", "page"].includes(nodeOf(x)?.type ?? "") && !lockedIn.has(x) && (directGeometrySafe(x) || canvasMode === "flow" && !placedOn(nodeOf(x)!, screen)));
    const hit = !panning && !e.shiftKey && e.button === 0 ? pickAt(grid.near(p), p) : null;
    const hitPath = hit && index ? pathTo(index, hit.id, up) : [];
    // Pressed on an inner part (a label, a quote, a picture inside a widget): its object is what moves.
    const hitNode = [...hitPath].reverse().find((x) => index?.nodes.has(x)) ?? null;
    // A selected inner part pressed on moves itself (below), not its object.
    const onOwnPart = selExtra?.kind === "detail" && Boolean(selected && hitPath.includes(selected));
    const grab = onOwnPart ? null : movable(selected) && selected && hitPath.includes(selected) ? selected : chosen.length > 1 ? chosen.find((c) => movable(c) && hitPath.includes(c)) ?? null : !touch && hitNode && movable(hitNode) ? hitNode : null;
    // What's inside another selected element goes with it.
    const group = grab && chosen.length > 1 && chosen.includes(grab) && index ? loose.filter((x) => movable(x) && !loose.some((y) => y !== x && pathTo(index, x, up).includes(y))) : grab ? [grab] : [];
    const starts = new Map(group.map((x) => [x, shapeOf(x)?.box] as const).filter((v): v is [string, Box] => Boolean(v[1])));
    if (grab && !chosen.includes(grab)) select(grab);
    if (grab && motionLive) { setMotionLive(false); send({ type: "motionLive", on: false }); }
    const free=grab?freeDragOf(grab,group):undefined;
    const analytic=grab&&free?analyticDragOf(grab,free.ids,p):undefined;
    if(free&&free.ids.some(needsPlaneMove)&&!analytic)return;
    let partMove: PartMove | undefined;
    if (!grab && !panning && !e.shiftKey && selected && hitPath.includes(selected) && lookTarget && selExtra?.kind === "detail" && styleState === "normal") {
      const measured = layout?.items.find(item => item.kind === "detail" && item.owner === selExtra.owner && item.key === selExtra.key);
      const parent = measured?.kind === "detail" ? measured.geometry?.parentPlane : undefined;
      if (parent && measured?.kind === "detail" && measured.geometry?.partMoveSafe && !shownLook(lookSel!, screen, "layer") && inverse3(parent.matrix)) {
        const vars = Object.assign({}, ...["rotateX", "rotateY", "rotateZ", "scale", "perspective"].map(key => {
          const value = shownLook(lookSel!, screen, key); return typeof value === "number" ? previewOf(key, value) : {};
        }));
        partMove = { vars, inlineBox: measured.geometry.inline, target: lookTarget.target, kind: lookTarget.kind, parent, start: { x: Number(shownLook(lookSel!, screen, "moveX") ?? 0), y: Number(shownLook(lookSel!, screen, "moveY") ?? 0) }, screen, style: { ...((lookSel?.style?.[screen] ?? {}) as Record<string, unknown>) } };
        if (motionLive) { setMotionLive(false); send({ type: "motionLive", on: false }); }
      }
    }
    down.current = { pointerId: e.pointerId, before: selected, p, pan, panning, touch, moved: false, y: p.y, grab, group, starts, free,analytic, partMove };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = down.current;
    if (d && d.pointerId !== e.pointerId) return;
    down.current = null;
    lastPress.current = { moved: Boolean(d?.moved), at: performance.now(), p: d ? local(e) : null };
    if (d?.partMove && d.moved) {
      const offset = movePart(d, local(e));
      if (offset) void run(tr("المكان", "Place"), [{ op: "setLookStyle", target: d.partMove.target, kind: d.partMove.kind, screen: d.partMove.screen, style: { ...d.partMove.style, ...(d.partMove.inlineBox ? { inlineBox: true } : {}), moveX: offset.x, moveY: offset.y } }]).finally(() => send({ type: "previewLook", target: d.partMove!.target, vars: null }));
      else send({ type: "previewLook", target: d.partMove.target, vars: null });
      return;
    }
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
      setGuides([]);
      return;
    }
    if (!d || d.moved || !index) return;
    const p = local(e);
    if (!inFrame(p)) return;
    const alt = e.altKey, shift = e.shiftKey, deepest = e.ctrlKey || e.metaKey;
    // The object first, inside it on a second click, the deepest with Ctrl/⌘ (clickPick).
    const before = d.before ?? null;
    pickPoint(p, ids => {
      const target = clickPick(ids, alt ? selected : before, { deep: deepSelection, deepest, cycle: alt, isPart: (x) => x.startsWith("detail:"), pathOf: (x) => pathTo(index, x, up) }) ?? index.root;
      if (shift && target && isFree(index.nodes.get(target)?.node.type)) return toggleChosen(target);
      select(target);
    });
  };

  // Ctrl/⌘ + wheel zooms around the cursor; the wheel alone scrolls the shop (or moves the canvas outside the frame).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      pointSelection.current.cancel();
      cancelAnimationFrame(glide.current);
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) {
        const next = zoomAround(pan, zoom, p, zoom * Math.exp(-e.deltaY * 0.0015));
        homeView.current = null;
        setZoom(next.zoom);
        setPan(next.pan);
      } else if (p.x >= pan.x && p.x <= pan.x + dev.w * zoom && p.y >= pan.y && p.y <= pan.y + dev.h * zoom) {
        // The page scrolls; where it ends, the canvas moves until the frame's hidden edge shows (canvasWheel.ts).
        const step = wheelOver({ x: e.deltaX, y: e.deltaY }, { zoom, pan }, { w: dev.w, h: dev.h }, canvas, layout);
        if (step.scroll.x || step.scroll.y) send({ type: "scrollBy", dx: step.scroll.x, dy: step.scroll.y });
        if (step.pan.x || step.pan.y) setPan({ x: pan.x + step.pan.x, y: pan.y + step.pan.y });
      } else setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [pan, zoom, dev.w, dev.h, send, canvas, layout]);

  /* --------------------------------------------------------- keyboard */

  const zoomBy = useCallback(
    (k: number) => {
      pointSelection.current.cancel();
      cancelAnimationFrame(glide.current);
      homeView.current = null;
      const next = zoomAround(pan, zoom, { x: canvas.w / 2, y: canvas.h / 2 }, zoom * k);
      setZoom(next.zoom);
      setPan(next.pan);
    },
    [pan, zoom, canvas.w, canvas.h],
  );
  /** Glides the canvas to a view (focus mode's way in and out, zoom to selection). */
  const glideTo = (to: View, ms = 380) => {
    cancelAnimationFrame(glide.current);
    const from = { zoom, pan };
    if (sameView(from, to) || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setZoom(to.zoom);
      setPan(to.pan);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const v = viewAt(from, to, (now - t0) / ms);
      // Drawn at once: a press that comes between two steps meets the canvas as it shows (never a step behind,
      // which would give the press up when that step's zoom arrived after it).
      flushSync(() => {
        setZoom(v.zoom);
        setPan(v.pan);
      });
      if (now - t0 < ms) glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  };
  const zoomToSelected = () => {
    pointSelection.current.cancel();
    const s = shapeOf(selected);
    if (!s || !canvas.w) return;
    glideTo(focusView(s.box, { zoom, pan }, canvas, 0.6, 0));
  };
  /** Opens an element on its own (focus mode): the canvas glides to it, the rest dims, its own editor opens. */
  const openFocus = (sid: string | null) => {
    const n = sid ? index?.nodes.get(sid)?.node : undefined;
    const s = shapeOf(sid);
    if (!sid || !s || !canvas.w || s.box.w < 1 || s.box.h < 1) return false;
    // An old section, a store scene, a saved block or a part inside one has no editor of its own: it still opens
    // on its own (zoomed to, the rest dimmed), with its usual settings beside it.
    const lite = !n || !canFocus(n) || !isFree(n.type);
    pointSelection.current.cancel();
    select(sid);
    setFocus((f) => ({ id: sid, part: null, back: f?.back ?? { zoom, pan }, ...(lite ? { lite: true } : {}) }));
    // Beside the element: it comes to the part of the canvas the floating inspector leaves free.
    const to = beside ? frameFor(visiblePart(s.box, frameBox)?.box ?? s.box, { zoom, pan }, canvas, sideOf(inspGroup), { maxZoom: 4, fit: true }) : focusView(s.box, { zoom, pan }, canvas);
    if (to) glideTo(to);
    return true;
  };
  const closeFocus = () => {
    if (!focus) return;
    setFocus(null);
    setFocusAll(false);
    glideTo(focus.back);
  };

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const onDown = (e: KeyboardEvent) => {
      // In focus mode Esc still steps out after a choice in a list or a tick (nothing is being written there).
      const picked = e.key === "Escape" && focus && (e.target instanceof HTMLSelectElement || (e.target instanceof HTMLInputElement && ["checkbox", "radio", "range", "color", "button"].includes(e.target.type)));
      if (picked) (e.target as HTMLElement).blur();
      if ((typing(e.target) && !picked) || !index) return;
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y")) {
        e.preventDefault();
        if (e.key.toLowerCase() === "y" || e.shiftKey) void redoLast();
        else void undoLast();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setKeysOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && keysOpen) {
        setKeysOpen(false);
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
        pointSelection.current.cancel();
        if ((down.current?.grab || down.current?.partMove) && down.current.moved) return cancelDrag();
        if (themeOpen) return setThemeOpen(false);
        if (more.length) return setMore([]);
        // Focus mode: the part goes first, then what's chosen inside, then the mode itself.
        if (focus) {
          if (focus.part) return setFocus({ ...focus, part: null });
          if (selected !== focus.id) return select(focus.id);
          return closeFocus();
        }
        setSelected((s) => parentOf(s));
        return;
      }
      if (!mod && k === "f" && selected && !focus && !e.altKey && !e.shiftKey) {
        if (openFocus(selected)) e.preventDefault();
        return;
      }
      if (e.key === "Enter" && selected) {
        if (startText(selected)) return e.preventDefault();
        const first = index.nodes.get(selected)?.children[0] ?? shapes.find(s => s.parentId === selected)?.id;
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

  // A drawing open in focus mode: the frame measures its shapes (again whenever the page is measured).
  const focusArt = focus && index?.nodes.get(focus.id)?.node.type === "svg" ? focus.id : null;
  useEffect(() => {
    if (!focusArt) {
      setArtInfo(null);
      return;
    }
    send({ type: "artParts", nodeId: focusArt });
  }, [focusArt, layout, send]);

  // A 3D model open in focus mode: the frame reads its parts (again as the page is measured, and while its file loads).
  const focusModel = focus && index?.nodes.get(focus.id)?.node.type === "model3d" ? focus.id : null;
  useEffect(() => {
    if (!focusModel) {
      setModelInfo(null);
      return;
    }
    send({ type: "modelParts", nodeId: focusModel });
  }, [focusModel, layout, send]);
  useEffect(() => {
    if (!focusModel || (modelInfo?.nodeId === focusModel && modelInfo.ready)) return;
    const t = window.setTimeout(() => send({ type: "modelParts", nodeId: focusModel }), 900);
    return () => window.clearTimeout(t);
  }, [focusModel, modelInfo, send]);

  // A picture open in focus mode: the frame tells its own size (again when the page is measured anew).
  const focusImage = focus && index?.nodes.get(focus.id)?.node.type === "image" ? focus.id : null;
  useEffect(() => {
    if (focusImage) send({ type: "imageInfo", nodeId: focusImage });
  }, [focusImage, frameKey, send]);

  // Focus mode ends when its element is gone (deleted, undone) or the screen changes (the view is fitted again).
  useEffect(() => {
    if (focus && index && !index.nodes.has(focus.id) && !(focus.lite && shapes.some((x) => x.id === focus.id))) setFocus(null);
  }, [focus, index, shapes]);
  useEffect(() => {
    setFocus(null);
    setFocusAll(false);
  }, [device]);

  // The layers list follows what's selected on the page.
  useEffect(() => {
    if (!selected) return;
    document.querySelectorAll(`[data-testid="studio-layer"][data-node="${CSS.escape(selected)}"]`).forEach((el) => el.scrollIntoView({ block: "nearest" }));
  }, [selected]);

  /* ------------------------------------------------- the inspector beside what's selected */
  const besideShape = beside && selected && index && selected !== index.root ? shapeOf(selected) : null;
  const canvasRect = beside ? canvasRef.current?.getBoundingClientRect() : undefined;
  const besidePlaced = beside && canvasRect && canvasRect.width > 0
    ? besidePlace(besideShape ? (visiblePart(besideShape.box, frameBox)?.box ?? besideShape.box) : null, { x: canvasRect.left, y: canvasRect.top, w: canvasRect.width, h: canvasRect.height }, besideShape && inspGroups.length ? sideOf(inspGroup) : "right")
    : null;
  // Nothing selected: the panel waits behind its button. Something being dragged (moved, dropped in, a box drawn):
  // the strips and the panel get out of the way, so where it goes shows.
  const besideIdle = beside && !selected;
  // No strips of tabs beside it (nothing selected, the page itself, or something with no sections of settings):
  // the panel has a button of its own to show and hide it.
  const besideLone = beside && !(besideShape && inspGroups.length);
  const besideShown = besideIdle ? idleOpen : inspOpen;
  const besideToggle = () => (besideIdle ? setIdleOpen((v) => !v) : setInspOpen((v) => !v));
  const dragBusy = Boolean(placing || drop || dragView || marquee);
  // What a late timer needs as it is now (the view, the shapes), not as it was when the selection changed.
  const besideNow = useRef({ zoom, pan, canvas, shapes, frameBox, group: inspGroup, glide: glideTo, writing: Boolean(editing) });
  besideNow.current = { zoom, pan, canvas, shapes, frameBox, group: inspGroup, glide: glideTo, writing: Boolean(editing) };
  const besideSide = sideOf(inspGroup);
  // A newly picked element comes closer where the panel leaves room, when it's small or under the panel (frameFor:
  // the page is never made smaller for a pick, and moves as little as it can). Not while it's being dragged or
  // written in, not between the clicks of a double click, not while the page is still scrolling to it, and not in
  // focus mode, which has its own way in. With nothing selected the canvas goes back to where it was.
  useEffect(() => {
    if (!beside) return;
    // Anything newly picked shows its settings again (the panel may have been closed for the last one).
    if (selected) setInspOpen(true);
    if (!selected || selected === index?.root) {
      if (homeView.current && !focus) { besideNow.current.glide(homeView.current); homeView.current = null; }
      return;
    }
    if (focus) return;
    const at = performance.now();
    let tries = 0;
    let timer = 0;
    let seen: Box | null = null;
    const again = (ms: number) => { if (++tries < 24) timer = window.setTimeout(run, ms); };
    const run = () => {
      const v = besideNow.current;
      const s = v.shapes.find((x) => x.id === selected);
      // Still on its way (the page is scrolling to it, or it has just been measured): wait until it rests.
      const still = Boolean(s && seen && Math.abs(seen.x - s.box.x) < 0.5 && Math.abs(seen.y - s.box.y) < 0.5 && Math.abs(seen.w - s.box.w) < 0.5 && Math.abs(seen.h - s.box.h) < 0.5);
      seen = s?.box ?? null;
      // The view stays still under a press, and for a moment after one: a second click or a double click lands
      // where the first one did.
      if (down.current) return again(150);
      const rest = performance.now() - lastPress.current.at;
      if (rest < PICK_REST) return again(PICK_REST - rest + 10);
      if (lastPress.current.moved && lastPress.current.at >= at - 60) return;
      if (v.writing) return;
      if (!s) return again(150);
      if (!still) return again(90);
      // Picked with the pointer: the zoom keeps that point still.
      const anchor = lastPress.current.p && !lastPress.current.moved && performance.now() - lastPress.current.at < 2000 ? lastPress.current.p : null;
      const to = frameFor(visiblePart(s.box, v.frameBox)?.box ?? s.box, { zoom: v.zoom, pan: v.pan }, v.canvas, sideOf(v.group), { anchor, home: homeView.current });
      if (!to) return;
      if (homeView.current && sameView(to, homeView.current)) homeView.current = null;
      else if (!homeView.current) homeView.current = { zoom: v.zoom, pan: v.pan };
      v.glide(to);
    };
    timer = window.setTimeout(run, 160);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, beside, besideSide]);

  /* ----------------------------------------------------------- drawing */

  /** An inner object's kind by name: a box inside a widget is a box, never a "section". */
  const detailKind = (kind: PagesAPI.LookKind) => (kind === "box" ? tr("صندوق", "Box") : typeLabel(kind));
  const label = (sid: string) => {
    const x = extras.get(sid);
    if (x?.kind === "region") return x.region === "header" ? tr("الهيدر", "Header") : tr("الفوتر", "Footer");
    if (x?.kind === "block" || sid.startsWith("block:")) return `${tr("مشهد", "Scene")} · ${BLOCK_LABEL[x?.kind === "block" ? x.block : sid.slice(6)]?.() ?? sid}`;
    if (x?.kind === "part") return x.count > 1 ? `${partLabel(x.name)} ${x.n + 1}` : partLabel(x.name);
    if (x?.kind === "detail") return x.name ? partLabel(x.name) : x.label ? `${detailKind(x.lookKind)} · ${x.label}` : detailKind(x.lookKind);
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
    // Turned, skewed or tipped: its real outline is drawn, and the box around it only hinted.
    const quad = kind !== "parent" && s.outline && !outlineIsBox(s.outline, s.box) ? s.outline : null;
    // Tiny on screen: a ring around it, so what's selected (or about to be) can be seen.
    const tiny = kind !== "parent" && Math.min(s.box.w, s.box.h) < TINY_SEEN;
    const ring = Math.max(s.box.w, s.box.h) + 14;
    const cls = quad
      ? (kind === "selected" ? "border border-dashed border-accent-400/40" : "border border-dashed border-accent-300/30")
      : kind === "selected" ? "border-2 border-accent-400 bg-accent-400/[0.06]" : kind === "hover" ? "border border-dashed border-accent-300/90" : "border border-accent-400/35";
    // Where it goes on past the frame, its side is dashed.
    const cut = { borderTopStyle: seen.above ? "dashed" : undefined, borderBottomStyle: seen.below ? "dashed" : undefined } as const;
    return (
      <Fragment key={`${kind}-${sid}`}>
      {quad ? (
        <svg className={`pointer-events-none absolute overflow-visible ${kind === "selected" ? "text-accent-400" : "text-accent-300"}`} style={{ left: 0, top: 0, width: 1, height: 1 }} aria-hidden="true" data-testid={`studio-${kind}-quad`}>
          <polygon points={quad.map((pt) => `${pt.x - frameBox.x},${pt.y - frameBox.y}`).join(" ")} fill="currentColor" fillOpacity={kind === "selected" ? 0.06 : 0} stroke="currentColor" strokeWidth={kind === "selected" ? 2 : 1} strokeDasharray={kind === "selected" ? undefined : "4 3"} strokeLinejoin="round" />
        </svg>
      ) : null}
      {tiny ? <div className={`pointer-events-none absolute rounded-full ${kind === "selected" ? "border-2 border-accent-400/80 bg-accent-400/[0.08]" : "border border-dashed border-accent-300/80"}`} style={{ left: s.box.x + s.box.w / 2 - frameBox.x - ring / 2, top: s.box.y + s.box.h / 2 - frameBox.y - ring / 2, width: ring, height: ring }} data-testid={`studio-${kind}-ring`} /> : null}
      <div className={`pointer-events-none absolute ${cls}`} style={{ ...style, ...cut }} data-testid={`studio-${kind}`} data-cut={seen.above || seen.below ? "1" : undefined} data-quad={quad ? "1" : undefined}>
        {kind !== "parent" ? (
          // Above the box; inside it when the box touches the top of the frame (or goes on above it).
          // A tiny one's name stands beside its ring, clear of its handles and its turning knob.
          <span className={`absolute inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] ${tiny ? "start-full top-1/2 ms-5 -translate-y-1/2" : `start-0 ${style.top < 24 || seen.above ? "top-0" : "-top-6"}`} ${kind === "selected" ? "bg-accent-500 text-white" : "bg-surface-900/90 text-white/85"}`} data-testid={`studio-${kind}-name`}>
            {seen.above ? <span aria-hidden="true">↑</span> : null}
            <span>{label(sid!)}</span>
            {/* Its own size: along its real sides when it's turned, not the box around it. */}
            {kind === "selected" ? <span className="opacity-75" dir="ltr" data-testid="studio-selected-size">{quad && quad.length === 4 ? `${Math.round(Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y) / zoom)}×${Math.round(Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y) / zoom)}` : `${Math.round(s.box.w / zoom)}×${Math.round(s.box.h / zoom)}`}</span> : null}
          </span>
        ) : null}
        {kind === "selected" && seen.below ? <span className="absolute bottom-1 start-1/2 -translate-x-1/2 rounded-full bg-accent-500 px-1.5 text-[11px] text-white" aria-hidden="true">↓</span> : null}
      </div>
      </Fragment>
    );
  };

  const selPath = index ? pathTo(index, selected, up) : [];
  /** A step of the path above what's selected, by its kind. */
  const crumb = (pid: string) => {
    const n = index?.nodes.get(pid)?.node;
    if (n) return n.type === "roseBlock" ? tr("مشهد", "Scene") : typeLabel(n.type);
    const x = extras.get(pid);
    if (x?.kind === "part") return partLabel(x.name);
    if (x?.kind === "detail") return x.name ? partLabel(x.name) : detailKind(x.lookKind);
    if (x?.kind === "auto") return tagLabel(x.tag);
    if (x?.kind === "slot") return x.edit === "media" ? (x.media === "video" ? typeLabel("video") : typeLabel("image")) : x.link ? typeLabel("button") : typeLabel("text");
    return pid.startsWith("block:") ? tr("مشهد", "Scene") : typeLabel("text");
  };
  const parentOf = (sid: string | null) => (sid && index ? pathTo(index, sid, up).slice(-2, -1)[0] ?? null : null);
  const selNode = selected ? index?.nodes.get(selected) : undefined;
  const selShape = shapeOf(selected);
  const selExtra = selected ? extras.get(selected) : undefined;
  const selectedRegion = selExtra?.kind === "region" ? selExtra.region : selExtra?.kind === "detail" && /^r:(header|footer)$/.test(selExtra.owner) ? selExtra.owner.slice(2) as "header" | "footer" : null;
  const partContent = partContentOf(selected);
  const partHref = partContent ? bindingLink(partContent.owner.props, partContent.binding) : null;
  const selBlock = selExtra?.kind === "block" ? selExtra.block : selNode?.node.type === "roseBlock" ? String(selNode.node.props.block) : selected?.startsWith("block:") ? selected.slice(6) : null;
  const selSection = selNode?.node.type === "legacy" ? sectionOf(String(selNode.node.props.sectionId)) : undefined;

  /* -------------------------------------- looks: parts of old sections and scenes */

  /** What's selected as a look's target (a field or marked piece of an old section or scene, or the whole of one). */
  const lookTarget: { target: string; kind: PagesAPI.LookKind } | null = (() => {
    const x = selExtra;
    if (x?.kind === "detail" && !x.owner.startsWith("r:")) return { target: `${x.owner}/${x.target}`, kind: x.lookKind };
    if (x?.kind === "auto" && x.target) return { target: `${x.owner}/${x.target}`, kind: /^(img|picture)$/.test(x.tag) ? "image" : x.tag === "video" ? "video" : /^(button|a)$/.test(x.tag) ? "button" : /^(h[1-6]|p|blockquote|li)$/.test(x.tag) ? "text" : "box" };
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
        <BoxPanel node={view} screen={screen} busy={busy} onOps={put} skip={boxSkip(node.type)} />
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
  }, [stateTarget, styleState, frameReady, layout?.viewVersion, send]);
  const selSiblings = selNode?.parentId ? index?.nodes.get(selNode.parentId)?.children ?? [] : [];
  const selPos = selected ? selSiblings.indexOf(selected) : -1;
  /** Sends changes; selects `then` once they're saved. */
  const change = async (label: string, ops: PagesAPI.PageDraftOp[], then?: string | null) => {
    if (!ops.length) return;
    if (!(await run(label, ops)) || then === undefined) return;
    setSelected(then);
    setMore([]);
    revealNext.current = then;
    if (then) send({ type: "reveal", nodeId: then });
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
  /** The selected element becomes a main component; an instance of it takes its place here. */
  const makeComponent = async (node: PagesAPI.PageTreeNode, name: string) => {
    if (!index) return;
    const parentId = index.nodes.get(node.id)?.parentId;
    if (!parentId) return;
    const at = index.nodes.get(parentId)!.children.indexOf(node.id);
    // Its place on this page stays with the instance; its look goes to the component.
    const style = Object.fromEntries(Object.entries((node.style ?? {}) as Record<string, Record<string, unknown> | undefined>).map(([screen, st]) => { const { layer: _layer, ...rest } = st ?? {}; return [screen, rest]; }).filter(([, st]) => Object.keys(st as object).length));
    try {
      const c = await PagesAPI.createComponent(name, { ...structuredClone(node), ...(Object.keys(style).length ? { style } : { style: undefined }) });
      qc.setQueryData(["page-components"], (was: PagesAPI.ComponentInfo[] | undefined) => [c, ...(was ?? []).filter((x) => x.id !== c.id)]);
      const place = placeOnly(node.style);
      const inst: PagesAPI.PageTreeNode = { ...newInstance(c, makeIds()), ...(place ? { style: place } : {}) };
      await change(say("مكوّن رئيسي|Main component|רכיב ראשי"), [{ op: "remove", nodeId: node.id }, { op: "insert", parentId, index: Math.max(0, at), node: inst }], inst.id);
      toast.success(say("صار مكوّن رئيسي: غيّره مرة وبيتغيّر بكل مكان|It's a main component now: change it once, it changes everywhere|זה רכיב ראשי עכשיו: שנה פעם אחת וזה משתנה בכל מקום"));
    } catch (e) {
      toast.error(say("ما انعمل المكوّن|The component wasn't made|הרכיב לא נוצר"), { description: getApiErrorMessage(e) });
    }
  };
  /** An instance becomes a plain copy of its variant (with its own changes), in its place. */
  const detachInstance = (inst: PagesAPI.PageTreeNode, variant: PagesAPI.PageTreeNode) => {
    if (!index) return;
    const parentId = index.nodes.get(inst.id)?.parentId;
    if (!parentId) return;
    const at = index.nodes.get(parentId)!.children.indexOf(inst.id);
    const copy = detached(inst, variant, makeIds());
    void change(say("فصل المكوّن|Detach the component|ניתוק הרכיב"), [{ op: "remove", nodeId: inst.id }, { op: "insert", parentId, index: Math.max(0, at), node: copy }], copy.id);
  };
  /** A main component's next variant: a copy of its last one, named after its number. */
  const addVariant = () => {
    if (!index) return;
    const sec = (index.nodes.get(index.root)?.children ?? []).map((x) => index.nodes.get(x)?.node).find((n) => n?.type === "section");
    const last = sec?.children?.at(-1);
    if (!sec || !last) return;
    const copy = { ...copyOf(last, makeIds()), name: `${say("نسخة|Variant|גרסה")} ${(sec.children?.length ?? 0) + 1}` };
    void change(say("نسخة جديدة|New variant|גרסה חדשה"), [{ op: "insert", parentId: sec.id, index: sec.children!.length, node: copy }], copy.id);
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
    pointSelection.current.cancel();
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
      ...(menu?.candidates?.length ? [{ label: tr("العناصر تحت المؤشر", "Objects under the pointer"), onClick: () => {}, disabled: true }, ...menu.candidates.slice(0, 30).map(sid => ({ label: label(sid), onClick: () => select(sid, true) })), "line" as const] : []),
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
    if(targets.some(needsPlaneMove)){
      if(busy)return;
      if(!nz.planes){
        const snapshots=targets.map(id=>{const n=nodeOf(id),frame=planeOf(id),holder=parentPlaneOf(id),parentId=index?.nodes.get(id)?.parentId;return n&&frame&&holder&&parentId?{id,frame,holder,parentId,look:effectiveLook(n,screen),movement:movementOf(n,screen),free:Boolean(placedOn(n,screen))}:null;});
        if(snapshots.some(item=>!item))return;
        nz.planes=snapshots as NonNullable<typeof nz.planes>;
      }
      nz.dx+=d.x;nz.dy+=d.y;
      const planned=nz.planes.map(item=>({item,change:planeNudgePatch(item.frame,item.holder,item.look,{x:nz.dx,y:nz.dy},item.movement,dragPrefs.inside,rtl)}));
      const ops=planned.filter(item=>item.change).map(({item,change})=>styleOp(nodeOf(item.id)!,screen,change!.patch));
      previewGeometry(ops);
      window.clearTimeout(nz.timer);
      nz.timer=window.setTimeout(()=>{nudging.current={dx:0,dy:0,timer:0};if(ops.length)void change(tr("تحريك","Nudge"),[...new Set(nz.planes!.filter(item=>!item.free).map(item=>item.parentId))].flatMap(pinHolder).concat(ops)).finally(clearGeometry);else clearGeometry();},450);
      return;
    }
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
  const planeOf=(sid:string)=>{const p=itemOf(sid)?.geometry?.plane;return p&&layout?canvasPlane(p,layout.scroll,pan,zoom):null;};
  const parentPlaneOf=(sid:string)=>{const p=itemOf(sid)?.geometry?.holderPlane;return p&&layout?canvasPlane(p,layout.scroll,pan,zoom):null;};
  const needsPlaneMove=(sid:string)=>{const n=nodeOf(sid),scroll=itemOf(sid)?.geometry?.holderScroll;return Boolean(n&&(itemOf(sid)?.parentScale===null||Number(shownLook(n,screen,"rotateX")??0)||Number(shownLook(n,screen,"rotateY")??0)||movementOf(n,screen)!=="free"||scroll?.x||scroll?.y));};
  const needsPlane=(sid:string)=>needsPlaneMove(sid)||Boolean(nodeOf(sid)&&Object.keys(effectiveConstraints(nodeOf(sid)!,screen)).length);
  const holderScaleOf = (sid: string) => {
    const it = itemOf(sid);
    if (it?.innerScale === null || it?.parentScale === null) return null;
    return it?.innerScale ?? parentScaleOf(sid) * Number(shownLook(nodeOf(sid)!, screen, "scale") ?? 1);
  };
  const directGeometrySafe = (sid: string) => {
    const n = nodeOf(sid);
    const geometry=itemOf(sid)?.geometry;
    if(geometry){
      const frame=planeOf(sid),holder=parentPlaneOf(sid);
      return Boolean(n&&!geometry.unsupported&&frame&&holder&&inverse3(frame.matrix)&&inverse3(holder.matrix));
    }
    return Boolean(n && itemOf(sid)?.parentScale !== null && !Number(shownLook(n, screen, "rotateX") ?? 0) && !Number(shownLook(n, screen, "rotateY") ?? 0));
  };
  const handleGeometry=(node:PagesAPI.PageTreeNode)=>{
    if(!needsPlane(node.id))return undefined;
    const frame=planeOf(node.id),holder=parentPlaneOf(node.id);if(!frame||!holder)return undefined;
    const look={...effectiveLook(node,screen),constraints:effectiveConstraints(node,screen)};
    return {plane:frame,resize:(handle:import("./handles").Handle,delta:Pt,keep:boolean)=>planeResizePatch(frame,holder,look,handle,delta,{rtl,keep,scaleContents:scaleContents&&Boolean(node.children?.length)})};
  };
  const setSizeConstraints=(node:PagesAPI.PageTreeNode,value:SizeConstraints)=>{
    const styles=node.style as Record<string,Record<string,unknown>>|undefined;
    const next={...node,style:{...styles,[screen]:{...styles?.[screen],constraints:value}}};
    const effective=effectiveConstraints(next,screen),size=itemOf(node.id)?.geometry?.plane??itemOf(node.id)?.size;
    const solved=constrainSize(size?.w??100,size?.h??100,effective);
    if(!solved||!validResponsiveConstraints(next)){toast.error(tr("حدود الحجم والنسبة متعارضة. عدّل الحدود لتسمح بحجم صالح.","The size limits and ratio conflict. Adjust them to allow a valid size."));return;}
    const patch:Record<string,unknown>={constraints:Object.keys(value).length?value:null};
    if(effective.aspectRatio!==undefined&&size&&(Math.abs(size.w-solved.w)>1e-5||Math.abs(size.h-solved.h)>1e-5))Object.assign(patch,{width:`${Number(solved.w.toFixed(6))}px`,height:`${Number(solved.h.toFixed(6))}px`,maxWidth:`${Number(solved.w.toFixed(6))}px`,minHeight:"0px"});
    void change(tr("حدود الحجم","Size limits"),[styleOp(node,screen,patch)]);
  };
  const applyFixedGap=(axis:"x"|"y")=>{
    const first=chosen[0],parentId=index?.nodes.get(first)?.parentId,holder=first?parentPlaneOf(first):null,inv=holder&&inverse3(holder.matrix);
    if(!holder||!inv||chosen.some(id=>index?.nodes.get(id)?.parentId!==parentId)){toast.error(tr("اختار عناصر من نفس الحاوية لتوزيع المسافات.","Select objects in the same container to set their spacing."));return;}
    const items=chosen.map(id=>{const node=nodeOf(id),frame=planeOf(id);const points=frame&&planeQuad(multiply3(inv,frame.matrix),frame);return node&&frame&&points?{node,frame,box:boundsOfQuad(points)}:null;});
    if(items.some(item=>!item?.box))return;
    const boxes=items.map(item=>item!.box!),solved=spaceBoxes(boxes,axis,fixedGap,{x:0,y:0,w:holder.w,h:holder.h});
    if(!solved){toast.error(tr("المسافة المطلوبة لا تتسع داخل الحاوية.","The requested spacing does not fit inside the container."));return;}
    const changes=items.map((item,i)=>planeMoveLocalPatch(item!.frame,holder,effectiveLook(item!.node,screen),{x:solved[i].x-boxes[i].x,y:solved[i].y-boxes[i].y},rtl,!placedOn(item!.node,screen)));
    if(changes.some(item=>!item))return;
    void change(tr("مسافة ثابتة","Fixed spacing"),[...(parentId?pinHolder(parentId):[]),...items.map((item,i)=>styleOp(item!.node,screen,changes[i]!.patch))]);
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
    if(change.plane)return [...(!placedOn(node,screen)&&parentId&&!(scaleContents&&node.children?.length)?pinHolder(parentId):[]),styleOp(node,screen,change.plane.patch)];
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
    if(needsPlane(sid)&&s.outline)return {kind:"poly",pts:s.outline};
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
  const analyticDragOf=(grab:string,ids:string[],point:Pt):Down["analytic"]=>{
    if(!ids.some(needsPlaneMove))return undefined;
    const holder=parentPlaneOf(grab),inv=holder&&inverse3(holder.matrix);if(!holder||!inv)return undefined;
    const parentId=index?.nodes.get(grab)?.parentId;
    const snapshot=(id:string):PlaneItem|null=>{const n=nodeOf(id),frame=planeOf(id),parent=index?.nodes.get(id)?.parentId;return n&&frame&&parent?{id,frame,look:effectiveLook(n,screen),parentId:parent,free:Boolean(placedOn(n,screen))}:null;};
    const items=ids.map(snapshot);if(items.some(item=>!item))return undefined;
    const selectedItems=items as PlaneItem[];
    const modes=selectedItems.map(item=>movementOf(nodeOf(item.id)!,screen));
    if(modes.includes("horizontal")&&modes.includes("vertical"))return undefined;
    const movement=modes.includes("horizontal")?"horizontal":modes.includes("vertical")?"vertical":modes.includes("both")?"both":"free";
    const peers=(index?.nodes.get(parentId??"")?.children??[]).filter(id=>!ids.includes(id)).map(snapshot).filter((item):item is PlaneItem=>Boolean(item));
    let frame=selectedItems[0].frame,look=selectedItems[0].look;
    if(items.length>1){
      const points=selectedItems.flatMap(item=>planeQuad(multiply3(inv,item.frame.matrix),item.frame)??[]),bounds=boundsOfQuad(points);if(!bounds)return undefined;
      frame={w:bounds.w,h:bounds.h,matrix:multiply3(holder.matrix,[1,0,bounds.x,0,1,bounds.y,0,0,1])};look={};
    }
    const drag=startPlaneDrag(frame,holder,look,rtl,point,peers.map(item=>({id:item.id,frame:item.frame,push:item.free&&!lockedIn.has(item.id)&&movementOf(nodeOf(item.id)!,screen)==="free"})));
    return drag?{drag,holder,items:selectedItems,peers,movement}:undefined;
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
    if(d.analytic){
      const context=d.analytic,drag=context.drag;
      const before={last:{...drag.last},pushed:new Map(drag.pushed),snapMemory:structuredClone(drag.snapMemory)};
      const step=stepPlaneDrag(drag,{x:p.x-d.p.x,y:p.y-d.p.y},{straight:e.shiftKey,loose:e.ctrlKey||e.metaKey},dragPrefs,context.movement);
      if(!step)return;
      const changed=context.items.map(item=>({item,change:planeMoveLocalPatch(item.frame,context.holder,item.look,step.delta,rtl,!item.free)}));
      const pushed=context.peers.filter(item=>step.pushed.has(item.id)).map(item=>({item,change:planeMoveLocalPatch(item.frame,context.holder,item.look,step.pushed.get(item.id)!,rtl,false)}));
      if([...changed,...pushed].some(item=>!item.change)){Object.assign(drag,before);return;}
      const pins=[...new Set(context.items.filter(item=>!item.free).map(item=>item.parentId))].flatMap(pinHolder);
      context.ops=[...pins,...[...changed,...pushed].map(({item,change})=>styleOp(nodeOf(item.id)!,screen,change!.patch))];
      d.shown=step.delta;d.into=null;
      setGuides(step.guides);setDragView({pushed:[],touching:step.touching,marks:step.marks,into:null});
      const box=boundsOfQuad(changed.flatMap(item=>item.change!.quad));
      if(box)setPlacing({id:d.grab!,box,...placeFor(box,d.free!.holder,"top-start",rtl)});
      previewGeometry(context.ops);return;
    }
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
        // Equal gaps when it snapped to them, else how far it is from what's around it.
        marks: step.marks.length ? step.marks : distancesAround(step.box, f.holder, f.beside.map((b) => { const v = step.pushed.get(b.id); return v ? { ...b.box, x: b.box.x + v.x, y: b.box.y + v.y } : b.box; })),
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
    if (d.partMove) send({ type: "previewLook", target: d.partMove.target, vars: null });
    if(d.analytic)return;
    for (const x of [...(d.free?.ids ?? []), ...(d.free?.pushed.keys() ?? [])]) previewMove(x, { x: 0, y: 0 });
  };
  const cancelDrag = () => {
    if(nudging.current.planes){window.clearTimeout(nudging.current.timer);nudging.current={dx:0,dy:0,timer:0};}
    const d = down.current;
    down.current = null;
    if (d) unpreview(d);
    clearGeometry();
    setDrop(null);
    setPlacing(null);
    setDragView(null);
    setGuides([]);
  };
  useEffect(()=>()=>{
    window.dispatchEvent(new Event("studio-cancel-geometry"));
    if(!down.current?.panning)cancelDrag();
  },[device,src,zoom]);
  useEffect(()=>()=>{
    const queued=nudging.current;
    if(queued.planes){window.clearTimeout(queued.timer);nudging.current={dx:0,dy:0,timer:0};clearGeometry();}
  },[selected,more,draftQ.data?.draft?.rev,layout?.viewVersion]);
  /**
   * Lets go of a free drag: each one's place saved for this screen (in its new place when it went
   * into one, its coordinates turned into that place's), and where what it pushed went. With
   * `copy` the originals stay and copies go there. One step to undo.
   */
  const dropFree = (d: Down, copy: boolean) => {
    if(d.analytic){
      const context=d.analytic,ops=context.ops??[];
      if(!ops.length||!d.shown||Math.hypot(d.shown.x,d.shown.y)<1e-6){clearGeometry();return;}
      if(copy){
        const ids=makeIds();let first:string|undefined;
        const copies=context.items.flatMap(item=>{
          const op=ops.find(op=>op.op==="setStyle"&&op.nodeId===item.id),node=nodeOf(item.id);if(!op||op.op!=="setStyle"||!node||!index)return [];
          const c=copyOf(node,ids),styles=c.style as Record<string,Record<string,unknown>>|undefined;
          c.style={...styles,[screen]:{...styles?.[screen],...op.style}};first??=c.id;
          return [{op:"insert" as const,parentId:item.parentId,index:index.nodes.get(item.parentId)!.children.indexOf(item.id)+1,node:c}];
        });
        void change(tr("نسخة","Copy"),copies,first).finally(clearGeometry);
      }else void change(tr("المكان","Place"),ops).finally(clearGeometry);
      return;
    }
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
            <BoxPanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} skip={boxSkip(vnode.type)} />
            {vnode.type === "section" ? <PadPanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} /> : null}
            <FiltersPanel node={vnode} screen={screen} busy={ss.busy} onOps={onOps} />
            <LookPanel node={vnode} screen={screen} busy={ss.busy} limited onOps={onOps} onPreview={() => undefined} />
          </>
        )}
      </div>
    );
  };
  /** The opened element's own editor (focus mode), or that of what's chosen inside it. */
  const focusInspector = () => {
    if (!focus || !index) return null;
    const n = nodeOf(focus.id);
    if (!n) return null;
    const inside = selected && selected !== focus.id && focusTrail(index, focus.id, selected) ? nodeOf(selected) : undefined;
    const target = inside ?? n;
    const g = focusGroup(target);
    // The part as the drawing has it now (a circle turned into a path is named a path).
    const part = target.id === focus.id && focus.part ? focusParts(target, index).find((x) => x.id === focus.part!.id) ?? focus.part : null;
    const onOps = (l: string, ops: PagesAPI.PageDraftOp[]) => void change(l, ops);
    return (
      <div className="space-y-3" data-testid="studio-focus-panel" data-group={g} data-node={target.id}>
        <div>
          <div className="text-[11px] text-white/45">{focusTitle(g)}</div>
          <div className="text-base font-semibold">{label(target.id)}</div>
        </div>
        <PerfPanel key={`perf:${target.id}`} node={target} busy={busy} onOps={onOps} />
        {part && g === "svg" ? (
          <SvgPartPanel
            key={`${target.id}:${part.id}`} node={target} part={part} busy={busy} onOps={onOps}
            info={artInfo?.nodeId === target.id ? artInfo.parts.find((x) => x.id === part.id) : undefined}
            onTry={() => send({ type: "motionMorph", nodeId: target.id })}
          />
        ) : null}
        {g === "svg" && !part && (target.props as Record<string, unknown> | undefined)?.morph ? (
          <MorphSettings
            morph={(target.props as Record<string, unknown>).morph as Morph} busy={busy}
            onTry={() => send({ type: "motionMorph", nodeId: target.id })}
            onSave={(m) => onOps(say("التحوّل|The morph|ההתמרה"), [{ op: "setProps", nodeId: target.id, props: { ...(target.props ?? {}), morph: m ?? undefined } }])}
          />
        ) : null}
        {g === "svg" && !part ? <SvgPanel key={target.id} node={target} lang={shopLang} busy={busy} onOps={onOps} /> : null}
        {WRITABLE.has(target.type) ? (
          <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" disabled={Boolean(editing) || busy} onClick={() => startText(target.id)} data-testid="studio-focus-write">
            {say("اكتب بالصفحة مع تنسيق|Write on the page with formatting|כתיבה בעמוד עם עיצוב")}
          </button>
        ) : null}
        {EDITABLE.has(target.type) ? <ContentPanel node={target} lang={shopLang} busy={busy} onOps={onOps} /> : null}
        {target.type === "heading" || target.type === "text" ? <CurvePanel node={target} busy={busy} onOps={onOps} /> : null}
        {target.type === "slider" && part && /^slide-\d+$/.test(part.id) ? (
          <SlidePanel key={`${target.id}:${part.id}`} node={target} index={Number(part.id.slice(6))} lang={shopLang} busy={busy} onOps={onOps} onShow={(i) => send({ type: "slideTo", nodeId: target.id, i })} />
        ) : null}
        {target.type === "heading" || target.type === "text" ? <TextStylePanel node={target} screen={screen} busy={busy} onOps={onOps} /> : null}
        {target.type === "icon" ? <TextStylePanel node={target} screen={screen} busy={busy} onOps={onOps} only={["iconSize", "size", "color", "align"]} /> : null}
        {target.type === "button" ? <ButtonStylePanel node={target} screen={screen} busy={busy} onOps={onOps} /> : null}
        {target.type === "image" ? (
          <SparklePanel
            node={target} busy={busy} onOps={onOps} finding={sparkleFinding} note={sparkleNote} pen={sparklePen} onPen={setSparklePen}
            chosen={target.id === focus.id ? focus.part?.id ?? null : null}
            onFind={(ask) => {
              const requestId = `sp${++artSeq.current}`;
              setSparkleFinding(true);
              setSparkleNote(null);
              sparkleWait.current = {
                requestId,
                done: (points, problem) => {
                  setSparkleFinding(false);
                  if (!points) {
                    setSparkleNote(problem === "unreadable"
                      ? say("الصورة من مكان ما بيسمح نقرا ألوانها: حط النجوم بالكبس.|This picture comes from a place that doesn't let its colours be read: place the stars with clicks.|לא ניתן לקרוא את התמונה: הצב כוכבים בלחיצות.")
                      : say("ما لقينا الصورة بالصفحة.|The picture wasn't found on the page.|התמונה לא נמצאה בעמוד."));
                    return;
                  }
                  if (!points.length) return setSparkleNote(say("ما لقينا أماكن واضحة. جرّب «الكل» أو بعد أقل.|No clear places found. Try «All» or less space between them.|לא נמצאו מקומות ברורים."));
                  setSparkleNote(`${say("لقينا|Found|נמצאו")} ${points.length}`);
                  const props = (target.props ?? {}) as Record<string, unknown>;
                  void change(say("نجوم براقة|Sparkling stars|כוכבים נוצצים"), [{ op: "setProps", nodeId: target.id, props: { ...props, sparkle: { ...((props.sparkle as Sparkle | undefined) ?? {}), points } } }]);
                },
              };
              send({ type: "sparkleFind", requestId, nodeId: target.id, ...ask });
            }}
          />
        ) : null}
        {target.type === "image" ? (
          <ImageEditPanel
            key={`${target.id}:${String((target.props as Record<string, unknown> | undefined)?.src)}`}
            node={target} busy={busy}
            aspect={imgInfo?.nodeId === target.id && imgInfo.h ? imgInfo.w / imgInfo.h : null}
            onPreview={(css) => send({ type: "previewEdit", nodeId: target.id, ...css })}
            onApply={async (recipe) => {
              const props = (target.props ?? {}) as Record<string, unknown>;
              const from = String((props.edit as { from?: string } | undefined)?.from ?? props.src ?? "");
              try {
                const made = await editImage(from, recipe as Record<string, unknown>);
                await change(say("تعديل الصورة|Edit the picture|עריכת התמונה"), [{ op: "setProps", nodeId: target.id, props: { ...props, src: made.file.url, edit: { from, recipe } } }]);
                send({ type: "previewEdit", nodeId: target.id, filter: "", transform: "", viewBox: "" });
                return null;
              } catch (e) {
                return getApiErrorMessage(e);
              }
            }}
            onUndo={() => {
              const props = (target.props ?? {}) as Record<string, unknown>;
              const from = (props.edit as { from?: string } | undefined)?.from;
              if (from) void change(say("الصورة الأصلية|The original picture|התמונה המקורית"), [{ op: "setProps", nodeId: target.id, props: { ...props, src: from, edit: undefined } }]);
            }}
          />
        ) : null}
        {target.type === "image" || target.type === "video" || target.type === "slider" ? <MediaStylePanel node={target} screen={screen} busy={busy} onOps={onOps} /> : null}
        {target.type === "video" ? (
          <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" disabled={busy} onClick={() => setVideoEditor(true)} data-testid="studio-video-open">
            🎬 {say("افتح محرّر الفيديو (قص، ترتيب، سرعة، كلام، موسيقى)|Open the video editor (cut, order, speed, words, music)|פתח את עורך הווידאו")}
          </button>
        ) : null}
        {target.type === "video" ? <VideoOverlayPanel node={target} screen={screen} busy={busy} onOps={onOps} onPreview={(vars) => send({ type: "previewLook", nodeId: target.id, vars })} /> : null}
        {target.type === "model3d" && part && modelInfo?.nodeId === target.id && modelInfo.parts.find((x) => x.key === part.id) ? (
          <ModelPartPanel key={`${target.id}:${part.id}`} node={target} part={modelInfo.parts.find((x) => x.key === part.id)!} busy={busy} onOps={onOps} />
        ) : null}
        {target.type === "model3d" ? <ModelViewsPanel key={`views:${target.id}`} node={target} busy={busy} onOps={onOps} onPreview={(view) => send({ type: "modelCamera", nodeId: target.id, view })} /> : null}
        {target.type === "model3d" ? <ModelSpotsPanel node={target} lang={shopLang} busy={busy} onOps={onOps} pen={spotPen} onPen={setSpotPen} /> : null}
        {target.type === "model3d" && !part ? <Model3dPanel key={target.id} node={target} lang={shopLang} busy={busy} onOps={onOps} /> : null}
        {target.type === "product360" ? <Product360Panel node={target} lang={shopLang} busy={busy} onOps={onOps} /> : null}
        {target.type === "section" ? <SectionPanel node={target} busy={busy} onOps={onOps} /> : null}
        {target.type === "columns" ? <ColumnsPanel node={target} screen={screen} busy={busy} ids={makeIds} onOps={onOps} /> : null}
        {target.type === "cell" ? <CellPanel node={target} cols={nodeOf(index.nodes.get(target.id)?.parentId) ?? null} busy={busy} onOps={onOps} /> : null}
        {!part ? <BoxPanel node={target} screen={screen} busy={busy} onOps={onOps} skip={boxSkip(target.type)} /> : null}
        <MotionPanel
          node={target}
          busy={busy}
          onOps={(l, ops) => {
            playNext.current = target.id;
            void change(l, ops);
          }}
          onPlay={() => send({ type: "motionPlay", nodeId: target.id })}
        />
        <p className="text-[10px] leading-4 text-white/35">{say("هون إعدادات هالعنصر بس. الباقي (الحركة بالسكرول، الأحداث، الحالات…) من «كل الإعدادات» فوق.|Only this element's own settings are here. The rest (scroll motion, events, states…) is under «All settings» at the top.|כאן רק ההגדרות של הרכיב. השאר (תנועה בגלילה, אירועים, מצבים…) תחת «כל ההגדרות» למעלה.")}</p>
      </div>
    );
  };
  const FOCUS_EMPTY: Record<string, string> = {
    image: "لسا ما في نجوم: دوّر على أماكنها بالصورة، أو شغّل القلم وكبّس عليها.|No stars yet: find their places in the picture, or turn the pen on and click it.|אין עדיין כוכבים: מצא מקומות או הפעל את העט ולחץ.",
    video: "محرّر الفيديو الكامل جاي: مسار زمني وقص ونصوص.|The full video editor is coming: a timeline, cuts and words.|עורך הווידאו המלא בדרך: ציר זמן, חיתוכים ומילים.",
    model: "عم نقرا أجزاء المجسّم…|Reading the model's parts…|קוראים את חלקי המודל…",
    text: "النص قطعة وحدة: اكتب عليه بالصفحة.|Text is one piece: write on it in the page.|טקסט הוא חלק אחד: כותבים עליו בעמוד.",
    svg: "الرسمة ما فيها أشكال.|The drawing has no shapes.|אין צורות בציור.",
    container: "فاضية.|Empty.|ריק.",
    other: "ما إله أجزاء لحالها.|It has no parts of its own.|אין לו חלקים משלו.",
  };
  /** The opened element's parts, down the side (focus mode). */
  const focusSide = () => {
    const n = focus ? nodeOf(focus.id) : undefined;
    if (!focus || !n || !index) return null;
    const g = focusGroup(n);
    const parts = n.type === "model3d" ? (modelInfo?.nodeId === n.id ? modelInfo.parts.map((x) => ({ id: x.key, label: x.label || x.key, kind: "mesh", depth: 0 })) : []) : focusParts(n, index);
    return (
      <FocusParts
        title={`${focusTitle(g)} · ${say("أجزاؤها|Its parts|חלקיו")}`}
        parts={parts}
        chosen={focus.part?.id ?? (selected && selected !== focus.id ? selected : null)}
        onPick={(fp) => {
          if (fp.nodeId) {
            select(fp.nodeId);
            setFocus({ ...focus, part: null });
          } else {
            if (selected !== focus.id) select(focus.id);
            setFocus({ ...focus, part: fp });
            if (n.type === "slider" && /^slide-\d+$/.test(fp.id)) send({ type: "slideTo", nodeId: n.id, i: Number(fp.id.slice(6)) });
          }
        }}
        onOpen={(fp) => {
          if (fp.nodeId) openFocus(fp.nodeId);
        }}
        empty={say(FOCUS_EMPTY[g])}
      />
    );
  };
  /** The path along the top in focus mode: from the page to what's chosen inside the opened element. */
  const focusCrumbs = (): Crumb[] => {
    if (!focus || !index) return [];
    const ids = pathTo(index, selected && focusTrail(index, focus.id, selected) ? selected : focus.id, up).filter((x) => index.nodes.has(x));
    const at = ids.indexOf(focus.id);
    return ids.map((x, i) => ({ id: x, label: x === index.root ? say("الصفحة|Page|עמוד") : nodeOf(x)?.name || crumb(x), inside: i >= at }));
  };
  const inspector = () => {
    if (leftTab === "styles" && siteOpen) return siteInspector();
    if (focus && !focusAll && index && nodeOf(focus.id)) return focusInspector();
    if (themeOpen) {
      return <ThemePanel themes={withOwnedTheme(themesQ.data?.themes ?? [], settings.data?.header)} failed={themesQ.isError} current={currentTheme} preview={themePreview} mode={themeMode} currentMode={savedTheme?.mode ?? null} original={settings.data?.header?.storeDesign?.mode !== "cms" && who.industry === "fashion" && who.audience === "women"} onPreview={(t) => { if (busy) return; setThemePreview(t); setThemeMode(undefined); }} onMode={(mode) => { if (!busy) setThemeMode(mode); }} saving={themeSaving || busy} onSave={() => setAsking({ kind: "theme" })} />;
    }
    if (!selected || !index) {
      return (
        <p className="text-xs leading-6 text-white/45">
          {tr(
            "كبسة بتختار أعمق عنصر ظاهر. Alt مع الكبسة بتتنقل بين العناصر المتراكبة، و«اختيار عنصر» بعرضها بقائمة. كبستين على نص بتكتب مكانه. الأسهم بتنقل بين العناصر، وEsc للأب، وEnter لأول ابن أو لكتابة النص. Ctrl+Z للتراجع. Ctrl مع عجلة الماوس للتكبير، والمسطرة مع السحب للتحريك.",
            "Click to select the deepest visible object. Alt+click cycles overlapping objects; Choose object lists them. Double-click text to write in place. Arrows move between elements, Esc goes to the parent, Enter to the first child or to write the text. Ctrl+Z undoes. Ctrl+wheel zooms, Space+drag moves the canvas.",
          )}
        </p>
      );
    }
    if (multi) return <><MultiPanel names={chosen.map(label)} busy={busy} actions={multiActions} /><div className="mt-3 space-y-2 rounded-xl border border-white/10 p-3" data-testid="studio-fixed-spacing">
      <label className="block text-xs text-white/60">{tr("مسافة ثابتة (بكسل)","Fixed gap (px)")}<input type="number" min={0} max={2000} value={fixedGap} disabled={busy} onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value)&&value>=0&&value<=2000)setFixedGap(value);}} className="mt-1 w-full rounded bg-surface-925 px-2 py-1" /></label>
      <div className="flex gap-2">{(["x","y"] as const).map(axis=><button type="button" key={axis} disabled={busy} onClick={()=>applyFixedGap(axis)} className="rounded bg-white/[0.06] px-2 py-1 text-xs" data-testid={`studio-spacing-${axis}`}>{axis==="x"?tr("أفقي","Horizontal"):tr("رأسي","Vertical")}</button>)}</div>
    </div></>;
    return (
      <div className="space-y-3" data-insp-list="">
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
        {selFree && selFree.type !== "page" ? <div data-insp-as="behaviour"><PerfPanel key={`perf:${selFree.id}`} node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /></div> : null}
        {selected && selected !== index.root && shapeOf(selected) && focus?.id !== selected ? (
          <button type="button" onClick={() => openFocus(selected)} className="w-full rounded-lg bg-accent-500/20 px-2 py-1.5 text-xs text-accent-100 hover:bg-accent-500/30" data-testid="studio-focus-enter">
            ✎ {say("افتحه لحاله (تركيز) · F أو كبستين|Open it on its own (focus) · F or double-click|פתיחה לבד (מיקוד) · F או לחיצה כפולה")}
          </button>
        ) : null}
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <dt className="text-white/45">{tr("الحجم", "Size")}</dt>
          <dd dir="ltr" className="text-end">{selShape ? `${Math.round(selShape.box.w / zoom)} × ${Math.round(selShape.box.h / zoom)}` : "—"}</dd>
        </dl>

        {selectedRegion ? <div className="space-y-3 rounded-xl border border-accent-400/30 p-3" data-testid="studio-region" data-region={selectedRegion}>
          <p className="text-xs text-white/70">{tr("الهيدر والفوتر مشتركان بين كل صفحات المتجر. التعديل يتم من محرر الجزء نفسه.", "Header and footer are shared across the store. Edit their own document to update every page.")}</p>
          <Link data-testid="studio-region-edit" className="block rounded-lg bg-accent-500 px-3 py-2 text-center text-xs text-white" to={ownedDesign?.mode === "cms" && ownedDesign[`${selectedRegion}Id`] ? `/studio/${encodeURIComponent(ownedDesign[`${selectedRegion}Id`]!)}?from=${encodeURIComponent(id)}` : "/admin/settings"}>{tr("تعديل", "Edit")} · {selectedRegion === "header" ? tr("الهيدر", "Header") : tr("الفوتر", "Footer")}</Link>
          <Link className="block text-xs text-accent-200" to="/admin/nav">{tr("قائمة روابط", "Menu of links")}</Link>
        </div> : null}

        {lookTarget && (selExtra?.kind === "detail" || selExtra?.kind === "auto" || selExtra?.kind === "part" || selExtra?.kind === "slot") && !selectedRegion ? (() => {
          const ownerId = selPath.filter(pid => index!.nodes.has(pid)).at(-1);
          const ownerType = selExtra.kind === "detail" ? nodeOf(selExtra.owner.slice(2))?.type : undefined;
          return <PartKindCard
            kind={lookTarget.kind}
            preview={partContent?.binding.value ?? (selExtra.kind === "detail" ? selExtra.text ?? selExtra.label : undefined)}
            owner={ownerId && ownerId !== selected ? crumb(ownerId) : undefined}
            live={selExtra.kind === "detail" && !partContent && lookTarget.kind === "text" && (ownerType === "countdown" || ownerType === "clock")}
            count={selExtra.kind === "detail" || selExtra.kind === "part" ? selExtra.count : 1}
            onOwner={selExtra.kind === "detail" || selExtra.kind === "auto" ? () => select(ownerId ?? index!.root, true) : undefined}
          />;
        })() : null}

        {partContent ? <fieldset disabled={busy} className="space-y-2 rounded-xl border border-white/10 p-3" data-testid="studio-part-content">
          <Field label={tr("النص", "Text")} value={partContent.binding.value} multiline={partContent.binding.line === undefined && partContent.part.lookKind === "text"} testId="studio-part-words" onSave={value => savePartContent(selected, value)} />
          <button type="button" disabled={Boolean(editing)} className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs text-white" data-testid="studio-part-edit-text" onClick={() => startText(selected)}>{tr("كتابة النص مكانه", "Write the text in place")}</button>
          {partHref ? <Field label={tr("الرابط", "Link")} value={partHref.value} testId="studio-part-href" onSave={value => {
            const href = value.trim();
            if (!/^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i.test(href)) return;
            const props = structuredClone(partContent.owner.props);
            const parent = getPath(props, partHref.path.slice(0, -1));
            if (parent && typeof parent === "object") {
              (parent as Record<string, unknown>).href = href;
              void change(tr("تعديل", "Edit"), [{ op: "setProps", nodeId: partContent.owner.id, props }]);
            }
          }} /> : null}
        </fieldset> : null}
        {selExtra?.kind === "detail" && !selectedRegion && !partContent && selExtra.lookKind === "text" ? <p className="text-xs leading-5 text-white/60" data-testid="studio-part-source">{nodeOf(selExtra.owner.slice(2))?.type === "countdown" ? tr("هذا رقم حي يحسبه العدّاد. لتغيير قيمته، افتح إعدادات العنصر الأصلي وعدّل موعد العدّ. يمكنك تغيير خطه وشكله هنا.", "This is a live countdown value. Open Owner settings to change the end time. Its type and appearance can be changed here.") : tr("محتوى هذا الجزء مرتبط ببيانات العنصر. افتح إعدادات العنصر الأصلي لتعديله؛ الشكل والخط قابلان للتعديل هنا.", "This content comes from the object's data. Open Owner settings to edit its source; its appearance and typography can be edited here.")}</p> : null}


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
            {selExtra?.kind === "detail" && layout?.items.some(item => item.kind === "detail" && item.owner === selExtra.owner && item.key === selExtra.key && item.geometry?.partMoveSafe === false) ? <p role="status" className="text-xs text-white/60">{tr("هذا التحويل غير قابل للتحرير المباشر حاليًا. استخدم إعدادات المكان والحجم من اللوحة.", "This transform currently needs the layout controls for position and size.")}</p> : null}
            {selExtra?.kind === "part" && selExtra.count > 1 ? <p className="text-[11px] leading-5 text-accent-200/80">{tr(`الشكل والحركة بيتغيّروا للـ ${selExtra.count} كلهم.`, "The look and motion change for all {0} of them.", [selExtra.count])}</p> : null}
            {lookTarget.kind !== "box" ? <StatesBar node={lookSel} state={styleState} onState={setStyleState} /> : null}
            {styleState !== "normal" && lookTarget.kind !== "box" ? (
              stateLooks(lookSel, styleState, lookChange, lookTarget.kind === "text" || lookTarget.kind === "button")
            ) : (
              <>
                {/* The object's own controls first (words for a text, the button for a button, the picture for a picture)… */}
                {lookTarget.kind === "text" ? <TextStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {lookTarget.kind === "text" ? <TypeMorePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {lookTarget.kind === "button" ? (
                  <>
                    <ButtonStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} />
                    <TextStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} only={["font", "size", "weight", "color"]} />
                  </>
                ) : null}
                {lookTarget.kind === "image" || lookTarget.kind === "video" ? <MediaStylePanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {lookTarget.kind === "image" || lookTarget.kind === "video" ? <FiltersPanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} /> : null}
                {/* …then its place, size, box and spacing, the same for every kind. */}
                {selExtra?.kind === "detail" || selExtra?.kind === "auto" ? <>
                  <PartSizeFields node={lookSel} screen={screen} busy={busy} onOps={lookChange} />
                  <BoxPanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} />
                  <PadPanel node={lookSel} screen={screen} busy={busy} onOps={lookChange} />
                </> : null}
                <ShowOnPanel node={lookSel} busy={busy} onOps={lookChange} />
                {lookTarget.kind !== "box" || selExtra?.kind === "detail" ? <LookPanel node={lookSel} screen={screen} busy={busy} limited onOps={lookChange} onPreview={(vars) => send({ type: "previewLook", target: lookTarget.target, vars })} /> : null}
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
                shown={blockShown(heroSection.data as Record<string, unknown> | undefined, selBlock)}
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

        {pageQ.data?.kind === "component" && index ? <ComponentDocPanel variants={(index.nodes.get(index.root)?.children ?? []).map((x) => index.nodes.get(x)?.node).find((n) => n?.type === "section")?.children ?? []} busy={busy} onAddVariant={addVariant} /> : null}
        {selFree ? (
          <div className="space-y-3" data-insp-list="">
            <NodeActions
              canUp={selPos > 0}
              canDown={selPos >= 0 && selPos < selSiblings.length - 1}
              busy={busy}
              onUp={() => nudge(selected, -1)}
              onDown={() => nudge(selected, 1)}
              onCopy={selFree.type === "cell" ? undefined : copySelected}
              onDelete={selFree.type === "cell" ? undefined : () => setAsking({ kind: "delete", nodeId: selected, name: label(selected), tree: true })}
            />
            <InspectorGroup id="content" />
            {WRITABLE.has(selFree.type) ? (
              <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" disabled={Boolean(editing) || busy} onClick={() => startText(selected)} data-testid="studio-edit-node">
                {editing ? tr("عم تكتب بالصفحة… (Enter للحفظ، Esc للإلغاء)", "Writing in the page… (Enter saves, Esc cancels)") : tr("اكتب بالصفحة مع تنسيق (أو كبستين عليه)", "Write on the page with formatting (or double-click it)")}
              </button>
            ) : null}
            {EDITABLE.has(selFree.type) ? <ContentPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {COMMERCE_TYPES.has(selFree.type) ? <CommercePanel node={selFree} busy={busy} lang={shopLang} onOps={(label, ops) => void change(label, ops)} /> : null}
            {selFree.type === "columns" ? <ColumnsPanel node={selFree} screen={screen} busy={busy} ids={makeIds} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "cell" ? (
              <CellPanel node={selFree} cols={nodeOf(selNode?.parentId) ?? null} busy={busy} onOps={(l, ops) => void change(l, ops, ops.some((o) => o.op === "remove" && o.nodeId === selected) ? selNode?.parentId ?? null : undefined)} />
            ) : null}
            {selFree.type === "section" ? <SectionPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "deck" ? <DeckPanel node={selFree} lang={shopLang} busy={busy} ids={makeIds()} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "scrollScene" ? <ScrollScenePanel key={`scene:${selFree.id}`} node={selFree} lang={shopLang} busy={busy} ids={makeIds()} onOps={(l, ops) => void change(l, ops)} onSeek={(at) => send({ type: "motionSceneSeek", nodeId: selFree.id, at })} onSelect={(sid) => select(sid, true)} /> : null}
            {nodeOf(selNode?.parentId)?.type === "scrollScene" ? <CuePanel key={`cue:${selFree.id}`} node={selFree} scene={nodeOf(selNode?.parentId)!} busy={busy} onOps={(l, ops) => void change(l, ops)} onSeek={(at) => send({ type: "motionSceneSeek", nodeId: selNode!.parentId!, at })} /> : null}
            {selFree.type === "collectionList" ? <CollectionListPanel node={selFree} collections={collectionsQ.data} lang={shopLang} busy={busy} onProps={(props) => void change(say("قائمة المجموعة|Collection list|רשימת אוסף"), [{ op: "setProps", nodeId: selFree.id, props }])} /> : null}
            {(() => { const c = index ? bindContext(index, selFree.id, { id, kind: pageQ.data?.kind }, collectionsQ.data) : null; return c ? <BindPanel key={`bind:${selFree.id}`} node={selFree} collection={c} lang={shopLang} busy={busy} onProps={(props) => void change(say("ربط بحقل|Connect to a field|חיבור לשדה"), [{ op: "setProps", nodeId: selFree.id, props }])} /> : null; })()}
            {selFree.type === "component" ? <ComponentInstancePanel node={selFree} components={componentsQ.data} lang={shopLang} busy={busy} onProps={(props) => void change(say("نسخة المكوّن|Component instance|מופע רכיב"), [{ op: "setProps", nodeId: selFree.id, props }])} onEdit={(cid) => window.location.assign(`/studio/${encodeURIComponent(cid)}?from=${encodeURIComponent(id)}`)} onDetach={(variant) => detachInstance(selFree, variant)} /> : null}
            {selFree.type === "svg" ? <SvgPanel key={selFree.id} node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "popup" ? <PopupPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {(BLOCK_KINDS as readonly string[]).includes(selFree.type) ? <ContentBlocksPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "instrument" ? <InstrumentPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "chart" ? <ChartPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "clock" ? <ClockPanel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "model3d" ? <Model3dPanel key={selFree.id} node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "product360" ? <Product360Panel node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "video" ? <div data-insp-as="look"><VideoOverlayPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} onPreview={(vars) => send({ type: "previewLook", nodeId: selected, vars })} /></div> : null}
            <InspectorGroup id="look" />
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
                {selFree.type !== "spacer" ? <BoxPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} skip={boxSkip(selFree.type)} /> : null}
                <StickyPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                <OverflowPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                {PATTERNED.has(selFree.type) ? <PatternPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
                <FiltersPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                <FormPanel key={`form:${selFree.id}:${screen}`} node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                <CodePanel key={`code:${selFree.id}`} node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} />
                <LookPanel node={selFree} screen={screen} busy={busy} onOps={(l, ops) => void change(l, ops)} onPreview={(vars) => send({ type: "previewLook", nodeId: selected, vars })} />
              </>
            )}
            <InspectorGroup id="motion" />
            <MotionPanel
              node={selFree}
              busy={busy}
              onOps={(l, ops) => {
                playNext.current = selected;
                void change(l, ops);
              }}
              onPlay={() => send({ type: "motionPlay", nodeId: selected })}
            />
            <KeyframesPanel
              key={`keys:${selFree.id}`}
              node={selFree}
              busy={busy}
              onOps={(l, ops) => {
                playNext.current = selected;
                void change(l, ops);
              }}
              onPlay={() => send({ type: "motionPlay", nodeId: selected })}
            />
            {selFree.type !== "page" ? <ScrollEffectsPanel key={`scroll:${selFree.id}`} node={selFree} sections={pageKids.filter((n) => n.type === "section")} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {WORLD_HOSTS.has(selFree.type) ? (
              <WorldPanel
                key={`world:${selFree.id}`} node={selFree} busy={busy}
                onOps={(l, ops) => void change(l, ops)}
                onPlay={() => send({ type: "physicsPlay", nodeId: selFree.id })}
                onStop={() => send({ type: "physicsStop" })}
                onBake={(seconds) => new Promise<BakedKeys | null>((resolve) => {
                  const requestId = `bake${++artSeq.current}`;
                  const timer = window.setTimeout(() => { if (bakeWait.current?.requestId === requestId) bakeWait.current = null; resolve(null); }, 15000);
                  bakeWait.current = { requestId, done: (k) => { window.clearTimeout(timer); resolve(k); } };
                  send({ type: "physicsBake", requestId, nodeId: selFree.id, seconds });
                })}
              />
            ) : null}
            {worldOfNode(index.nodes.get(index.nodes.get(selFree.id)?.parentId ?? "")?.node) ? <BodyPanel key={`body:${selFree.id}`} node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            <InspectorGroup id="decor" />
            {canCover(selFree) && pageKids.some((n) => n.id === selFree.id) ? <CoverPanel node={selFree} isLast={pageKids[pageKids.length - 1]?.id === selFree.id} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {canCover(selFree) && pageKids.some((n) => n.id === selFree.id) ? <PaintPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            <EdgesPanel key={`edges:${selFree.id}`} node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} />
            {selFree.type === "section" ? <ParticlesPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type === "section" ? <ScenePanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            <InspectorGroup id="behaviour" />
            <TriggersPanel key={`triggers:${selFree.id}`} node={selFree} lang={shopLang} targets={[...index.nodes.values()].filter(x => x.node.type !== "page").map(x => ({ id: x.node.id, label: x.node.name || typeLabel(x.node.type), type: x.node.type }))} busy={busy} onOps={(label, ops) => void change(label, ops)} onTest={(i, fail) => send({ type: "motionTriggerTest", nodeId: selFree.id, index: i, ...(fail ? { fail: true } : {}) })} />
            <VisualControlsPanel key={`visual:${selFree.id}`} node={selFree} targets={[...index.nodes.values()].filter(x => x.node.type !== "page").map(x => ({ id: x.node.id, label: x.node.name || x.node.type }))} busy={busy} onOps={(label, ops) => void change(label, ops)} onTest={event => send({ type: "testInteraction", nodeId: selFree.id, event })} />
            {selFree.type !== "page" ? <CursorTextPanel key={`cursor:${selFree.id}`} node={selFree} lang={shopLang} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {selFree.type !== "cell" ? <ShowOnPanel node={selFree} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
            {!["section", "cell", "columns", "page", "component", "popup"].includes(selFree.type) && pageQ.data?.kind !== "component" ? <MakeComponentPanel key={`make:${selFree.id}`} node={selFree} busy={busy} onMake={(name) => makeComponent(selFree, name)} /> : null}
            {selFree.type === "section" && selNode?.parentId === index.root && pageQ.data?.kind !== "block" ? <SaveBlockPanel node={selFree} busy={busy} onSave={(name, link) => saveBlock(selFree, name, link)} /> : null}
            <AddMenu
              kinds={ADDABLE.filter((k) => canAdd(k, "inside") || canAdd(k, "after"))}
              busy={busy}
              title={index && canHold(index, selected, probe("text")) ? tr("إضافة لجوّا", "Add inside") : tr("إضافة بعده", "Add after it")}
              onAdd={(k, src) => addKind(k, src, canAdd(k, "inside") ? "inside" : "after")}
              onDragKind={(k) => (adding.current = k)}
            />
          </div>
        ) : null}
        {selFree && selFree.type !== "page" ? <InspectorGroup id="layout" /> : null}
        {selNode && pageItemNode && ["section", "legacy", "roseBlock"].includes(pageItemNode.type) ? <SectionObjectsPanel
          node={pageItemNode} selected={selected} busy={busy}
          canAdd={kind => { const c = insertCtx((x) => `__${x}`); return Boolean(c && insertOps(c, pageItemNode.id, probe(kind), "inside")); }}
          onAdd={kind => addKind(kind, undefined, "inside", pageItemNode.id)}
          onSelect={nodeId => select(nodeId, true)}
        /> : null}

        {selFree&&!['page','section','cell','columns'].includes(selFree.type)?<>
          <div className="space-y-2 rounded-xl border border-white/10 p-3" data-testid="studio-movement">
            <div className="text-xs text-white/70">{tr("اتجاه التحريك داخل الحاوية","Movement within the container")}</div>
            <div className="grid grid-cols-2 gap-1">{([['vertical',tr("رأسي فقط","Vertical only")],['horizontal',tr("أفقي فقط","Horizontal only")],['both',tr("المحوران داخل الحاوية","Both axes inside")],['free',tr("حر","Free")]] as const).map(([mode,label])=><button type="button" key={mode} disabled={busy} aria-pressed={movementOf(selFree,screen)===mode} className={`rounded px-2 py-1.5 text-xs ${movementOf(selFree,screen)===mode?'bg-accent-500/30':'bg-white/[0.06]'}`} data-testid={`studio-movement-${mode}`} onClick={()=>{setCanvasMode("free");saveCanvasMode("free");void change(tr("اتجاه التحريك","Movement direction"),[styleOp(selFree,screen,{movement:mode})]);}}>{label}</button>)}</div>
            {screen!=="base"?<button type="button" disabled={busy} className="text-[10px] text-white/50" data-testid="studio-movement-inherit" onClick={()=>void change(tr("اتجاه التحريك","Movement direction"),[styleOp(selFree,screen,{movement:null})])}>{tr("اتبع الشاشة الأكبر","Follow the larger screen")}</button>:null}
          </div>
          <LayoutConstraintsPanel key={`${selFree.id}:${screen}`} value={((selFree.style as Record<string,{constraints?:SizeConstraints}>|undefined)?.[screen]?.constraints)??{}} busy={busy} onChange={value=>setSizeConstraints(selFree,value)} />
        </>:null}

        {selFree?.children?.length && !["page", "section", "cell", "columns"].includes(selFree.type) ? <label className="flex items-start gap-2 rounded-lg border border-white/10 p-2 text-xs">
          <input type="checkbox" checked={scaleContents} disabled={busy} data-testid="studio-scale-contents" onChange={event => { const on = event.target.checked; setScaleContents(on); saveScaleContents(on); }} />
          <span>{tr("تحجيم المحتوى مع الحاوية", "Scale contents with the container")}<span className="mt-1 block text-[11px] text-white/45">{tr("كل العناصر والنصوص بداخلها تكبر وتصغر بنفس النسبة. أطفئه لتغيير حدود الحاوية وحدها.", "All nested objects and text grow and shrink in proportion. Turn off to resize only the container frame.")}</span></span>
        </label> : null}

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
        {selected === index.root && rumAlerts.data && pageQ.data ? (
          <SlowdownAlert alerts={rumAlerts.data} pageId={id} rumPage={pageQ.data.slug === "/" ? "home" : pageQ.data.kind === "productTemplate" ? "product" : pageQ.data.kind === "categoryTemplate" ? "category" : "page"} busy={busy} onRollback={(revisionId) => void rollback(revisionId)} />
        ) : null}
        {selected === index.root && index.nodes.get(index.root) ? (
          <PageBudget
            root={index.nodes.get(index.root)!.node} busy={busy} onPick={(sid) => select(sid, true)} onOps={(l, ops) => void change(l, ops)}
            onMeasure={() => new Promise<Sample | null>((resolve) => {
              const requestId = `perf${++artSeq.current}`;
              const timer = window.setTimeout(() => { if (perfWait.current?.requestId === requestId) perfWait.current = null; resolve(null); }, 6000);
              perfWait.current = { requestId, done: (s) => { window.clearTimeout(timer); resolve(s); } };
              send({ type: "perfSample", requestId });
            })}
          />
        ) : null}
        {selected === index.root && pageQ.data && (pageQ.data.kind ?? "page") === "page" ? <PageSettingsPanel key={pageQ.data.id} page={pageQ.data} langs={langs.enabled} /> : null}
        {selected === index.root && draft?.tree.root ? <VisualControlsPanel key={`visual:${index.root}`} node={draft.tree.root} targets={[...index.nodes.values()].filter(x => x.node.type !== "page").map(x => ({ id: x.node.id, label: x.node.name || x.node.type }))} busy={busy} onOps={(label, ops) => void change(label, ops)} onTest={event => send({ type: "testInteraction", event })} /> : null}
        {selected === index.root ? <ConvertAllPanel sections={oldOnPage.map((x) => x.section)} main={main} roseOf={roseOf} busy={busy} onConvert={() => convertOld(oldOnPage.map((x) => x.node.id))} /> : null}

        {selected === index.root && index.nodes.get(index.root) ? <PageCursorPanel root={index.nodes.get(index.root)!.node} busy={busy} onOps={(l, ops) => void change(l, ops)} /> : null}
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
    const kids = piecesOf(sid).filter(k => !layerMatch || layerMatch.has(k));
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
    for (const [nid] of extras) if (label(nid).toLowerCase().includes(q)) pathTo(index, nid, up).forEach(pid => hit.add(pid));
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
      {[...extras].filter(([, extra]) => extra.kind === "region").filter(([sid]) => !layerMatch || layerMatch.has(sid)).map(([sid]) => <div key={sid}>
        <button type="button" className={`w-full rounded-md px-3 py-2 text-start text-xs ${selected === sid ? "bg-accent-500/25" : "text-white/70"}`} data-testid="studio-layer" data-node={sid} onClick={() => pick(sid)}>{label(sid)}</button>
        {selPath.includes(sid) || layerMatch ? pieceRows(sid, 1, pick) : null}
      </div>)}
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
              <Layers index={index!} id={sid} selected={selected} hovered={hovered} sectionTypes={sectionTypes} onPick={pick} onHover={setHovered} onDragStart={(x) => (dragged.current = x)} onDropOn={dropAny} depth={2} childrenOnly tools={rowTools} parts={(owner, depth) => selPath.includes(owner) || layerMatch ? pieceRows(owner, depth, pick) : null} />
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
  const shownThemeInfo = withOwnedTheme(themesQ.data?.themes ?? [], settings.data?.header).find((t) => t.id === (themePreview ?? currentTheme));
  const ownedDesign = (settings.data?.header as { storeDesign?: { mode?: string; homeId?: string; headerId?: string; footerId?: string } } | null)?.storeDesign;
  const templateFamily = isFamily(shownThemeInfo?.family) ? shownThemeInfo.family : "fashion";
  const templateColours = shownThemeInfo ? coloursOf(shownThemeInfo.palettes?.[shownThemeMode ?? shownThemeInfo.mode]) : ROSE_COLOURS;
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
    // A shop or cart template brings its own catalogue or cart parts: the page items that hold the ones already
    // here make way for it (a page keeps each of them once), and the template goes where the first of them was.
    const typesIn = (n: PagesAPI.PageTreeNode): string[] => [n.type, ...(n.children ?? []).flatMap(typesIn)];
    const incoming = new Set(nodes.flatMap(typesIn).filter((t) => COMMERCE_TYPES.has(t)));
    const replaced = incoming.size ? pageKids.filter((k) => typesIn(k).some((t) => incoming.has(t))) : [];
    const firstGone = replaced.length ? pageKids.findIndex((k) => k.id === replaced[0].id) : -1;
    const at = firstGone >= 0 ? firstGone : where === "here" ? pageSpot() : (index.nodes.get(index.root)?.children.length ?? 0);
    void change(name, [
      ...replaced.map((k): PagesAPI.PageDraftOp => ({ op: "remove", nodeId: k.id })),
      ...nodes.map((node, i): PagesAPI.PageDraftOp => ({ op: "insert", parentId: index.root, index: at + i, node })),
    ], nodes[0].id);
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
        const op = motionOp(motionNode, togglePreset(motionNode.motion as Motion | undefined, p));
        if (motionNode === selFree) {
          playNext.current = motionNode.id;
          void change(p.label(), [op]);
        } else if (lookTarget) {
          playNext.current = lookTarget.target;
          lookChange(p.label(), [op]);
        }
      }}
    />
    {pageQ.data?.kind === "productTemplate" ? (
      <div className="mt-4 space-y-1" data-testid="add-product-detail">
        <div className="px-1 text-xs font-medium text-white/70">🛍 {say("صفحة المنتج|The product page|דף המוצר")}</div>
        <button type="button" className="w-full rounded-lg bg-white/[0.04] px-2 py-1.5 text-start text-xs hover:bg-white/[0.08] disabled:opacity-40" disabled={busy} onClick={() => addNode({ id: makeIds()("pd"), type: "productDetail", props: {} }, addWhereNow, selected, undefined, say("تفاصيل المنتج|Product details|פרטי המוצר"))} data-testid="add-product-detail-button">{say("صور المنتج وألوانه ومقاساته وزر السلة|The product's pictures, colours, sizes and cart button|תמונות, צבעים, מידות וכפתור הסל")}</button>
        <p className="px-1 text-[11px] leading-5 text-white/40">{say("أي عنوان أو نص أو صورة بتقدر تربطها بإسم المنتج أو سعره أو وصفه (◆ من لوحة العنصر).|Any heading, text or picture can connect to the product's name, price or description (◆ in the element's panel).|כל כותרת, טקסט או תמונה יכולים להתחבר לשם, מחיר או תיאור המוצר.")}</p>
      </div>
    ) : null}
    {collectionsQ.data?.length ? (
      <div className="mt-4 space-y-1" data-testid="add-collection-lists">
        <div className="px-1 text-xs font-medium text-white/70">▦ {say("قوائم من المجموعات|Collection lists|רשימות מאוספים")}</div>
        {collectionsQ.data.map((c) => (
          <button key={c.id} type="button" className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-start text-xs hover:bg-white/[0.08] disabled:opacity-40" disabled={busy} onClick={() => addNode(newCollectionList(c, shopLang, makeIds()), addWhereNow, selected, undefined, say("قائمة من مجموعة|Collection list|רשימה מאוסף"))} data-testid={`add-list-${c.slug}`}>
            <span className="truncate">{c.name[shopLang] || c.name.ar || c.name.en || c.slug}</span><span className="shrink-0 text-[10px] text-white/40" dir="ltr">{c.published}</span>
          </button>
        ))}
      </div>
    ) : null}
    {componentsQ.data?.length ? (
      <div className="mt-4 space-y-1" data-testid="add-components">
        <div className="px-1 text-xs font-medium text-white/70">◇ {say("المكوّنات الرئيسية|Main components|רכיבים ראשיים")}</div>
        {componentsQ.data.filter((c) => c.id !== id).map((c) => (
          <button key={c.id} type="button" className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-start text-xs hover:bg-white/[0.08] disabled:opacity-40" disabled={busy} onClick={() => addNode(newInstance(c, makeIds()), addWhereNow, selected, undefined, say("نسخة من مكوّن|Component instance|מופע רכיב"))} data-testid={`add-component-${c.id}`}>
            <span className="truncate">{c.name}</span><span className="shrink-0 text-[10px] text-white/40">{c.variants.length > 1 ? say(`${c.variants.length} نسخ|${c.variants.length} variants|${c.variants.length} גרסאות`) : ""}</span>
          </button>
        ))}
      </div>
    ) : null}
    {pageQ.data?.kind === "block" ? null : (
      <div className="mt-4">
        <MyBlocks busy={busy} onLink={(b) => void addBlock(b, true)} onCopy={(b) => void addBlock(b, false)} onDelete={(b) => setAsking({ kind: "deleteBlock", block: b })} />
      </div>
    )}
    </>
  );
  /** The ready looks for the selected element: resting on one shows it in the frame, a click puts it on. */
  const looksPanel = () => {
    const node = selFree ?? lookSel;
    const part = !selFree && lookTarget;
    if (!node || node.type === "page") return <p className="px-2 py-4 text-xs leading-5 text-white/45" data-testid="studio-looks-pick">{selectedRegion ? tr("الهيدر والفوتر مشتركان بين كل صفحات المتجر. التعديل يتم من محرر الجزء نفسه.", "Header and footer are shared across the store. Edit their own document to update every page.") : tr("اختار عنصر عالصفحة (زر، صورة، عنوان، قسم…) لتشوف الأشكال الجاهزة اللي بتناسبه.", "Pick an element on the page (a button, a picture, a heading, a section…) to see the ready looks that suit it.")}</p>;
    const preview = (r: Ready | null) => {
      const next = r && r.kind !== "edge" && r.kind !== "entrance" ? withLook(node, screen, r) : null;
      if (part) send({ type: "previewPartStyle", target: part.target, look: next ? { kind: part.kind, style: next.style } : null });
      else send({ type: "previewStyle", node: next });
    };
    return (
      <LooksPanel
        key={node.id}
        node={node}
        part={Boolean(part)}
        label={label(selected!)}
        colours={templateColours}
        busy={busy}
        current={lastLook?.node === node.id ? lastLook.id : null}
        onRest={preview}
        onPick={(r: Ready) => {
          const ops = lookOps(node, screen, r, (svg) => decorArt(svg, true));
          preview(null);
          if (!ops.length) return;
          setLastLook({ node: node.id, id: r.id });
          const name = `${tr("شكل جاهز", "A ready look")}: ${r.name()}`;
          if (part) lookChange(name, ops.filter(op => op.op === "setStyle" || op.op === "setMotion"));
          else void change(name, ops);
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
    <StoreKitContext.Provider value={storeKit}><TokensContext.Provider value={dt.tokens}>
    <Shell busy={busy}>
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
            <button key={k} type="button" disabled={busy} onClick={() => setDevice(k)} aria-pressed={device === k} className={`rounded-lg px-2 py-1 text-xs ${device === k ? "bg-accent-500/25 text-white" : "text-white/60 hover:bg-white/[0.06]"}`}>
              {DEVICES[k].label()}
            </button>
          ))}
        </div>
        {langs.enabled.length > 1 ? (
          <div className="flex items-center gap-1" role="group" aria-label={tr("لغة الصفحة", "Page language")}>
            {langs.enabled.map((l) => (
              <button key={l} type="button" disabled={busy} onClick={() => setLang(l)} aria-pressed={shopLang === l} className={`rounded-lg px-2 py-1 text-xs ${shopLang === l ? "bg-white/[0.12] text-white" : "text-white/55 hover:bg-white/[0.06]"}`}>
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
          <button type="button" disabled={busy || !layout} onClick={() => void reload()} className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/[0.06] disabled:opacity-30" aria-label={tr("تحديث المعاينة", "Refresh preview")} data-testid="studio-refresh-view">↻</button>
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
          <button type="button" aria-pressed={deepSelection} className={`h-7 rounded-lg px-2 text-xs ${deepSelection ? "bg-accent-500/20" : ""}`} data-testid="studio-deep-selection" onClick={() => { pointSelection.current.cancel(); const next = !deepSelection; setDeepSelection(next); try { localStorage.setItem("studio.deepSelection", next ? "on" : "off"); } catch {} if (!next && selExtra?.kind === "detail") select(selExtra.owner.startsWith("r:") ? `region:${selExtra.owner.slice(2)}` : selPath.filter(pid => index!.nodes.has(pid)).at(-1) ?? null); }}>{tr("تحديد داخلي", "Deep selection")}</button>
          <button type="button" className="h-7 rounded-lg px-2 text-xs hover:bg-white/[0.08]" title={say("اختصارات المحرر (?)|Editor shortcuts (?)|קיצורי העורך (?)")} aria-label={say("اختصارات المحرر|Editor shortcuts|קיצורי העורך")} onClick={() => setKeysOpen(true)} data-testid="studio-shortcuts-open">⌨</button>
          <button type="button" disabled={!layout} className="h-7 rounded-lg px-2 text-xs" data-testid="studio-pick-objects" onClick={event => { const p = last.current?.p ?? (selShape ? { x: selShape.box.x + selShape.box.w / 2, y: selShape.box.y + selShape.box.h / 2 } : { x: frameBox.x + frameBox.w / 2, y: frameBox.y + 60 }); const r = event.currentTarget.getBoundingClientRect(); pickPoint(p, candidates => setMenu({ x: r.left, y: r.bottom + 4, candidates })); }}>{tr("اختيار عنصر", "Choose object")}</button>
          <button type="button" onClick={() => setThemeOpen((v) => !v)} aria-pressed={themeOpen} className={`h-7 rounded-lg px-2 text-xs ${themeOpen ? "bg-white/[0.12] text-white" : "text-white/75 hover:bg-white/[0.06]"}`} data-testid="studio-theme-toggle">{tr("الثيم", "Theme")}</button>
          {draft ? <button type="button" onClick={() => setAsking({ kind: "discard" })} disabled={busy} className="h-7 rounded-lg px-2 text-xs text-white/60 hover:bg-white/[0.06] disabled:opacity-30" data-testid="studio-discard">{tr("إلغاء المسودة", "Discard draft")}</button> : null}
          <button type="button" onClick={() => void askPublish()} disabled={!canPublish || !draft || busy || labShown === "waiting"} className="h-7 rounded-lg bg-accent-500 px-3 text-xs font-medium text-white disabled:opacity-30" data-testid="studio-publish">{labShown === "waiting" ? `⏱ ${tr("عم نفحص السرعة…", "Checking speed…")}` : tr("نشر", "Publish")}</button>
        </div>
        {origin && pageQ.data ? (
          <a href={`${origin}${shopLang === langs.default ? "" : `/${shopLang}`}${pageQ.data.slug === "/" && shopLang !== langs.default ? "" : pageQ.data.slug}`} target="_blank" rel="noreferrer" className="rounded-lg px-2 py-1 text-xs text-accent-300 hover:bg-accent-500/10">
            {tr("فتح بالمتجر", "Open in the store")} ↗
          </a>
        ) : null}
      </header>

      {pageQ.data ? <PagePublicationStatus key={id} page={pageQ.data} lang={shopLang} hasDraft={Boolean(draft)} canPublish={canPublish} /> : null}
      {commerceIssues.length ? <div role="alert" className="shrink-0 border-b border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100" data-testid="studio-commerce-issues">
        <p>{tr("الصفحة بتحتاج العناصر الأساسية ظاهرة على كل أحجام الشاشات، ومرة واحدة لكل عنصر.", "Required commerce objects must be visible at every screen size, once each.")}</p>
        <ul>{commerceIssues.map((issue, index) => <li key={index}>{typeLabel(issue.nodeType)}: {issue.code === "DUPLICATE_COMMERCE_OBJECT" ? tr("مكرر؛ احذف النسخة الإضافية", "Duplicated; remove the extra copy") : tr("أضفه أو أظهره من قائمة الإضافة وإعدادات الظهور", "Add it from Add, or make it visible in display settings")}</li>)}</ul>
        <button type="button" className="mt-1 underline" onClick={() => setCommerceIssues([])}>{tr("إخفاء التنبيه", "Dismiss notice")}</button>
      </div> : null}

      {treeQ.data && treeQ.data.format !== 2 ? (
        <p className="border-b border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200" data-testid="studio-sections-note">
          {tr("الصفحة بالمتجر لسا بتنعرض من الأقسام. هون بتبيّن متل ما رح تطلع بعد التحويل.", "The store still shows this page from its sections. Here it shows as it will after converting.")}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-e border-white/[0.08] p-2 md:block" aria-label={leftTab === "add" ? tr("إضافة", "Add") : leftTab === "styles" ? tr("الستايلات", "Styles") : leftTab === "looks" ? tr("الأشكال", "Looks") : tr("الطبقات", "Layers")}>
          {focus && index && nodeOf(focus.id) ? (
            focusSide()
          ) : (
          <>
          {leftTabs}
          {leftTab === "add" ? (
            index ? addPanel() : null
          ) : leftTab === "styles" ? (
            <>
              <VariablesPanel api={dt} canPublish={canPublish} />
              <div className="my-3 border-t border-white/[0.08]" />
              <SiteStylesList ss={ss} selected={siteSel} canPublish={canPublish} onPick={setSiteSel} />
            </>
          ) : leftTab === "looks" ? (
            looksPanel()
          ) : (
            <>
              {index ? layersList((sid, add) => (add && isFree(nodeOf(sid)?.type) ? toggleChosen(sid) : select(sid, true))) : null}
              <p className="px-2 pt-2 text-[10px] leading-4 text-white/30">{tr("اسحب سطر لتغيير الترتيب، أو لجوّا خلية.", "Drag a row to change the order, or into a cell.")}</p>
            </>
          )}
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
              if (at) {
                select(at.id);
                // Words are written in place; anything else opens on its own (focus mode): the element itself, else
                // the nearest one around it with an editor of its own, else whatever was clicked (zoomed to).
                if (!startText(at.id) && index) {
                  const own = [...pathTo(index, at.id, up)].reverse().find((x) => { const n = index.nodes.get(x)?.node; return Boolean(n && isFree(n.type)); });
                  if (!openFocus(own ?? null)) openFocus(at.id);
                }
              }
            }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={(event) => { if (down.current?.pointerId === event.pointerId) cancelDrag(); }}
            onLostPointerCapture={(event) => { if (down.current?.pointerId === event.pointerId) cancelDrag(); }}
            onPointerLeave={() => { last.current = last.current ? { ...last.current, gone: true } : null; setHovered(filter.current.push(performance.now() + 1000, null)); }}
            onContextMenu={(e) => {
              e.preventDefault();
              const p = local(e);
              const x = e.clientX, y = e.clientY;
              if (inFrame(p)) pickPoint(p, candidates => { if (candidates[0] && !chosen.includes(candidates[0])) select(candidates[0]); setMenu({ x, y, candidates }); });
              else setMenu({ x, y });
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
              {!drop && !editing && !focus && selected && index && selected !== index.root
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
          {focus ? <FocusMask box={shapeOf(focus.id)?.box ?? null} area={canvas} /> : null}
          {videoEditor && focus && nodeOf(focus.id)?.type === "video" ? (
            <VideoEditor
              key={focus.id}
              node={nodeOf(focus.id)!}
              busy={busy}
              abs={(src) => (src.startsWith("/") ? new URL(src, origin).toString() : src)}
              onClose={() => setVideoEditor(false)}
              onSave={async (project) => {
                const n = nodeOf(focus.id)!;
                const props = (n.props ?? {}) as Record<string, unknown>;
                try {
                  const made = await makeVideo(project);
                  await change(say("محرّر الفيديو|The video editor|עורך הווידאו"), [{ op: "setProps", nodeId: n.id, props: { ...props, src: made.url, ...(made.poster ? { poster: made.poster } : {}), edit: { project } } }]);
                  return null;
                } catch (e) {
                  return getApiErrorMessage(e);
                }
              }}
            />
          ) : null}
          {(() => {
            const n = focus ? nodeOf(focus.id) : undefined;
            const sp = n?.type === "image" ? ((n.props as Record<string, unknown> | undefined)?.sparkle as Sparkle | undefined) : undefined;
            const fb = n ? shapeOf(n.id)?.box : undefined;
            if (!n || !sp?.points?.length || !fb) return null;
            const props = (n.props ?? {}) as Record<string, unknown>;
            const chosenStar = focus?.part && /^s\d+$/.test(focus.part.id) ? Number(focus.part.id.slice(1)) : null;
            return (
              <SparkleHandles
                box={fb} points={sp.points} chosen={chosenStar} busy={busy}
                onPick={(i) => setFocus((f) => (f ? { ...f, part: { id: `s${i}`, kind: "star", depth: 0, label: `${say("نجمة|Star|כוכב")} ${i + 1}` } } : f))}
                onMove={(i, at) => void change(say("تحريك نجمة|Move a star|הזזת כוכב"), [{ op: "setProps", nodeId: n.id, props: { ...props, sparkle: { ...sp, points: sp.points.map((x, j) => (j === i ? { ...x, ...at } : x)) } } }])}
                onRemove={(i) => {
                  const points = sp.points.filter((_, j) => j !== i);
                  setFocus((f) => (f ? { ...f, part: null } : f));
                  void change(say("شيل نجمة|Remove a star|הסרת כוכב"), [{ op: "setProps", nodeId: n.id, props: { ...props, sparkle: points.length ? { ...sp, points } : undefined } }]);
                }}
              />
            );
          })()}
          {focusArt && artInfo?.nodeId === focusArt && layout ? (
            <div className="pointer-events-none absolute overflow-hidden" style={{ left: frameBox.x, top: frameBox.y, width: frameBox.w, height: frameBox.h }} data-testid="studio-art-parts">
              {artInfo.parts.filter((x) => x.tag !== "g").map((x) => {
                const b = toScreen(x.rect, layout.scroll, pan, zoom);
                const on = focus?.part?.id === x.id;
                return <div key={x.id} className={`absolute rounded-sm ${on ? "border-2 border-sky-400" : "border border-dashed border-white/35"}`} style={rel(b)} data-testid="studio-art-part" data-part={x.id} data-on={on ? "1" : undefined} />;
              })}
            </div>
          ) : null}
          {(() => {
            const part = focus?.part;
            const n = focusArt ? nodeOf(focusArt) : undefined;
            const art = (n?.props as Record<string, unknown> | undefined)?.art as { nodes: unknown } | undefined;
            const info = part && artInfo?.nodeId === focusArt ? artInfo.parts.find((x) => x.id === part.id) : undefined;
            const shapeNode = part && art ? (part.id.split(".").map(Number).reduce<{ t: string; a: Record<string, string>; c?: unknown[] } | undefined>((at, i, k) => (k === 0 ? (art.nodes as Array<{ t: string; a: Record<string, string>; c?: unknown[] }>)[i] : (at?.c as Array<{ t: string; a: Record<string, string>; c?: unknown[] }> | undefined)?.[i]), undefined)) : undefined;
            if (!n || !part || !info?.ctm || !layout || shapeNode?.t !== "path" || !shapeNode.a.d) return null;
            const toCanvas: Matrix = [zoom, 0, 0, zoom, pan.x - layout.scroll.x * zoom, pan.y - layout.scroll.y * zoom];
            return (
              <PathHandles
                key={`${n.id}:${part.id}`}
                d={shapeNode.a.d}
                matrix={compose(toCanvas, info.ctm)}
                area={canvas}
                busy={busy}
                onLive={(d) => send({ type: "artPreview", nodeId: n.id, part: part.id, d })}
                onDone={(d) => {
                  const props = (n.props ?? {}) as Record<string, unknown>;
                  void change(say("نقاط المسار|The path's points|נקודות הנתיב"), [{ op: "setProps", nodeId: n.id, props: { ...props, art: withArtAttrs(props.art as Parameters<typeof withArtAttrs>[0], part.id, { d }) } }]);
                }}
              />
            );
          })()}
          {focus?.lite ? (
            <div className="pointer-events-auto absolute inset-x-3 top-2 z-[6] flex items-center gap-2 rounded-xl border border-white/[0.1] bg-surface-950/90 px-2 py-1.5 text-xs shadow-xl backdrop-blur" data-testid="studio-focus-bar" data-group="lite" onPointerDown={(e) => e.stopPropagation()}>
              <span className="min-w-0 flex-1 truncate text-white/80">✎ {label(focus.id)}</span>
              <span className="hidden text-white/35 sm:inline">{say("Esc للرجوع|Esc to go back|Esc לחזרה")}</span>
              <button type="button" className="rounded-lg bg-white/[0.08] px-2 py-1 hover:bg-white/[0.14]" onClick={closeFocus} data-testid="studio-focus-exit">{say("رجوع|Back|חזרה")}</button>
            </div>
          ) : null}
          {focus && !focus.lite && index && nodeOf(focus.id) ? (
            <FocusBar
              group={focusGroup(nodeOf(focus.id)!)}
              crumbs={focusCrumbs()}
              current={selected}
              part={focus.part ? focusParts(nodeOf(focus.id)!, index).find((x) => x.id === focus.part!.id) ?? focus.part : null}
              showAll={focusAll}
              onCrumb={(cid, inside) => {
                if (inside) {
                  select(cid);
                  setFocus({ ...focus, part: null });
                } else {
                  closeFocus();
                  select(cid, true);
                }
              }}
              onPart={() => undefined}
              onShowAll={setFocusAll}
              onExit={closeFocus}
            />
          ) : null}
          {selFree && selShape && !editing && !directGeometrySafe(selFree.id) ? <div role="status" className="pointer-events-none absolute bottom-3 start-3 max-w-sm rounded bg-black/80 px-3 py-2 text-xs text-white/80">{tr("هذا التحويل غير قابل للتحرير المباشر حاليًا. استخدم إعدادات المكان والحجم من اللوحة.", "This transform currently needs the layout controls for position and size.")}</div> : null}
          {selFree && !multi && !editing && !placing && !drop && selShape && directGeometrySafe(selFree.id) && !["section", "cell", "columns", "page"].includes(selFree.type) ? (
            <SelectionHandles
              key={`${selFree.id}:${screen}`}
              box={selShape.box}
              geometry={handleGeometry(selFree)}
              proportional={scaleContents && Boolean(selFree.children?.length)}
              ratioLimits={scaleContents && selFree.children?.length && itemOf(selFree.id)?.size ? handle => scaleContentsLimits(selFree, screen, itemOf(selFree.id)!.size!, handle) : undefined}
              zoom={zoom * parentScaleOf(selFree.id) * Math.max(.1, Number(shownLook(selFree, screen, "scale") ?? 1))}
              frame={sizeOf(selFree.id) ? { w: sizeOf(selFree.id)!.w * parentScaleOf(selFree.id) * Number(shownLook(selFree, screen, "scale") ?? 1), h: sizeOf(selFree.id)!.h * parentScaleOf(selFree.id) * Number(shownLook(selFree, screen, "scale") ?? 1), rotation: Number(shownLook(selFree, screen, "rotateZ") ?? 0) } : undefined}
              sides={["heading", "text"].includes(selFree.type) ? "width" : "all"}
              turn={itemOf(selFree.id)?.parentScale===null||Number(shownLook(selFree,screen,"rotateX")??0)||Number(shownLook(selFree,screen,"rotateY")??0)?null:Number(shownLook(selFree, screen, "rotateZ") ?? 0)}
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
          {keysOpen ? <ShortcutsDialog onClose={() => setKeysOpen(false)} /> : null}
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

        {besidePlaced && besideShape && !dragBusy ? (
          <BesideStrips
            place={besidePlaced} groups={inspGroups} active={inspOpen ? inspGroup : null}
            onPick={(g) => { if (g === inspGroup && inspOpen) setInspOpen(false); else { setInspGroup(g); setInspOpen(true); } }}
            onAdd={() => setLeftTab("add")}
          />
        ) : null}
        {besidePlaced && besideLone && !dragBusy ? (
          <button
            type="button" onClick={besideToggle} aria-pressed={besideShown}
            className={`fixed z-30 hidden h-8 w-8 place-items-center rounded-full border text-sm shadow-lg lg:grid ${besideShown ? "border-accent-400 bg-accent-500 text-white" : "border-white/[0.12] bg-surface-950/95 text-white/80 hover:bg-accent-500/30 hover:text-white"}`}
            style={{ left: besidePlaced.panel.left + 288 - 32, top: besidePlaced.panel.top }}
            title={say("لوحة الإعدادات|The settings panel|לוח ההגדרות")} aria-label={say("لوحة الإعدادات|The settings panel|לוח ההגדרות")} data-testid="studio-insp-show"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        ) : null}
        <aside
          className={besidePlaced ? "fixed z-30 hidden w-72 overflow-y-auto rounded-2xl border border-white/[0.12] bg-surface-950/95 p-3 text-sm shadow-2xl backdrop-blur lg:block" : "hidden w-64 shrink-0 overflow-y-auto border-s border-white/[0.08] p-3 text-sm lg:block"}
          style={besidePlaced ? {
            left: besidePlaced.panel.left, top: besidePlaced.panel.top + (besideLone ? 40 : 0), maxHeight: besidePlaced.panel.maxHeight - (besideLone ? 40 : 0),
            // Closed (from its tab, its ✕ or its button), or nothing selected and not asked for: off the page.
            // During a drag: out of the way.
            ...(besideShown ? {} : { display: "none" }),
            ...(dragBusy ? { visibility: "hidden" as const } : {}),
          } : undefined}
          aria-label={tr("العنصر المحدد", "Selected element")} data-testid="studio-info" data-dock={besidePlaced ? "beside" : "side"} data-side={besidePlaced?.side}
          onPointerDown={besidePlaced ? (e) => e.stopPropagation() : undefined}
        >
          <InspectorJump
            watch={`${selected ?? ""}:${focus?.id ?? ""}`}
            sections={sections} tabs={!(besidePlaced && besideShape)} active={inspGroup} onActive={setInspGroup} onGroups={setInspGroups}
            onSections={(on) => { setSections(on); saveSections(on); }}
            dock={dock} onDock={wide ? (d) => { setDock(d); saveDock(d); } : undefined}
            onHide={besidePlaced ? besideToggle : undefined}
          />
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
      {asking?.kind === "publish" && pageQ.data ? <PagePublishDialog key={`${id}:${asking.force}`} page={pageQ.data} force={asking.force} busy={busy} initialOptions={asking.options} onClose={() => setAsking(null)} onConfirm={(options) => publish(asking.force, options)}
        extra={draft?.tree.root ? (
          <SpeedCheck
            pageId={id} lab={labShown}
            fixes={lightenAll(draft.tree.root).length}
            onLighten={() => { const root = latest.current?.tree.root; setAsking(null); if (root) void change(say("خفّف الكل|Lighten them all|הקל על כולם"), lightenAll(root).map((f): PagesAPI.PageDraftOp => ({ op: "setProps", nodeId: f.id, props: f.props }))); }}
          />
        ) : null}
      /> : null}
      <ConfirmDialog
        open={asking !== null && asking.kind !== "publish"}
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
    </TokensContext.Provider></StoreKitContext.Provider>
  );
}

function Shell({ children, busy = false }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-950 text-white" dir={isRtl(adminLang()) ? "rtl" : "ltr"} data-testid="studio" data-busy={busy ? "1" : "0"}>
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

function Layers({ index, id, selected, hovered, sectionTypes, onPick, onHover, onDragStart, onDropOn, depth = 0, childrenOnly = false, tools, parts }: {
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
  parts?: (owner: string, depth: number) => React.ReactNode;
}) {
  const [naming, setNaming] = useState(false);
  const at = index.nodes.get(id);
  if (!at) return null;
  if (tools?.match && !tools.match.has(id)) return null;
  const pass = { index, selected, hovered, sectionTypes, onPick, onHover, onDragStart, onDropOn, tools, parts };
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
      {parts?.(id, depth + 1)}
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
