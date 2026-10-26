/**
 * A gaming theme's stage as the admin is changing it: its models (each with its name, link
 * and look from the scene editor) and its games. The models-and-games panel and the scene
 * editor change the same draft, the shop's frame draws it as it changes, and one save
 * writes it to header.storeThemeOptions[themeId]. Every change can be undone: a run of the
 * same change (typing in one field, dragging one slider or one handle) is one step.
 */
import { useCallback, useRef, useState } from "react";
import type { Lang } from "../../lib/lang";
import type { StageGlb, StageLook, StageOptions, StageScene, StoreThemeInfo } from "../../studio/storeThemes";

export type DraftModel = { kind: string; label: string; href: string; look: StageLook; glb?: StageGlb };
export type DraftGame = { name: string; color: string; href: string; imageUrl: string; model: string };
/** `scene`: the whole stage's settings (layout, floor, camera, lights); empty = the theme's own. */
export type StageDraft = { models: DraftModel[]; games: DraftGame[]; scene: StageScene };

export const MAX_MODELS = 6;
export const MAX_GAMES = 12;

/** The theme's own models and games, with no looks (the pack as it comes). */
export function themeDraft(theme: StoreThemeInfo, lang: Lang): StageDraft {
  const stage = theme.stage!;
  return {
    models: stage.models.map((kind) => ({ kind, label: "", href: "", look: {} })),
    games: stage.games.map((g) => ({ name: g.name[lang] || g.name.en, color: g.color, href: "", imageUrl: "", model: g.model ?? "" })),
    scene: {},
  };
}

/** The draft to start from: what the store saved, else the theme's own. */
export function draftFrom(theme: StoreThemeInfo, saved: StageOptions, lang: Lang): StageDraft {
  const own = themeDraft(theme, lang);
  return {
    models: saved.models?.length ? saved.models.map((m) => ({ kind: m.kind, label: m.label ?? "", href: m.href ?? "", look: m.look ?? {}, ...(m.glb ? { glb: m.glb } : {}) })) : own.models,
    games: saved.games?.length
      ? saved.games.map((g) => ({ name: g.name, color: g.color, href: g.href ?? "", imageUrl: g.imageUrl ?? "", model: g.model ?? "" }))
      : own.games,
    scene: saved.scene ?? {},
  };
}

const hasLook = (l: StageLook) => Object.keys(l).length > 0;

/** The models as the shop takes them (empty names and links left out). */
export function draftModels(d: StageDraft): NonNullable<StageOptions["models"]> {
  return d.models.map((m) => ({ kind: m.kind, label: m.label.trim() || undefined, href: m.href.trim() || undefined, look: hasLook(m.look) ? m.look : undefined, glb: m.glb }));
}

/** The draft as it is saved. */
export function draftOptions(d: StageDraft): StageOptions {
  return {
    models: draftModels(d),
    games: d.games
      .filter((g) => g.name.trim())
      .map((g) => ({ name: g.name.trim(), color: g.color, href: g.href.trim() || undefined, imageUrl: g.imageUrl || undefined, model: g.model || undefined })),
    scene: Object.keys(d.scene).length ? d.scene : undefined,
  };
}

export const sameDraft = (a: StageDraft, b: StageDraft) => JSON.stringify(draftOptions(a)) === JSON.stringify(draftOptions(b));

/** A copy of the draft with one model's look changed. */
export const withLook = (d: StageDraft, i: number, fn: (l: StageLook) => StageLook): StageDraft => ({
  ...d,
  models: d.models.map((m, j) => (j === i ? { ...m, look: fn(m.look) } : m)),
});

type History = { past: StageDraft[]; now: StageDraft; future: StageDraft[] };
const KEEP = 100;
/** Changes of the same kind this close together are one step. */
const RUN_MS = 1200;

export function useStageDraft(start: () => StageDraft) {
  const [h, setH] = useState<History>(() => ({ past: [], now: start(), future: [] }));
  const run = useRef({ key: "", at: 0 });

  /** `key` names a run of the same change; `end` closes it (a handle let go). */
  const change = useCallback((fn: (d: StageDraft) => StageDraft, key = "", end = false) => {
    const at = Date.now();
    const joins = key !== "" && key === run.current.key && at - run.current.at < RUN_MS;
    run.current = end ? { key: "", at: 0 } : { key, at };
    setH((cur) => {
      const next = fn(cur.now);
      if (next === cur.now || JSON.stringify(next) === JSON.stringify(cur.now)) return cur;
      return joins ? { ...cur, now: next, future: [] } : { past: [...cur.past, cur.now].slice(-KEEP), now: next, future: [] };
    });
  }, []);
  const undo = useCallback(() => {
    run.current = { key: "", at: 0 };
    setH((cur) => (cur.past.length ? { past: cur.past.slice(0, -1), now: cur.past[cur.past.length - 1], future: [cur.now, ...cur.future] } : cur));
  }, []);
  const redo = useCallback(() => {
    run.current = { key: "", at: 0 };
    setH((cur) => (cur.future.length ? { past: [...cur.past, cur.now].slice(-KEEP), now: cur.future[0], future: cur.future.slice(1) } : cur));
  }, []);
  return { draft: h.now, change, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
export type StageDraftApi = ReturnType<typeof useStageDraft>;
