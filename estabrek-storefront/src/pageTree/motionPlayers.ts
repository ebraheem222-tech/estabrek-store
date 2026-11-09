/**
 * The keyframe timelines TreeMotion built, by element: a scroll scene (TreeScenes) moves the
 * ones that follow it, and triggers (TreeTriggers) play the ones that wait for them.
 */
export type KeyPlayer = {
  on: string;
  /** Its length in seconds. */
  duration: number;
  play: () => void;
  reverse: () => void;
  restart: () => void;
  toggle: () => void;
  /** 0–1 (a scroll scene's moment). */
  seek: (progress: number) => void;
};

const players = new Map<Element, KeyPlayer>();
const listeners = new Set<() => void>();

export const keyPlayers = {
  set(el: Element, player: KeyPlayer) {
    players.set(el, player);
    listeners.forEach((l) => l());
  },
  delete(el: Element) {
    players.delete(el);
  },
  get(el: Element | null | undefined) {
    return el ? players.get(el) : undefined;
  },
  /** Heard when a timeline is ready (a scene catches up with its moment at once). */
  listen(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
