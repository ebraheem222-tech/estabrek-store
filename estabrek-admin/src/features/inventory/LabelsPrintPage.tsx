// Barcode labels for SKUs: /print/labels?productId=… | ?productIds=a,b | ?session=1
// (rows handed over by the stock page). Thermal label sizes (one label per page)
// or an A4 sheet of 24. Each label: shop, product, colour · size, price, barcode, SKU.
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { productStock, type StockRow } from "../../api/inventory.api";
import { getApiErrorMessage } from "../../api/http";
import { canEncode, code128Svg } from "../../lib/barcode";
import { useDelivery } from "../orders/useDelivery";

export const LABELS_SESSION_KEY = "estabrek_labels_v1";
type Handoff = { rows: StockRow[]; copies?: Record<string, number> };

/** Open the label page with these rows (too many for a link). */
export function openLabels(rows: StockRow[], copies?: Record<string, number>) {
  try { sessionStorage.setItem(LABELS_SESSION_KEY, JSON.stringify({ rows, copies } satisfies Handoff)); } catch { /* storage blocked */ }
  window.open("/print/labels?session=1", "_blank");
}

type Size = "50x30" | "40x25" | "a4";
const SIZES: Record<Size, { label: string; w: number; h: number }> = {
  "50x30": { label: "50×30 مم (طابعة ملصقات)", w: 50, h: 30 },
  "40x25": { label: "40×25 مم (طابعة ملصقات)", w: 40, h: 25 },
  a4: { label: "ورقة A4 — 24 ملصق (3×8)", w: 70, h: 37 },
};

const css = (size: Size) => {
  const s = SIZES[size];
  const small = s.h < 30;
  return `
  .lp-root { background:#f5f1ee; color:#1d1418; min-height:100vh; padding:20px; font-family:"IBM Plex Sans Arabic","Cairo",system-ui,sans-serif; }
  .lp-bar { position:sticky; top:0; z-index:2; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:center; background:#fff; border:1px solid #ead9e1; border-radius:14px; padding:10px 14px; margin:0 auto 16px; max-width:980px; box-shadow:0 10px 30px -22px rgba(60,20,40,.5); font-size:14px; }
  .lp-bar select, .lp-bar input[type=number] { font:inherit; border:1px solid #e3cdd8; border-radius:8px; padding:6px 8px; background:#fff; }
  .lp-bar button { background:#7d2448; color:#fff; border:0; border-radius:10px; padding:9px 18px; font:inherit; font-weight:600; cursor:pointer; }
  .lp-bar label { display:inline-flex; gap:6px; align-items:center; }
  .lp-list { max-width:980px; margin:0 auto 16px; background:#fff; border:1px solid #ead9e1; border-radius:14px; padding:8px 12px; font-size:13px; }
  .lp-list summary { cursor:pointer; padding:6px 0; color:#7d2448; font-weight:600; }
  .lp-list table { width:100%; border-collapse:collapse; }
  .lp-list td { border-top:1px solid #f3e6ec; padding:5px 4px; }
  .lp-list input { width:64px; font:inherit; border:1px solid #e3cdd8; border-radius:6px; padding:3px 6px; text-align:center; }
  .lp-sheet { display:flex; flex-wrap:wrap; gap:6mm; justify-content:center; }
  .lp-sheet.a4 { width:210mm; margin:0 auto; background:#fff; padding:8mm 0; gap:0; display:grid; grid-template-columns:repeat(3, 70mm); }
  .lbl { width:${s.w}mm; height:${s.h}mm; background:#fff; box-sizing:border-box; padding:${small ? "1.2mm 2mm" : "1.8mm 2.6mm"}; display:flex; flex-direction:column; overflow:hidden; border:1px dashed #d9c4ce; border-radius:2mm; direction:rtl; }
  .lp-sheet.a4 .lbl { border-radius:0; border:1px dashed #eee; }
  .lbl .top { display:flex; justify-content:space-between; gap:2mm; font-size:${small ? 6 : 7}pt; color:#5b3a49; line-height:1.2; }
  .lbl .title { font-size:${small ? 7 : 8.5}pt; font-weight:700; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .lbl .meta { display:flex; justify-content:space-between; font-size:${small ? 6.5 : 8}pt; line-height:1.25; }
  .lbl .meta b { font-weight:800; }
  .lbl .bc { flex:1; min-height:0; display:flex; align-items:stretch; justify-content:center; margin-top:0.6mm; direction:ltr; }
  .lbl .bc svg { width:100%; height:100%; }
  .lbl .sku { direction:ltr; text-align:center; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:${small ? 6 : 7.5}pt; letter-spacing:.04em; line-height:1.15; }
  .lbl .nobc { flex:1; display:grid; place-items:center; font-size:7pt; color:#a33; text-align:center; }
  .lp-empty { text-align:center; padding:40px; color:#7a6570; }
  @media print {
    @page { size: ${size === "a4" ? "A4" : `${s.w}mm ${s.h}mm`}; margin: 0; }
    body { background:#fff !important; }
    .lp-root { background:#fff; padding:0; }
    .lp-bar, .lp-list { display:none; }
    .lp-sheet { display:block; gap:0; }
    .lp-sheet.a4 { display:grid; padding:6mm 0 0; }
    .lbl { border:0; border-radius:0; ${size === "a4" ? "" : "page-break-after:always; break-after:page;"} }
  }`;
};

export default function LabelsPrintPage() {
  const [params] = useSearchParams();
  const { storeName } = useDelivery();
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<Size>(() => (localStorage.getItem("estabrek_label_size") as Size) || "50x30");
  const [mode, setMode] = useState<"one" | "stock">("one");
  const [showPrice, setShowPrice] = useState(true);
  const [copies, setCopies] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (params.get("session")) {
          const h = JSON.parse(sessionStorage.getItem(LABELS_SESSION_KEY) || "null") as Handoff | null;
          if (alive) { setRows(h?.rows ?? []); if (h?.copies) setCopies(h.copies); }
          return;
        }
        const ids = [params.get("productId"), ...(params.get("productIds") ?? "").split(",")].map((x) => (x ?? "").trim()).filter(Boolean);
        const all = (await Promise.all(ids.map((id) => productStock(id)))).flat();
        if (alive) setRows(all.sort((a, b) => String(a.productTitle).localeCompare(String(b.productTitle)) || String(a.colorName).localeCompare(String(b.colorName)) || a.sizeOrder - b.sizeOrder));
      } catch (e) {
        if (alive) setError(getApiErrorMessage(e));
      }
    })();
    return () => { alive = false; };
  }, [params]);

  useEffect(() => { try { localStorage.setItem("estabrek_label_size", size); } catch { /* ignore */ } }, [size]);

  const countOf = (r: StockRow) => copies[r.variantId] ?? (mode === "stock" ? Math.max(0, r.stock) : 1);
  const labels = useMemo(() => (rows ?? []).flatMap((r) => Array.from({ length: Math.min(500, countOf(r)) }, (_, i) => ({ r, i }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, copies, mode]);
  // Bars thinner than ~0.16 mm are hard for scanners (203 dpi label printers): warn about codes too long for the label.
  const tooLong = useMemo(() => {
    const usable = SIZES[size].w - 5;
    return (rows ?? []).filter((r) => canEncode(r.sku) && usable / (11 * (r.sku.length + 3) + 2 + 20) < 0.16);
  }, [rows, size]);
  const svgs = useMemo(() => new Map((rows ?? []).map((r) => [r.variantId, canEncode(r.sku) ? code128Svg(r.sku, { height: 60, module: 2 }) : null])), [rows]);

  return (
    <div dir="rtl" className="lp-root" data-testid="labels-page">
      <style>{css(size)}</style>
      <div className="lp-bar">
        <label>المقاس <select value={size} onChange={(e) => setSize(e.target.value as Size)}>{(Object.keys(SIZES) as Size[]).map((k) => <option key={k} value={k}>{SIZES[k].label}</option>)}</select></label>
        <label>عدد الملصقات <select value={mode} onChange={(e) => { setMode(e.target.value as "one" | "stock"); setCopies({}); }}><option value="one">واحد لكل مقاس</option><option value="stock">حسب الكمية في المخزون</option></select></label>
        <label><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> السعر</label>
        <span style={{ color: "#7a6570" }}>{labels.length} ملصق</span>
        {tooLong.length ? <span style={{ color: "#a33", fontSize: 12 }} title={tooLong.map((r) => r.sku).join("\n")}>⚠ {tooLong.length} كود طويل لهذا المقاس — اختاري مقاساً أكبر أو كوداً أقصر</span> : null}
        <button type="button" onClick={() => window.print()} disabled={!labels.length}>طباعة</button>
      </div>

      {rows && rows.length > 0 && (
        <details className="lp-list">
          <summary>تعديل عدد الملصقات لكل مقاس ({rows.length})</summary>
          <table><tbody>
            {rows.map((r) => (
              <tr key={r.variantId}>
                <td>{r.productTitle}</td><td>{r.colorName} · {r.size}</td><td dir="ltr" style={{ fontFamily: "monospace" }}>{r.sku}</td><td>في المخزون {r.stock}</td>
                <td><input type="number" min={0} max={500} value={countOf(r)} onChange={(e) => setCopies((c) => ({ ...c, [r.variantId]: Math.max(0, Math.min(500, Number(e.target.value) || 0)) }))} aria-label={`عدد ملصقات ${r.sku}`} /></td>
              </tr>
            ))}
          </tbody></table>
        </details>
      )}

      {error ? <div className="lp-empty">تعذّر التحميل: {error}</div> : !rows ? <div className="lp-empty">جارٍ التحميل…</div> : !labels.length ? <div className="lp-empty">لا توجد ملصقات للطباعة.</div> : (
        <div className={`lp-sheet ${size === "a4" ? "a4" : ""}`}>
          {labels.map(({ r, i }) => (
            <div className="lbl" key={`${r.variantId}-${i}`} data-testid="label">
              <div className="top"><span>{storeName || "استبرق"}</span>{showPrice ? <b>₪{Number(r.price || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}</b> : null}</div>
              <div className="title">{r.productTitle}</div>
              <div className="meta"><span>{r.colorName}</span><span>مقاس <b>{r.size}</b></span></div>
              {svgs.get(r.variantId) ? <div className="bc" dangerouslySetInnerHTML={{ __html: svgs.get(r.variantId)! }} /> : <div className="nobc">هذا الكود فيه حروف عربية — غيّريه لحروف إنجليزية ليُطبع كباركود</div>}
              <div className="sku">{r.sku}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
