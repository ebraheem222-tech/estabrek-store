"use client";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { collectionSeed } from "@/lib/collectionTheme";
import { moodOf, type Mood } from "@/lib/categoryMood";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { collectionSeeds, normalHex, photoColour, sceneTheme } from "@/lib/sceneColour";
import { lazyMargin } from "@/lib/motionSettings";
import { motionLevel } from "@/lib/motionBudget";
import { tr } from "@/lib/words";
import type { ModelKey } from "./CollectionModelsScene";
import type { RoseCollection } from "./RoseSections";

const CollectionModelsScene = dynamic(() => import("./CollectionModelsScene"), { ssr: false, loading: () => null });

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Which 3D model stands beside a collection: the stories' own for accessories, kids and incense; a draped hijab otherwise. */
const modelFor = (mood: Mood): ModelKey => (mood === "accessories" || mood === "kids" || mood === "incense" ? mood : "hijab");

/** A line under each collection's name, by its mood. */
function lineFor(mood: Mood, lang: Parameters<typeof tr>[0]) {
  switch (mood) {
    case "winter": return tr(lang, "دفء ناعم لأيام البرد، بألوان أعمق.", "Soft warmth for cold days, in deeper colours.");
    case "spring": return tr(lang, "أقمشة خفيفة تتنفّس، وألوان فاتحة.", "Light fabrics that breathe, in fresh colours.");
    case "incense": return tr(lang, "روائح تملأ البيت، بلمسة عربية.", "Scents that fill the home, with an Arabic touch.");
    case "accessories": return tr(lang, "تفاصيل صغيرة تكمّل إطلالتكِ.", "Small details that finish your look.");
    case "kids": return tr(lang, "قطع مريحة وحلوة للصغار.", "Comfy, lovely pieces for the little ones.");
    case "prayer": return tr(lang, "لحظات هادئة بقطع ناعمة.", "Quiet moments, soft pieces.");
    case "hijab": return tr(lang, "طيّات تنساب معكِ طول اليوم.", "Folds that flow with you all day.");
    case "dresses": return tr(lang, "قصّات محتشمة تليق بكل مناسبة.", "Modest cuts for every occasion.");
    default: return tr(lang, "قطع مختارة لكِ بحب.", "Pieces chosen for you, with love.");
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/*
 * The home's collections as a scroll story (rose-showcase.css, "the collections"): the section holds the
 * screen while it scrolls through the collections one by one. Each one comes big, with its arched photo,
 * its name rising word by word, a line about it and its link; beside it its 3D model turns (a draped
 * hijab in the collection's colour, or the bracelet, the little dress, the incense burner), handing over
 * to the next one's as the page scrolls. The section takes the colours of the collection in view: the colour
 * the owner gave it, else its photo's (the garment's), else its kind's; and while the section holds the screen
 * the header and the page wear that colour too, gliding from one collection's to the next (lib/sceneColour.ts).
 * Without motion (or the editor's frame) the collections stay a grid (RoseCollections).
 */
export function RoseCollectionsScroll({ items, title, subtitle, anchor = "collections" }: { items: RoseCollection[]; title?: string; subtitle?: string; anchor?: string }) {
  const { language: lang } = useLanguage();
  const rtl = lang !== "en";
  const root = useRef<HTMLElement>(null);
  const chapters = useMemo(() => items.map((item, i) => {
    const mood = moodOf([item.label, item.title, item.href]);
    return { item, mood, key: modelFor(mood), seed: collectionSeed(item, i) };
  }), [items]);
  // Each collection's own colour: the owner's, else its photo's once read (kept apart from its neighbour's, so
  // the colour visibly changes from one to the next), else its kind's.
  const [photoSeeds, setPhotoSeeds] = useState<Array<string | null>>([]);
  useEffect(() => {
    let live = true;
    void Promise.all(items.map((item) => (normalHex((item as { themeColor?: string }).themeColor) || normalHex((item as { color?: string }).color) ? Promise.resolve(null) : photoColour(item.imageUrl)))).then((found) => { if (live) setPhotoSeeds(found); });
    return () => { live = false; };
  }, [items]);
  const seeds = useMemo(() => collectionSeeds(items, photoSeeds), [items, photoSeeds]);
  const keys = useMemo(() => Array.from(new Set(chapters.map((c) => c.key))), [chapters]);
  // Read by the scroll (a photo's colour arriving late doesn't rebuild the scroll triggers).
  const seedsRef = useRef(seeds);
  seedsRef.current = seeds;
  const wearRef = useRef<((seed: string) => void) | null>(null);
  useEffect(() => { wearRef.current?.(seeds[lead] ?? seeds[0]); }, [seeds]); // eslint-disable-line react-hooks/exhaustive-deps
  const weights = useRef<number[]>(keys.map((k) => (k === chapters[0]?.key ? 1 : 0)));
  const tint = useRef<string>(chapters[0]?.seed ?? "#d99fb6");
  const [lead, setLead] = useState(0);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [compact, setCompact] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [models, setModels] = useState(true);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    setModels(motionLevel() !== "lite");
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: lazyMargin(700) });
    const view = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    view.observe(el);
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => { io.disconnect(); view.disconnect(); mq.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    const el = root.current;
    const n = chapters.length;
    if (!el || n < 1) return;
    gsap.registerPlugin(ScrollTrigger);
    // While the section holds the screen the page (the header too) wears the collection's colour.
    const theme = sceneTheme(el, "collections");
    let shown = -1;
    let leadSeed = seedsRef.current[0];
    let themeOn = false;
    /** The section (and, while it holds the screen, the page) in a collection's colour. */
    const dress = (seed: string, seconds: number) => {
      leadSeed = seed;
      if (theme && themeOn && !document.documentElement.hasAttribute("data-visual-theme")) theme.wear(seed, seconds);
      // Outside the store's shell (or under a CMS visual theme) the section alone takes the colours.
      else if (!theme || document.documentElement.hasAttribute("data-visual-theme")) Object.entries(storefrontPalette(seed)).forEach(([name, value]) => el.style.setProperty(name, value));
    };
    wearRef.current = (seed) => dress(seed, 0.7);
    const render = (progress: number) => {
      // Where the scroll is among the collections (0 … n-1), and how much of each one shows.
      // (Held at the ends: the first model is there as the section opens, the last stays to its end.)
      const at = Math.min(n - 1, Math.max(0, progress * n - 0.5));
      // One model at a time: the one in view leaves fully before the next one rises (crossed, two models
      // stood on the same spot at a hand-over and looked like a glitch).
      const per = chapters.map((_, i) => 1 - smooth(0.3, 0.5, Math.abs(at - i)));
      weights.current = keys.map((k) => Math.max(0, ...chapters.map((c, i) => (c.key === k ? per[i] : 0))));
      const leadNow = Math.max(0, Math.min(n - 1, Math.round(at)));
      tint.current = seedsRef.current[leadNow];
      el.style.setProperty("--cs-progress", progress.toFixed(4));
      if (leadNow === shown) return;
      shown = leadNow;
      dress(seedsRef.current[leadNow], 0.7);
      setLead(leadNow);
    };
    render(0);
    const trigger = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (self) => render(self.progress) });
    // The colours are taken a little before the section fills the screen and given back after.
    const themeTrigger = theme ? ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 45%",
      onToggle: (self) => {
        themeOn = self.isActive;
        if (self.isActive) dress(leadSeed, 0.8);
        else theme.giveBack();
      },
    }) : null;
    if (themeTrigger?.isActive) { themeOn = true; dress(leadSeed, 0); }
    return () => { wearRef.current = null; trigger.kill(); themeTrigger?.kill(); theme?.giveBack(true); };
  }, [chapters, keys]);

  const chapter = chapters[lead];
  if (!chapter) return null;
  const { item, mood } = chapter;
  const name = item.label || item.title || tr(lang, "اكتشفي المجموعة", "Explore the collection");
  return (
    <section id={anchor} ref={root} className="rose-collections-scroll" style={{ "--cs-n": chapters.length } as CSSProperties} data-mood={mood}>
      <div className="rose-cs-stage">
        <span className="rose-cs-glow" aria-hidden="true" />
        <header className="rose-cs-head">
          <span className="atelier-eyebrow">{tr(lang, "لكل يوم، ولكل حكاية", "A LITTLE SOMETHING FOR EVERY DAY")}</span>
          <h2 data-edit="title">{title || tr(lang, "عالم من الاختيارات.", "A world of possibilities.")}</h2>
          {subtitle ? <p data-edit="subtitle">{subtitle}</p> : null}
        </header>
        <div className="rose-cs-canvas" aria-hidden="true">
          {models && near && !failed ? (
            <SceneBoundary onError={() => setFailed(true)}>
              <CollectionModelsScene keys={keys} weights={weights} tint={tint} active={inView} compact={compact} rtl={rtl} onReady={() => setReady(true)} onFailure={() => setFailed(true)} />
            </SceneBoundary>
          ) : null}
        </div>
        <div className="rose-cs-copy" key={lead} data-ready={ready || undefined}>
          <span className="rose-cs-count" dir="ltr">{String(lead + 1).padStart(2, "0")} <i /> {String(chapters.length).padStart(2, "0")}</span>
          <Link href={item.href || "/shop"} className="rose-cs-photo" data-edit-media={`items.${lead}.imageUrl`}>
            <Image src={item.imageUrl || "/editorial/scarves.webp"} alt={name} fill sizes="(max-width:760px) 40vw, 22vw" />
          </Link>
          <h3 className="rose-cs-name" data-edit={item.label || !item.title ? `items.${lead}.label` : `items.${lead}.title`}>
            {/* Word by word (Arabic letters join: a word stays whole). */}
            {name.split(" ").map((word, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{i ? " " : ""}{word}</span>)}
          </h3>
          <p className="rose-cs-line">{lineFor(mood, lang)}</p>
          <Link href={item.href || "/shop"} className="atelier-button rose-cs-cta">{tr(lang, "اكتشفي المجموعة", "Explore the collection")}<Icon name="arrow" /></Link>
        </div>
        <ol className="rose-cs-dots" aria-label={tr(lang, "المجموعات", "Collections")}>
          {chapters.map((c, i) => (
            <li key={i} aria-current={i === lead ? "step" : undefined}>
              <Link href={c.item.href || "/shop"} aria-label={c.item.label || c.item.title || ""} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
