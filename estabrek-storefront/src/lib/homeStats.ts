/**
 * The home page's sections in numbers (backend lib/homeStats.ts; admin → تجارب A/B → أقسام الرئيسية). Once per
 * visit and section the shop says: it was seen (40% of it, or 40% of the screen, for a second), something in it
 * was tapped, and a piece went into the bag after a tap in it (on any page of the same visit). Only the section's
 * key goes out ("s:<section id>", "b:<scene>"): no cookie, nothing about the shopper; browsers asking not to be
 * tracked send nothing.
 *
 * Also the home order test (an A/B test of kind "homeOrder"): HOME_ORDER_SCRIPT, written right after the home's
 * sections, gives a visit on side B the new order before the page below the opening is seen.
 */
import { apiBaseClient } from "./apiClient";

const SENT = "estabrek_home_sent";
const FROM = "estabrek_home_from";
type Kind = "seen" | "tap" | "bag";

function leftOut() {
  try {
    const n = navigator as Navigator & { globalPrivacyControl?: boolean };
    return n.globalPrivacyControl === true || n.doNotTrack === "1";
  } catch {
    return true;
  }
}

function sentMap(): Record<string, 1> | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SENT) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return null;
  }
}

const queue: Array<{ s: string; k: Kind }> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let unsupported = false;

function send() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (unsupported || !queue.length) { queue.length = 0; return; }
  const body = JSON.stringify({ e: queue.splice(0, 30) });
  try {
    void fetch(`${apiBaseClient()}/storefront/home-stats`, { method: "POST", body, headers: { "Content-Type": "text/plain" }, credentials: "omit", keepalive: true })
      .then((res) => { if (res.status === 404 || res.status === 405) unsupported = true; })
      .catch(() => undefined);
  } catch {
    /* counting must never break the shop */
  }
  if (queue.length) send();
}

/** Note one thing about a section (once per visit and kind). */
function note(section: string, k: Kind) {
  if (typeof window === "undefined" || leftOut() || !section) return;
  const sent = sentMap();
  if (!sent || sent[`${section}|${k}`]) return;
  try {
    sessionStorage.setItem(SENT, JSON.stringify({ ...sent, [`${section}|${k}`]: 1 }));
  } catch {
    return;
  }
  queue.push({ s: section, k });
  if (!timer) timer = setTimeout(send, 3000);
}

/** A piece went into the bag: counted for the home section she last tapped into in this visit. */
export function noteHomeBag() {
  try {
    const from = sessionStorage.getItem(FROM);
    if (from) note(from, "bag");
  } catch {
    /* storage blocked */
  }
}

/** Watch the home page's sections (StorefrontChrome / RoseCmsHome). Returns a stop. */
export function watchHomeSections(frame: HTMLElement): () => void {
  if (leftOut()) return () => {};
  const timers = new Map<Element, ReturnType<typeof setTimeout>>();
  const keyOf = (el: Element | null) => el?.closest("[data-home-key]")?.getAttribute("data-home-key") ?? null;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const big = e.intersectionRatio >= 0.4 || e.intersectionRect.height >= window.innerHeight * 0.4;
      const key = e.target.getAttribute("data-home-key");
      if (!key) continue;
      if (big && !timers.has(e.target)) timers.set(e.target, setTimeout(() => { note(key, "seen"); timers.delete(e.target); }, 1000));
      if (!big && timers.has(e.target)) { clearTimeout(timers.get(e.target)!); timers.delete(e.target); }
    }
  }, { threshold: [0, 0.2, 0.4, 0.6, 1] });
  frame.querySelectorAll(":scope > [data-home-key]").forEach((el) => io.observe(el));
  const tap = (event: Event) => {
    const target = event.target as Element | null;
    const key = keyOf(target);
    if (!key || !target?.closest("a, button, [role='button']")) return;
    note(key, "tap");
    // Where she went from: a later bag add (any page of this visit) is this section's.
    try { sessionStorage.setItem(FROM, key); } catch { /* storage blocked */ }
  };
  frame.addEventListener("click", tap, true);
  const flush = () => { if (document.visibilityState === "hidden") send(); };
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("pagehide", send);
  return () => {
    io.disconnect();
    timers.forEach((t) => clearTimeout(t));
    frame.removeEventListener("click", tap, true);
    document.removeEventListener("visibilitychange", flush);
    window.removeEventListener("pagehide", send);
    send();
  };
}

/**
 * The home order test, side B: written right after the home's sections (RoseCmsHome), it runs as the page is
 * read, before the page below the opening is seen. The sections in B's list take each other's places (the
 * places they held together); everything else stays where it is. The order is drawn with CSS (`order` in a
 * column), so nothing React made is moved; the pinned scenes keep their places (GSAP copies `order` onto its
 * pin wrappers). Kept for good, B is written into the page itself (backend experiments.controller.ts).
 */
export const HOME_ORDER_SCRIPT = `(function(){try{var me=document.currentScript,f=me&&me.parentElement;if(!f)return;var c=window.__estabrekAb||[],t=null;for(var i=0;i<c.length;i++)if(c[i]&&c[i].kind==="homeOrder")t=c[i];if(!t||!Array.isArray(t.b))return;var s=JSON.parse(sessionStorage.getItem("estabrek_ab")||"{}");if(s[t.id]!=="B")return;var kids=f.children,slots=[],at={},css=[];for(var j=0;j<kids.length;j++){var k=kids[j].getAttribute("data-home-key");if(k){at[k]=j;if(t.b.indexOf(k)>=0)slots.push(j)}else css.push(".rose-home>:nth-child("+(j+1)+"){order:"+(j*10)+"}")}var list=t.b.filter(function(k){return k in at});if(list.length<2)return;var pos={};for(var k2 in at)pos[k2]=at[k2];list.forEach(function(k,q){pos[k]=slots[q]});for(var k3 in pos)css.push('.rose-home>[data-home-key="'+k3.replace(/[^A-Za-z0-9:_-]/g,"")+'"]{order:'+(pos[k3]*10)+"}");var st=document.createElement("style");st.setAttribute("data-home-order","B");st.textContent=".rose-home{display:flex;flex-direction:column}.rose-home>*{min-width:0}"+css.join("");document.head.appendChild(st);document.documentElement.setAttribute("data-home-order","B")}catch(e){}})();`;
