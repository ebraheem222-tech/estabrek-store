// A picture of the shop's small bag in one of its designs (estabrek-storefront/src/lib/miniBagDesigns.ts), drawn
// with the shop's own stylesheet (app/minibag-designs.css) over a sketch of a store page: the same markup as the
// shop's bag (components/cinematic/RoseMiniBag.tsx DesignedBag), with sample pieces. A whole screen (a computer's
// or a phone's) is drawn at its real size and scaled down, so the bag lays itself out as it does in the shop.
import type { CSSProperties } from "react";
import { miniBagAttrs, miniBagHas, type MiniBagDesign } from "../../../../estabrek-storefront/src/lib/miniBagDesigns";
import "../../../../estabrek-storefront/src/app/minibag-designs.css";
import { say } from "../../studio/say";

export type SampleLine = { id: string; title: string; detail: string; price: string; photo: string; quantity: number };
/** A store theme's colours (the shop's theme palette: bg, surface, soft, line, glow, muted, accent, strong, ink, onStrong). */
export type PreviewPalette = Record<string, string>;

export const SCREENS = { desktop: [1280, 800], phone: [390, 844] } as const;

/** The theme's colours as the variables the shop sets on its pages (storeThemes/css.ts themeCss). */
export function paletteVars(p: PreviewPalette | null | undefined, fonts?: { display?: string; text?: string }): CSSProperties {
  const v: Record<string, string> = {};
  if (p) {
    const map: Record<string, string> = { bg: "--th-bg", surface: "--th-surface", soft: "--th-soft", line: "--th-line", glow: "--th-glow", muted: "--th-muted", accent: "--th-accent", strong: "--th-strong", ink: "--th-ink", onStrong: "--th-on-strong" };
    for (const [k, name] of Object.entries(map)) if (typeof p[k] === "string") v[name] = p[k];
  }
  if (fonts?.display) v["--th-display"] = `"${fonts.display}", Georgia, serif`;
  if (fonts?.text) v["--th-text"] = `"${fonts.text}", system-ui, sans-serif`;
  return v as CSSProperties;
}

/** A page behind the bag: a header with the bag icon, an opening and a row of products, in the store's colours. */
function PageSketch({ phone }: { phone: boolean }) {
  const bg = "var(--th-bg, #fff8f4)";
  const ink = "var(--th-ink, #4d2039)";
  const soft = "var(--th-soft, #f7dce8)";
  const surface = "var(--th-surface, #fffaf7)";
  const accent = "var(--th-strong, #a43b64)";
  const bar = (w: number | string, o = 0.18) => <i style={{ display: "block", height: 14, width: w, borderRadius: 7, background: ink, opacity: o }} />;
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={{ height: phone ? 64 : 76, display: "flex", alignItems: "center", gap: 24, padding: phone ? "0 18px" : "0 48px", borderBottom: `1px solid ${soft}` }}>
        <i style={{ width: 34, height: 34, borderRadius: 10, background: accent, opacity: 0.85 }} />
        {bar(phone ? 90 : 120, 0.3)}
        <span style={{ flex: 1 }} />
        {phone ? null : <>{bar(70)}{bar(70)}{bar(70)}</>}
        <i style={{ width: 30, height: 30, borderRadius: 9, border: `2.5px solid ${ink}`, opacity: 0.6 }} />
      </div>
      <div style={{ margin: phone ? "18px" : "32px 48px", height: phone ? 300 : 330, borderRadius: 24, background: `linear-gradient(120deg, ${soft}, ${surface})`, display: "grid", alignContent: "center", gap: 16, padding: phone ? 22 : 56 }}>
        {bar(phone ? "70%" : 420, 0.5)}
        {bar(phone ? "50%" : 300, 0.25)}
        <i style={{ display: "block", width: 150, height: 44, borderRadius: 22, background: accent, opacity: 0.9 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${phone ? 2 : 4}, 1fr)`, gap: 18, margin: phone ? "0 18px" : "0 48px" }}>
        {Array.from({ length: phone ? 4 : 4 }, (_, i) => (
          <div key={i} style={{ display: "grid", gap: 10 }}>
            <i style={{ display: "block", aspectRatio: "4 / 5", borderRadius: 18, background: soft }} />
            {bar("70%", 0.3)}
            {bar("40%", 0.18)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniBagPreview({
  design: x, screen = "desktop", width, lines, total, vars, dir, still = true, open = true, testid,
}: {
  design: MiniBagDesign;
  screen?: keyof typeof SCREENS;
  /** Drawn width in pixels (the screen is scaled to it). */
  width: number;
  lines: SampleLine[];
  total: string;
  vars?: CSSProperties;
  dir: "rtl" | "ltr";
  /** Without its motion (the gallery's small pictures). */
  still?: boolean;
  open?: boolean;
  testid?: string;
}) {
  const [w, h] = SCREENS[screen];
  const scale = width / w;
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const photo = lines.find((l) => l.photo)?.photo;
  const fresh = lines[0]?.id;
  return (
    <div style={{ width, height: Math.round(h * scale), overflow: "hidden", position: "relative", borderRadius: screen === "phone" ? 18 : 10 }} data-testid={testid} data-screen={screen}>
      <div style={{ position: "absolute", top: 0, left: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", ...vars }} dir={dir}>
        <PageSketch phone={screen === "phone"} />
        <div className="mb" {...miniBagAttrs(x)} data-open={open ? "true" : undefined} data-mb-still={still ? "" : undefined} dir={dir}>
          <div className="mb-scrim" />
          <div className="mb-panel" role="presentation">
            <header className="mb-head">
              {x.head === "photo" ? <span className="mb-head-pic">{photo ? <img src={photo} alt="" /> : null}</span> : null}
              <span className="mb-mark">
                <svg className="mb-tick" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m7 12.5 3.3 3.3L17.5 8.5" /></svg>
                <b className="mb-count-num">{count}</b>
              </span>
              <span className="mb-title">
                <strong>{say("انضافت لحقيبتك|Added to your bag|נוסף לסל שלך")}</strong>
                <small className="mb-count">{say(`${count} قطعة|${count} pieces|${count} פריטים`)}</small>
              </span>
              <span className="mb-dots">{miniBagHas(x, "colours") ? ["#c97794", "#3d5a80", "#e9c46a"].map((c) => <i key={c} style={{ background: c }} />) : null}</span>
              <span className="mb-close">
                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </span>
            </header>
            {miniBagHas(x, "free") ? (
              <p className="mb-free">
                <span>{say("ضيفي 40 ₪ كمان والتوصيل علينا|Add ₪40 more for free delivery|עוד ‎₪40 והמשלוח בחינם")}</span>
                <span className="mb-free-bar"><i style={{ width: "72%" }} /></span>
              </p>
            ) : null}
            <ul className="mb-lines">
              {lines.map((l, i) => (
                <li key={l.id} className="mb-line" data-fresh={l.id === fresh ? "true" : undefined} style={{ "--i": i } as CSSProperties}>
                  <span className="mb-pic">{l.photo ? <img src={l.photo} alt="" /> : null}</span>
                  <span className="mb-words">
                    <strong>{l.title}</strong>
                    {l.detail ? <small>{l.detail}</small> : null}
                    <span className="mb-actions">
                      <span className="mb-qty"><span>−</span><output>{l.quantity}</output><span>+</span></span>
                      {miniBagHas(x, "remove") ? <span className="mb-remove">{say("إزالة|Remove|הסרה")}</span> : null}
                    </span>
                  </span>
                  <span className="mb-price">{l.price}</span>
                </li>
              ))}
            </ul>
            <footer className="mb-foot">
              <span className="mb-total"><span>{say("المجموع|Subtotal|סכום ביניים")}</span><strong>{total}</strong></span>
              <span className="mb-checkout">
                <span>{say("إتمام الطلب|Checkout|להשלמת ההזמנה")}</span>
                <span className="mb-checkout-sum">{total}</span>
                <svg className="mb-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
              <span className="mb-continue">{say("متابعة التسوق|Keep shopping|להמשיך בקנייה")}</span>
              {miniBagHas(x, "secure") ? <small className="mb-secure">{say("دفع آمن|Secure checkout|תשלום מאובטח")}</small> : null}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
