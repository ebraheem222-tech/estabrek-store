"use client";
import { useEffect, useRef, useState } from "react";
import { roseSay } from "@/lib/roseEvents";
import { tr } from "@/lib/words";
import type { Lang } from "@/lib/i18n";
import { useLanguage } from "./Language";

/*
 * Story mode (rose-wonders.css, "the story"): the home read as a tale in chapters, one per section. A rail on
 * the page's far edge counts them (03 / 10) and names the one you're in, written upright; a tap on a chapter
 * goes there. On a phone a small pill at the bottom of the screen says where you are and leads to the next chapter.
 * Each time a new chapter opens, Razan walks a few steps and says a word about it (once a chapter a visit,
 * within the owner's Razan settings). Not in the editor's frame.
 */
type Kind = "start" | "particles" | "fabric" | "seasons" | "products" | "collections" | "stories" | "rooms" | "world" | "instagram" | "faq" | "cta" | "other";
type Chapter = { el: HTMLElement; kind: Kind; name: string };

function kindOf(box: HTMLElement, index: number): Kind {
  const has = (s: string) => Boolean(box.matches(s) || box.querySelector(s));
  if (index === 0) return "start";
  if (has('[data-rose-block="particles"]')) return "particles";
  if (has(".rose-video, .design-study")) return "fabric";
  if (has('[data-rose-block="seasons"]')) return "seasons";
  if (has(".rose-collections-scroll, .atelier-collections")) return "collections";
  if (has('[data-rose-block="stories"]')) return "stories";
  if (has('[data-rose-block="rooms"]')) return "rooms";
  if (has('[data-rose-block="world"]')) return "world";
  if (has('[data-rose-block="instagram"]')) return "instagram";
  if (has(".rose-product-tile, .rose-arrivals, [id^='arrivals'], [id^='products-']")) return "products";
  if (has("details, .rose-faq, [class*='faq']")) return "faq";
  if (has(".rose-cta, [class*='cta']")) return "cta";
  return "other";
}

const NAMES: Record<Kind, (lang: Lang) => string> = {
  start: (l) => tr(l, "البداية", "The start"), particles: (l) => tr(l, "الحكاية", "The tale"), fabric: (l) => tr(l, "القماش", "The fabric"),
  seasons: (l) => tr(l, "المواسم", "The seasons"), products: (l) => tr(l, "وصل حديثاً", "New in"), collections: (l) => tr(l, "المجموعات", "Collections"),
  stories: (l) => tr(l, "العوالم", "The worlds"), rooms: (l) => tr(l, "الغرف", "The rooms"), world: (l) => tr(l, "الخريطة", "The map"),
  instagram: (l) => tr(l, "إنستغرام", "Instagram"), faq: (l) => tr(l, "أسئلة", "Questions"), cta: (l) => tr(l, "تواصل", "Contact"), other: (l) => tr(l, "فصل", "Chapter"),
};
const LINES: Record<Kind, (lang: Lang) => string> = {
  start: (l) => tr(l, "أهلاً! خليني أمشي معكِ بالمتجر فصل فصل 🌸", "Hi! Let me walk you through the shop, chapter by chapter 🌸"),
  particles: (l) => tr(l, "شوفي كيف بنتشكّل: لوجو، حجاب، حقيبة ✨", "Watch us take shape: a logo, a hijab, a bag ✨"),
  fabric: (l) => tr(l, "القماش عنا بيتحرّك متل الحرير 💗", "Our fabric moves like silk 💗"),
  seasons: (l) => tr(l, "هون المواسم: شتا وربيع ❄️🌸", "Here are the seasons: winter and spring ❄️🌸"),
  products: (l) => tr(l, "هاي آخر القطع اللي وصلت 🛍️", "These just arrived 🛍️"),
  collections: (l) => tr(l, "اختاري مجموعتك، وأنا بلفّ معكِ 💗", "Pick your collection, I'll come along 💗"),
  stories: (l) => tr(l, "تعالي نزور العوالم الصغيرة 🌍", "Let's visit the little worlds 🌍"),
  rooms: (l) => tr(l, "هاي غرف القطع المميزة… ادخلي 💎", "These are the rooms of our signature pieces… come in 💎"),
  world: (l) => tr(l, "اسحبي الخريطة وشوفي لوين بنوصّل 🗺️", "Drag the map and see where we deliver 🗺️"),
  instagram: (l) => tr(l, "شاركينا إطلالتك على إنستغرام 📸", "Share your look with us on Instagram 📸"),
  faq: (l) => tr(l, "عندك سؤال؟ الجواب هون 💬", "Got a question? The answer is here 💬"),
  cta: (l) => tr(l, "وصلنا للآخر! تواصلي معنا متى ما بدك 🌸", "We made it to the end! Reach us any time 🌸"),
  other: (l) => tr(l, "تعالي نكمّل 🌸", "Let's keep going 🌸"),
};

export function RoseStoryMode({ enabled = true }: { enabled?: boolean }) {
  const { language: lang } = useLanguage();
  const [chapters, setChapters] = useState<Array<{ kind: Kind; name: string }>>([]);
  const [current, setCurrent] = useState(0);
  const list = useRef<Chapter[]>([]);
  const pill = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled || window.self !== window.top) return;
    const frame = document.querySelector<HTMLElement>(".rose-page-frame.rose-home");
    if (!frame) return;
    const said = new Set<Kind>();
    let shown = -1, raf = 0, sayTimer = 0, walkTimer = 0;
    const build = () => {
      const boxes = (Array.from(frame.children) as HTMLElement[]).filter((b) => b.offsetHeight > 120);
      list.current = boxes.map((el, i) => {
        const kind = kindOf(el, i);
        const own = kind === "other" ? (el.querySelector("h2, h1")?.textContent ?? "").trim().replace(/\s+/g, " ") : "";
        const short = own.length <= 22 ? own : `${own.split(" ").slice(0, 3).join(" ").slice(0, 22)}…`;
        return { el, kind, name: own ? short : NAMES[kind](lang) };
      });
      setChapters(list.current.map(({ kind, name }) => ({ kind, name })));
    };
    const update = () => {
      raf = 0;
      const mid = window.innerHeight * 0.45;
      const at = list.current.findIndex((c) => { const r = c.el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
      if (at < 0 || at === shown) return;
      shown = at;
      setCurrent(at);
      const chapter = list.current[at];
      // A new chapter: Razan walks a few steps and says a word about it (once each, after the scroll settles).
      window.clearTimeout(sayTimer);
      sayTimer = window.setTimeout(() => {
        if (shown !== at || said.has(chapter.kind)) return;
        said.add(chapter.kind);
        const rose = document.querySelector<HTMLElement>(".rose-companion");
        if (rose) {
          rose.dataset.walking = "true";
          window.clearTimeout(walkTimer);
          walkTimer = window.setTimeout(() => { delete rose.dataset.walking; }, 1500);
        }
        roseSay(LINES[chapter.kind](lang), chapter.kind === "cta" ? "cheer" : "wave");
      }, 700);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    build();
    update();
    // The phone's pill steps aside while the "you viewed" note shows at the bottom (watched here: a CSS :has()
    // rule alone isn't in every phone's browser).
    let watched: Element | null = null;
    let recentObserver: MutationObserver | null = null;
    const yieldPill = () => {
      const recent = document.querySelector(".rose-recent");
      pill.current?.toggleAttribute("data-yield", recent?.getAttribute("aria-hidden") === "false");
      if (recent === watched) return;
      recentObserver?.disconnect();
      watched = recent;
      if (recent) { recentObserver = new MutationObserver(yieldPill); recentObserver.observe(recent, { attributes: true, attributeFilter: ["aria-hidden"] }); }
    };
    const recentTimer = window.setInterval(yieldPill, 1500);
    yieldPill();
    const kids = new MutationObserver(() => { build(); schedule(); });
    kids.observe(frame, { childList: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(sayTimer);
      window.clearTimeout(walkTimer);
      kids.disconnect();
      recentObserver?.disconnect();
      window.clearInterval(recentTimer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled, lang]);

  if (!enabled || chapters.length < 2) return null;
  const go = (i: number) => list.current[i]?.el.scrollIntoView({ behavior: "smooth", block: "start" });
  const count = (i: number) => String(i + 1).padStart(2, "0");
  return (
    <>
      <nav className="rose-story-rail" aria-label={tr(lang, "فصول الصفحة", "The page's chapters")}>
        <span className="rose-story-count" dir="ltr">{count(current)} <i /> {count(chapters.length - 1)}</span>
        <ol>
          {chapters.map((c, i) => (
            <li key={i} aria-current={i === current ? "step" : undefined}>
              <button type="button" onClick={() => go(i)}><span className="rose-story-dot" aria-hidden="true" /><span className="rose-story-name">{c.name}</span></button>
            </li>
          ))}
        </ol>
        <span className="rose-story-now" aria-hidden="true">{chapters[current]?.name}</span>
      </nav>
      <button ref={pill} type="button" className="rose-story-pill" onClick={() => go(Math.min(chapters.length - 1, current + 1))} aria-label={tr(lang, "الفصل الجاي", "Next chapter")}>
        <span dir="ltr">{count(current)}/{count(chapters.length - 1)}</span>
        <strong>{chapters[current]?.name}</strong>
        <i style={{ "--story-p": (current + 1) / chapters.length } as React.CSSProperties} aria-hidden="true" />
      </button>
    </>
  );
}
