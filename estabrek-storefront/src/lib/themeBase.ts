import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenThemeBack } from "@/lib/themeTween";

/**
 * Who is borrowing the storefront colours right now (the seasons scene, the
 * collection worlds, a hover preview) and what the page should return to.
 *
 * Each borrower used to remember the colours it found on arrival. Scrolling
 * quickly from one scene into the next meant the second one remembered the
 * first one's half-finished colours, and the page ended up at the top in a
 * colour nobody picked. Now the colours to come back to are taken once, when
 * the first borrower arrives, and the shopper's chosen colour always wins.
 */

type State = { owners: Set<string>; base: Map<string, string>; restoring: boolean };
const states = new WeakMap<HTMLElement, State>();

export function claimTheme(shell: HTMLElement, owner: string, keys: string[]) {
  let state = states.get(shell);
  if (!state) {
    state = { owners: new Set(), base: new Map(), restoring: false };
    states.set(shell, state);
  }
  // Nobody holds the colours and nothing is gliding back: what is on screen is the page's own.
  if (!state.owners.size && !state.restoring) state.base = new Map();
  for (const key of keys) if (!state.base.has(key)) state.base.set(key, shell.style.getPropertyValue(key));
  // A scene taking the stage ends any hover preview (the pointer may still rest on a card).
  if (owner !== "preview" && state.owners.delete("preview")) delete shell.dataset.themePreview;
  state.owners.add(owner);
  state.restoring = false;
}

/** True while `owner` holds the colours of this shell. */
export function holdsTheme(shell: HTMLElement, owner: string) {
  return Boolean(states.get(shell)?.owners.has(owner));
}

/** True while any scene or preview still holds the colours. */
export function themeHeld(shell: HTMLElement) {
  return Boolean(states.get(shell)?.owners.size);
}

/** The colours the page rests at: the shopper's pick when she made one, else what was there before. */
function restingColours(shell: HTMLElement, base: Map<string, string>) {
  const chosen = shell.dataset.storefrontColor;
  if (!chosen) return base;
  const palette = storefrontPalette(chosen);
  return new Map([...base.keys()].map((key) => [key, palette[key] ?? base.get(key) ?? ""]));
}

/** Give the colours back. The last borrower to leave glides the page to its resting colours. */
export function releaseTheme(
  shell: HTMLElement,
  owner: string,
  { duration = 0.8, onComplete }: { duration?: number; onComplete?: () => void } = {},
) {
  const state = states.get(shell);
  if (!state || !state.owners.delete(owner)) return;
  if (state.owners.size) return; // another scene still has the stage; it will give the colours back
  state.restoring = true;
  tweenThemeBack(shell, restingColours(shell, state.base), {
    duration,
    onComplete: () => {
      if (state.owners.size) return; // taken again meanwhile
      state.restoring = false;
      onComplete?.();
    },
  });
}

/** Forget a borrower without animating (a real colour pick replaced its preview). */
export function dropTheme(shell: HTMLElement, owner: string) {
  const state = states.get(shell);
  if (!state) return;
  state.owners.delete(owner);
  if (!state.owners.size) state.restoring = false;
}
