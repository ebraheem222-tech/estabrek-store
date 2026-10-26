"use client";
/**
 * A gaming theme's opening: its words beside a 3D stage of gaming models (three/GameStage).
 * The shopper picks a model (on the stage or with the buttons under it) and its category
 * is one click away; or picks a game, which recolours the stage, brings its model forward
 * and links to its products. The store chooses the models, their links and its games
 * (Admin → ثيمات المتجر → الموديلات والألعاب); until then the theme's own are shown.
 * The theme's drawing stays in place until the 3D is ready, and for good without WebGL.
 * In the admin's scene editor (the studio frame, through studioLink) the stage draws the
 * admin's draft as it changes, shows handles on the model being edited and reports them,
 * shows the scroll the admin picks instead of the page's, and says what each 3D file holds.
 * The store's scene settings (layout, floor, camera, lights) win over the theme's own.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hexToLab, mix, type Palette } from "../colour";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import { Backdrop, HeroArt } from "../svg/kits";
import { studioLink } from "@/pageTree/studioLink";
import { MODEL_INFO, cleanLive, hrefFor, type ModelKind, type StageLive, type StageModel, type StageOptions } from "../three/kinds";
import type { StageTransform } from "../three/GameStage";
import type { GlbInfo } from "../three/GlbModel";
import type { StoreTheme } from "../types";
import { say } from "../words";

const GameStage = dynamic(() => import("../three/GameStage"), { ssr: false });

const webgl = () => {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

export function StageHero({ theme, palette, lang, d, categories, options }: { theme: StoreTheme; palette: Palette; lang: Lang; d: Record<string, any>; categories: Array<{ name: string; slug: string }>; options: StageOptions }) {
  const stage = theme.stage!;
  const dark = hexToLab(palette.bg)[0] < 0.5;
  // The admin's draft while its scene editor is open (studio frame only).
  const [live, setLive] = useState<StageLive | null>(null);
  useEffect(() => {
    const hello = () => studioLink.send({ type: "stageHello", themeId: theme.id });
    const off = studioLink.listen((msg) => {
      if (msg.type === "linkOpen") return hello();
      if (msg.type !== "stageScene") return;
      const next = cleanLive(msg);
      if (next && next.themeId === theme.id) setLive(next);
    });
    if (studioLink.isOpen) hello();
    return off;
  }, [theme.id]);
  const chosen = live?.models ?? options.models;
  const models = useMemo(() => {
    const list: StageModel[] = chosen ?? stage.models.map((kind) => ({ kind }));
    return list.map((m) => {
      const label = m.label || say(MODEL_INFO[m.kind].label, lang);
      return { kind: m.kind, label, href: m.href || hrefFor(m.kind, categories, label), look: m.look, glb: m.glb };
    });
  }, [chosen, stage.models, lang, categories]);
  const ownGames = live ? live.games : options.games;
  const games = useMemo(
    () =>
      ownGames?.map((g) => ({ name: g.name, color: g.color, href: g.href || `/search?q=${encodeURIComponent(g.name)}`, imageUrl: g.imageUrl, model: g.model })) ??
      stage.games.map((g) => ({ name: say(g.name, lang), color: g.color, href: `/search?q=${encodeURIComponent(g.search)}`, imageUrl: undefined, model: g.model as ModelKind | undefined })),
    [ownGames, stage.games, lang],
  );
  const edit = live?.edit ?? null;
  const scene = live ? live.scene : options.scene;

  const [selected, setSelected] = useState(0);
  const [game, setGame] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [can, setCan] = useState<null | { still: boolean; compact: boolean }>(null);
  const [onScreen, setOnScreen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const preview = useRef<number | null>(null);
  const readScroll = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!webgl()) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = window.matchMedia("(max-width: 899.98px)").matches;
    setCan({ still, compact });
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    let frame = 0;
    const read = () => {
      frame = 0;
      // The editor's own scroll, while it shows one.
      if (preview.current !== null) return void (progress.current = preview.current);
      const r = el.getBoundingClientRect();
      progress.current = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
    };
    readScroll.current = read;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The scroll the editor shows instead of the page's (null = the page's own).
  const previewAt = edit?.preview ?? null;
  useEffect(() => {
    preview.current = previewAt;
    readScroll.current();
  }, [previewAt]);

  // The model being edited comes forward; a click on another one edits that one.
  const editIndex = edit ? Math.min(edit.index, models.length - 1) : null;
  useEffect(() => {
    if (editIndex !== null) setSelected(editIndex);
  }, [editIndex]);
  useEffect(() => {
    if (selected >= models.length) setSelected(0);
  }, [selected, models.length]);
  const editing = editIndex !== null;
  const select = useCallback(
    (i: number) => {
      setSelected(i);
      if (editing) studioLink.send({ type: "stagePick", index: i });
    },
    [editing],
  );
  // A handle's move belongs to the end of the path being edited when it moved.
  const editKey = useRef<"start" | "end">("start");
  editKey.current = edit?.key ?? "start";
  const onTransform = useCallback((index: number, t: StageTransform, final: boolean, seq: number) => studioLink.send({ type: "stageTransform", index, ...t, key: editKey.current, final, seq }), []);
  const onGlbInfo = useCallback((index: number, info: GlbInfo) => studioLink.send({ type: "stageGlb", index, ...info }), []);
  const looks = useMemo(() => models.map((m) => m.look), [models]);
  const glbs = useMemo(() => models.map((m) => m.glb), [models]);
  const editMode = edit?.mode;
  const editPlay = edit?.play;
  const editSnap = edit?.snap;
  const stageEdit = useMemo(
    () => (editIndex !== null && editMode ? { index: editIndex, mode: editMode, play: editPlay !== false, snap: editSnap === true, key: editKey.current, preview: previewAt } : null),
    [editIndex, editMode, editPlay, editSnap, previewAt],
  );

  const pickGame = (i: number) => {
    setGame(i);
    const m = games[i]?.model;
    const at = m ? models.findIndex((x) => x.kind === m) : -1;
    if (at >= 0) setSelected(at);
  };
  // The admin's draft can take the picked game away.
  const picked = game !== null ? games[game] : undefined;
  useEffect(() => {
    if (game !== null && !games[game]) setGame(null);
  }, [game, games]);
  const tint = picked?.color ?? null;
  const colours = useMemo(() => {
    const body = stage.finish === "toy" || stage.finish === "voxel" ? palette.accent : dark ? mix(palette.surface, "#000000", 0.2) : mix(palette.ink, palette.surface, 0.12);
    return {
      body,
      trim: stage.finish === "toy" || stage.finish === "voxel" ? palette.strong : dark ? palette.line : palette.soft,
      accent: tint ?? palette.accent,
      glow: tint ?? palette.strong,
      metal: mix(palette.strong, "#ffffff", 0.35),
      screen: tint ?? palette.glow,
    };
  }, [palette, stage.finish, dark, tint]);
  const own = scene?.lights?.colours;
  const lights: [string, string] = [tint ?? own?.[0] ?? palette.accent, own?.[1] ?? palette.strong];
  const layout = scene?.layout ?? stage.layout;
  const floor = scene?.floor ?? stage.floor;

  const title: string = (typeof d.title === "string" && d.title.trim()) || say(theme.copy.title, lang);
  const current = models[selected];
  const cta = picked ? { label: tr(lang, `تسوّق ${picked.name}`, "Shop {0}", [picked.name]), href: picked.href } : { label: d.primaryButton?.label || say(theme.copy.cta, lang), href: d.primaryButton?.href || "/shop" };
  // A gaming store picks gear and games; the other stores name their own pickers.
  const pickLabel = stage.labels ? say(stage.labels.pick, lang) : tr(lang, "اختر جهازك", "Pick your gear");
  const gamesLabel = stage.labels ? say(stage.labels.games, lang) : tr(lang, "اختر لعبتك", "Pick your game");

  return (
    <>
      <section className="th-hero th-hero-stage" style={tint ? ({ "--th-game": tint } as React.CSSProperties) : undefined}>
        <Backdrop kit={theme.svg} />
        <div className="th-hero-copy">
          <p className="th-eyebrow th-hud" data-th-reveal="block" data-edit="eyebrow">
            {(typeof d.eyebrow === "string" && d.eyebrow) || say(theme.copy.eyebrow, lang)}
          </p>
          <h1 className={`th-hero-title ${theme.svg === "neon" ? "th-neon-title" : ""}`} data-th-reveal="headline" data-edit="title" data-edit-lines="">
            {title
              .split("\n")
              .filter(Boolean)
              .map((l, i) => (
                <span key={i} className="th-title-line">
                  {l}
                </span>
              ))}
          </h1>
          <p className="th-hero-sub" data-th-reveal="block" data-edit="subtitle">
            {(typeof d.subtitle === "string" && d.subtitle) || say(theme.copy.subtitle, lang)}
          </p>
          <div className="th-hero-actions" data-th-reveal="block">
            <Link href={cta.href} className="th-button" data-th-magnetic="" data-testid="stage-cta">
              {cta.label}
              <span className="th-arrow" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </div>
        <div
          ref={box}
          className={`th-stage-3d${ready ? " is-ready" : ""}`}
          data-testid="game-stage"
          data-ready={ready ? "1" : undefined}
          data-selected={current?.kind}
          data-editing={editing ? String(editIndex) : undefined}
          data-edit-mode={edit?.mode}
          data-layout={layout}
          data-floor={floor}
        >
          <div className="th-stage-fallback" aria-hidden>
            <HeroArt kit={["deco", "circuit", "neon", "organic", "candy"].includes(theme.svg) ? theme.svg : "neon"} />
          </div>
          {can ? (
            <div className="th-stage-canvas" aria-hidden>
              <GameStage
                kinds={models.map((m) => m.kind)}
                colours={colours}
                style={stage.finish}
                layout={layout}
                floor={floor}
                lights={lights}
                floorColour={scene?.floorColour ?? (dark ? "#0b0b12" : mix(palette.soft, palette.ink, 0.12))}
                floorGlow={scene?.floorGlow}
                camera={scene?.camera}
                lightSet={scene?.lights}
                glbs={glbs}
                onGlbInfo={onGlbInfo}
                selected={selected}
                onSelect={select}
                onHover={setHover}
                active={onScreen}
                compact={can.compact}
                still={can.still}
                progress={progress}
                onReady={() => setReady(true)}
                looks={looks}
                edit={stageEdit}
                onTransform={onTransform}
                ack={live?.ack}
              />
            </div>
          ) : null}
          {current ? (
            <div className="th-stage-card" aria-live="polite">
              <span className="th-stage-card-label">{hover !== null && models[hover] ? models[hover].label : current.label}</span>
              <Link href={current.href} className="th-text-link" data-testid="stage-model-link">
                {tr(lang, "تسوّق القسم", "Shop this")}
                <span className="th-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          ) : null}
        </div>
        <div className="th-pick" role="group" aria-label={pickLabel}>
          {models.map((m, i) => (
            <button key={`${m.kind}-${i}`} type="button" className="th-pick-item" aria-pressed={i === selected} onClick={() => select(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} data-kind={m.kind}>
              {m.label}
            </button>
          ))}
        </div>
      </section>
      {games.length ? (
        <section className="th-games" aria-label={gamesLabel}>
          <h2 className="th-games-title" data-th-reveal="headline">
            {gamesLabel}
          </h2>
          <div className="th-games-list" role="group">
            {games.map((g, i) => (
              <button key={`${g.name}-${i}`} type="button" className="th-game" aria-pressed={game === i} onClick={() => pickGame(i)} style={{ "--g": g.color } as React.CSSProperties} data-testid="stage-game">
                {g.imageUrl ? <img src={g.imageUrl} alt="" className="th-game-img" loading="lazy" /> : <span className="th-game-dot" aria-hidden />}
                <span>{g.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
