/**
 * The relations diagram (admin → الجداول → مخطط العلاقات): every table of the owner's as a card
 * with its fields, the store's tables that are linked (all of them on request), and a line for
 * each relation, marked with how many rows stand on each side.
 *
 * - A card is moved by its head; where the cards were left is remembered on this device.
 * - A line is pressed to read the relation in words.
 * - A relation is added by pulling a line from a table's ＋ to another card (or pressing ＋):
 *   the same window as on the Tables page, with the two tables already chosen.
 *
 * Nothing is changed here but through that window: the diagram is drawn from the tables' fields
 * (./diagram.ts has the pure parts).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminLang, isRtl } from "../../lib/lang";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../api/http";
import { say } from "../../studio/say";
import { listCollections, type Collection } from "../../api/collections.api";
import * as DataAPI from "../../api/data.api";
import type { Lang } from "../../api/data.api";
import { LINK_KIND_NAME, LINK_KIND_SHORT, ON_DELETE_NAME } from "../collections/fieldRules";
import { CARD, autoLayout, diagramOf, edgeLine, extent, readPlaces, type DiagramEdge, type DiagramNode, type Pos } from "./diagram";
import { RelationDialog } from "./RelationDialog";
import { LINK_MARKS } from "./relationField";

const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const KEY = "estabrek.diagram.v1";
const ZOOMS = [0.5, 0.65, 0.8, 1, 1.25] as const;

/** Where the cards were left, on this device (a convenience: the diagram draws itself without it). */
function stored() {
  try {
    return readPlaces(window.localStorage.getItem(KEY));
  } catch {
    return readPlaces(null);
  }
}
function store(pos: Record<string, Pos>, allStore: boolean) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ pos, allStore }));
  } catch {
    // Private windows and blocked storage: the places simply aren't kept.
  }
}

export default function RelationsDiagramPage() {
  const lang = adminLang() as Lang;
  const rtl = isRtl(lang);
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const mayLink = hasPermission("pages:write");
  const tables = useQuery({ queryKey: ["collections"], queryFn: listCollections });
  // The store's tables this member may see, for how many rows each holds (the diagram draws without it).
  const theirs = useQuery({ queryKey: ["data", "store"], queryFn: DataAPI.storeTables, retry: false });
  const [kept] = useState(stored);
  const [allStore, setAllStore] = useState(kept.allStore);
  const [moved, setMoved] = useState<Record<string, Pos>>(kept.pos);
  const [zoom, setZoom] = useState<number>(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [linking, setLinking] = useState<{ table: Collection; to?: string } | null>(null);
  /** A line being pulled from a table's ＋: where it started and where the pointer is, in the canvas's units. */
  const [pull, setPull] = useState<{ from: string; x: number; y: number } | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => Object.fromEntries((theirs.data ?? []).map((t) => [t.slug, t.items])), [theirs.data]);
  const diagram = useMemo(() => diagramOf(tables.data ?? [], lang, { allStore, counts }), [tables.data, lang, allStore, counts]);
  const first = useMemo(() => autoLayout(diagram, { rtl }), [diagram, rtl]);
  // A card stands where it was left, else where the diagram puts it.
  const pos = useMemo(() => Object.fromEntries(diagram.nodes.map((n) => [n.id, moved[n.id] ?? first[n.id] ?? { x: CARD.margin, y: CARD.margin }])), [diagram.nodes, moved, first]);
  const size = extent(diagram.nodes, pos);
  const byId = useMemo(() => new Map(diagram.nodes.map((n) => [n.id, n])), [diagram.nodes]);
  useEffect(() => store(moved, allStore), [moved, allStore]);
  // A page that reads right to left begins at its right: the first cards stand there (the canvas itself counts from
  // the left). The furthest card's edge comes to the view's edge, not the empty room kept past it for dragging.
  const drawn = diagram.nodes.length > 0;
  useEffect(() => {
    const box = canvas.current;
    if (!rtl || !drawn || !box) return;
    let end = 0;
    for (const card of box.querySelectorAll<HTMLElement>("[data-node]")) end = Math.max(end, card.offsetLeft + card.offsetWidth);
    box.scrollLeft = Math.max(0, end + CARD.margin - box.clientWidth);
  }, [rtl, drawn]);

  /** The pointer's place in the canvas's own units (the layer is scaled and scrolls). */
  const at = (e: { clientX: number; clientY: number }): Pos => {
    const box = layer.current?.getBoundingClientRect();
    return { x: (e.clientX - (box?.left ?? 0)) / zoom, y: (e.clientY - (box?.top ?? 0)) / zoom };
  };
  /** The card under the pointer when it is let go (a finger keeps the card it started on as its target, so the page is asked). */
  const cardAt = (e: PointerEvent): string | null => {
    const under = typeof document.elementFromPoint === "function" ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const el = (under ?? (e.target as Element | null))?.closest?.("[data-node]");
    return el?.getAttribute("data-node") ?? null;
  };

  /** A card is moved by its head. */
  const startMove = (n: DiagramNode, e: React.PointerEvent) => {
    if ((e.target as Element).closest("a, button")) return;
    e.preventDefault();
    const from = at(e);
    const was = pos[n.id];
    const move = (ev: PointerEvent) => {
      const now = at(ev);
      setMoved((m) => ({ ...m, [n.id]: { x: Math.max(0, Math.round(was.x + now.x - from.x)), y: Math.max(0, Math.round(was.y + now.y - from.y)) } }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** A line is pulled from a table's ＋; let go on a card, the window opens with both tables chosen. A press without a pull opens it with the first table to link. */
  const startPull = (n: DiagramNode, e: React.PointerEvent) => {
    const table = tables.data?.find((c) => c.id === n.id);
    if (!table) return;
    e.preventDefault();
    e.stopPropagation();
    const from = at(e);
    let far = false;
    const move = (ev: PointerEvent) => {
      const now = at(ev);
      if (Math.abs(now.x - from.x) + Math.abs(now.y - from.y) > 6) far = true;
      if (far) setPull({ from: n.id, x: now.x, y: now.y });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setPull(null);
      const to = far ? cardAt(ev) : null;
      // Pulled into the open: nothing. Pressed, or pulled onto a card: the window.
      if (!far || to) setLinking({ table, ...(to ? { to } : {}) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // The lines that end at the same card are spread along its head.
  const into = new Map<string, DiagramEdge[]>();
  for (const e of diagram.edges) into.set(e.to, [...(into.get(e.to) ?? []), e]);
  const lines = diagram.edges.flatMap((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) return [];
    const same = into.get(e.to)!;
    return [{ e, a, b, line: edgeLine(e, a, pos[a.id], b, pos[b.id], same.indexOf(e), same.length) }];
  });
  const chosen = lines.find((l) => l.e.id === picked) ?? null;
  const gridOf = (n: DiagramNode) => (n.store ? `/admin/data?store=${n.slug}` : `/admin/data?table=${n.slug}`);

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="diagram-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{say("مخطط العلاقات|Relations diagram|תרשים הקישורים")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            {say(
              "كل جداولك والخطوط اللي بتربطها ببعض وبجداول المتجر. اسحب البطاقة من راسها لترتّبها، اكبس عالخط لتقرأ العلاقة، واسحب خط من «＋» لجدول ثاني لتضيف علاقة.|Every table of yours and the lines that link them to each other and to the store's tables. Move a card by its head, press a line to read the relation, and pull a line from “＋” to another table to add one.|כל הטבלאות שלך והקווים שמקשרים אותן זו לזו ולטבלאות החנות. גרור כרטיס מהכותרת שלו, לחץ על קו כדי לקרוא את הקישור, ומשוך קו מ״＋״ לטבלה אחרת כדי להוסיף קישור.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-white/65">
            <input type="checkbox" checked={allStore} onChange={(e) => setAllStore(e.target.checked)} data-testid="diagram-all-store" />
            {say("كل جداول المتجر|Every store table|כל טבלאות החנות")}
          </label>
          <button type="button" className={btn} onClick={() => setMoved({})} disabled={!Object.keys(moved).length} data-testid="diagram-arrange" title={say("رجّع البطاقات لترتيبها الأول|Put the cards back where the diagram places them|החזר את הכרטיסים לסידור ההתחלתי")}>
            {say("رتّب لحالك|Arrange|סדר אוטומטית")}
          </button>
          <span className="flex items-center gap-1" role="group" aria-label={say("التكبير|Zoom|זום")}>
            <button type="button" className={btn} onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z as (typeof ZOOMS)[number]) - 1)])} disabled={zoom === ZOOMS[0]} aria-label={say("صغّر|Zoom out|הקטן")} data-testid="diagram-zoom-out">
              −
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-white/60" data-testid="diagram-zoom">{`${Math.round(zoom * 100)}%`}</span>
            <button type="button" className={btn} onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z as (typeof ZOOMS)[number]) + 1)])} disabled={zoom === ZOOMS[ZOOMS.length - 1]} aria-label={say("كبّر|Zoom in|הגדל")} data-testid="diagram-zoom-in">
              +
            </button>
          </span>
          <Link to="/admin/data" className={btn} data-testid="diagram-back">
            {say("الجداول|Tables|טבלאות")}
          </Link>
        </div>
      </header>

      {tables.isLoading ? <div className="text-sm text-white/50">…</div> : null}
      {tables.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(tables.error)}</div> : null}
      {tables.data && !tables.data.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60" data-testid="diagram-empty">
          {say("ما في جداول لسا. اعمل أول جدول من «المجموعات»، وبعدها اربطه من هون.|No tables yet. Make the first one in Collections, then link it here.|אין עדיין טבלאות. צור את הראשונה ב״אוספים״, ואז קשר אותה מכאן.")}
        </div>
      ) : null}

      {/* The relation that was pressed, in words. */}
      {chosen ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-accent-500/40 bg-accent-500/[0.07] px-4 py-3 text-sm" data-testid="edge-details">
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            <bdi>{chosen.a.name}</bdi>
            <b className="rounded bg-white/10 px-1.5 tabular-nums">{LINK_MARKS[chosen.e.kind][0]}</b>
            <span className="text-white/40" aria-hidden>
              ─
            </span>
            <b className="rounded bg-white/10 px-1.5 tabular-nums">{LINK_MARKS[chosen.e.kind][1]}</b>
            <bdi>{chosen.b.name}</bdi>
          </span>
          <span className="text-xs text-white/60">
            {say("الحقل|Field|שדה")}: <bdi className="text-white/85">{chosen.e.fieldName}</bdi> · {say(LINK_KIND_SHORT[chosen.e.kind])}
          </span>
          <span className="w-full text-xs leading-5 text-white/60">
            {say(LINK_KIND_NAME[chosen.e.kind])}.{" "}
            {chosen.b.store
              ? say("سطر المتجر إذا انحذف، الربط بينفك لحاله.|If the store's row is deleted, the link is dropped.|אם שורת החנות נמחקת, הקישור מתבטל.")
              : `${say("لما ينحذف السطر المربوط|When the linked row is deleted|כשהשורה המקושרת נמחקת")}: ${say(ON_DELETE_NAME[chosen.e.onDelete])}.`}
          </span>
          <span className="flex flex-wrap gap-2">
            <Link to={gridOf(chosen.a)} className={btn} data-testid="edge-open-from">
              {say("افتح|Open|פתח")} <bdi>{chosen.a.name}</bdi>
            </Link>
            <Link to={gridOf(chosen.b)} className={btn} data-testid="edge-open-to">
              {say("افتح|Open|פתח")} <bdi>{chosen.b.name}</bdi>
            </Link>
            {mayLink ? (
              <Link to="/admin/collections" className={btn} data-testid="edge-edit">
                {say("عدّلها من حقول الجدول|Change it in the table's fields|שנה בשדות הטבלה")}
              </Link>
            ) : null}
            <button type="button" className={btn} onClick={() => setPicked(null)} data-testid="edge-close">
              {say("سكّر|Close|סגור")}
            </button>
          </span>
        </div>
      ) : null}

      {diagram.nodes.length ? (
        // The canvas counts from its left edge whatever the page's direction; each card's own words follow the page.
        <div ref={canvas} className="overflow-auto rounded-2xl border border-white/10 bg-white/[0.02]" style={{ height: "calc(100vh - 230px)", minHeight: 420 }} dir="ltr" data-testid="diagram-canvas" data-tables={diagram.nodes.length} data-relations={diagram.edges.length}>
          <div style={{ width: size.w * zoom, height: size.h * zoom }}>
            <div ref={layer} className="relative" style={{ width: size.w, height: size.h, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
              <svg className="absolute inset-0 text-white/40" width={size.w} height={size.h} aria-hidden>
                {lines.map(({ e, a, line }) => {
                  const on = e.id === picked;
                  return (
                    <g key={e.id} className={on ? "text-accent-400" : undefined}>
                      <path d={line.d} fill="none" stroke="currentColor" strokeWidth={on ? 2.5 : 1.5} data-testid={`edge-${a.slug}-${e.field}`} data-to={e.to} />
                      {/* A dot where it leaves its row and a larger one where it arrives: a line that only passes behind a card has neither there. */}
                      <circle cx={line.start.x} cy={line.start.y} r={2.5} fill="currentColor" />
                      <circle cx={line.end.x} cy={line.end.y} r={3.5} fill="currentColor" />
                      {/* Wide and unseen: the line is easy to press. */}
                      <path d={line.d} fill="none" stroke="transparent" strokeWidth={14} style={{ pointerEvents: "stroke", cursor: "pointer" }} onClick={() => setPicked(on ? null : e.id)} data-testid={`edge-hit-${a.slug}-${e.field}`} />
                      <text x={line.markA.x} y={line.markA.y} textAnchor="middle" fontSize={12} fontWeight={700} fill="currentColor">
                        {LINK_MARKS[e.kind][0]}
                      </text>
                      <text x={line.markB.x} y={line.markB.y} textAnchor="middle" fontSize={12} fontWeight={700} fill="currentColor">
                        {LINK_MARKS[e.kind][1]}
                      </text>
                    </g>
                  );
                })}
                {pull && byId.get(pull.from) ? <line x1={pos[pull.from].x + CARD.width / 2} y1={pos[pull.from].y + CARD.head / 2} x2={pull.x} y2={pull.y} stroke="currentColor" strokeWidth={2} strokeDasharray="6 5" className="text-accent-400" data-testid="diagram-pull" /> : null}
              </svg>
              {diagram.nodes.map((n) => (
                <div
                  key={n.id}
                  data-node={n.id}
                  data-testid={`node-${n.store ? "store-" : ""}${n.slug}`}
                  dir={rtl ? "rtl" : "ltr"}
                  className={`absolute overflow-hidden rounded-xl border bg-surface-925 shadow-lg ${pull && pull.from !== n.id ? "border-accent-500/60" : n.store ? "border-dashed border-white/25" : "border-white/15"}`}
                  style={{ left: pos[n.id].x, top: pos[n.id].y, width: n.w, height: n.h }}
                >
                  <div className={`flex cursor-grab items-center gap-2 px-3 ${n.store ? "bg-white/[0.04]" : "bg-accent-500/15"}`} style={{ height: CARD.head, touchAction: "none" }} onPointerDown={(e) => startMove(n, e)} data-testid={`head-${n.store ? "store-" : ""}${n.slug}`}>
                    <span className="min-w-0 flex-1">
                      <bdi className="block truncate text-sm font-medium">{n.name}</bdi>
                      <span className="block truncate text-[10px] text-white/45">
                        {n.store ? say("جدول متجر|A store table|טבלת חנות") : say("جدولك|Your table|הטבלה שלך")}
                        {n.items !== undefined ? ` · ${n.items.toLocaleString("en")} ${say("سطر|rows|שורות")}` : ""}
                      </span>
                    </span>
                    <Link to={gridOf(n)} className="shrink-0 rounded px-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label={say("افتح الجدول|Open the table|פתח את הטבלה")} title={say("افتح الجدول|Open the table|פתח את הטבלה")} data-testid={`open-${n.store ? "store-" : ""}${n.slug}`}>
                      ↗
                    </Link>
                    {!n.store && mayLink ? (
                      <button
                        type="button"
                        className="shrink-0 cursor-crosshair rounded-full bg-accent-500 px-1.5 text-xs font-bold leading-5 text-white hover:brightness-110"
                        style={{ touchAction: "none" }}
                        onPointerDown={(e) => startPull(n, e)}
                        // A keyboard has no pull: Enter and Space open the window.
                        onKeyDown={(e) => {
                          const table = tables.data?.find((c) => c.id === n.id);
                          if ((e.key === "Enter" || e.key === " ") && table) {
                            e.preventDefault();
                            setLinking({ table });
                          }
                        }}
                        aria-label={say("علاقة جديدة من هالجدول|A new relation from this table|קישור חדש מהטבלה הזו")}
                        title={say("اسحب لجدول ثاني، أو اكبس|Pull to another table, or press|משוך לטבלה אחרת, או לחץ")}
                        data-testid={`link-${n.slug}`}
                      >
                        ＋
                      </button>
                    ) : null}
                  </div>
                  {n.rows.map((r) => (
                    <div key={r.id} className={`flex items-center gap-2 border-t border-white/[0.06] px-3 text-xs ${r.marks ? "text-white/90" : "text-white/70"}`} style={{ height: CARD.row }} data-testid={`row-${n.slug}-${r.id}`}>
                      <bdi className="min-w-0 flex-1 truncate">{r.name}</bdi>
                      {r.marks ? (
                        <span className="shrink-0 rounded bg-accent-500/20 px-1 text-[10px] tabular-nums" title={r.to === null ? say("جدول مش موجود|A table that isn't there|טבלה שאינה קיימת") : undefined}>
                          {r.to === null ? "?" : `${r.marks[0]} ─ ${r.marks[1]}`}
                        </span>
                      ) : (
                        <span className="shrink-0 truncate text-[10px] text-white/40">{r.kind}</span>
                      )}
                    </div>
                  ))}
                  {n.more ? (
                    <div className="flex items-center border-t border-white/[0.06] px-3 text-[11px] text-white/45" style={{ height: CARD.row }}>
                      {`＋${n.more} ${say("حقل|more fields|שדות נוספים")}`}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {linking ? (
        <RelationDialog
          table={linking.table}
          lang={lang}
          initialTo={linking.to}
          onClose={() => setLinking(null)}
          onDone={() => {
            setLinking(null);
            void qc.invalidateQueries({ queryKey: ["collections"] });
          }}
        />
      ) : null}
    </div>
  );
}
