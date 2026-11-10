import { cldUrl } from "@/lib/cloudinary";
import { sampleImageColor } from "@/lib/collectionTheme";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { claimTheme, holdsTheme, releaseTheme, themeHeld, themeHeldBy } from "@/lib/themeBase";
import { themeFollower } from "@/lib/themeTween";

/** `#abc` / `#aabbccdd` → `#aabbcc`; anything else → null. */
export function normalHex(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(v)) return v.slice(0, 7);
  return null;
}

/** A computed colour (`rgb(…)`, `rgba(…)`, `color(srgb …)`) as `#rrggbb` (its alpha dropped); else null. */
export function cssHex(value?: string | null): string | null {
  const v = (value ?? "").trim();
  const hex = normalHex(v);
  if (hex) return hex;
  const n = v.match(/-?[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  const scale = v.startsWith("color(") ? 255 : 1;
  const to = (x: number) => Math.round(Math.max(0, Math.min(255, x * scale))).toString(16).padStart(2, "0");
  if (/^(rgba?|color)\(/.test(v)) return `#${to(n[0])}${to(n[1])}${to(n[2])}`;
  return null;
}

const photoColours = new Map<string, Promise<string | null>>();
/**
 * A photo's colour: its garment's, tuned calm and readable (sampleImageColor), read from a small copy of the
 * picture. Null when the picture can't be read (no picture, or a host that doesn't allow it).
 */
export function photoColour(url?: string | null): Promise<string | null> {
  if (!url || typeof window === "undefined") return Promise.resolve(null);
  let found = photoColours.get(url);
  if (!found) {
    found = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(sampleImageColor(img));
      img.onerror = () => resolve(null);
      img.src = cldUrl(url, { w: 64 });
    });
    photoColours.set(url, found);
  }
  return found;
}

/**
 * Lets a scene dress the page in a colour while it holds the screen: the scene's own section and the header
 * glide to it (the way the seasons do, lib/themeBase.ts), and when the scene leaves the page glides back to
 * its own colours, or to the shopper's picked one. Several scenes can take turns; the last to leave gives the
 * colours back. Null outside the store's shell (the editor's preview of a lone section).
 */
export function sceneTheme(section: HTMLElement, owner: string) {
  const shell = section.closest<HTMLElement>(".cinematic-shell");
  if (!shell) return null;
  const header = shell.querySelector<HTMLElement>(".atelier-header");
  const follow = themeFollower(shell, { local: () => [header, section] });
  let held = false;
  let last = "";
  let backTimer = 0;
  /** The page's own colours as they show before the scene dresses it, to glide back to (the follower's own
   *  hand-back only glides what the page shell defines itself, so the header jumped back at the end). */
  let home: Record<string, string> = {};
  const remember = (keys: string[]) => {
    home = {};
    const page = getComputedStyle(shell);
    for (const key of keys) {
      const value = normalHex(page.getPropertyValue(key)) ?? cssHex(page.getPropertyValue(key));
      if (value) home[key] = value;
    }
    // The header's own background stands for the navbar colour it doesn't have yet.
    if (header && !header.style.getPropertyValue("--navbar-bg")) {
      const bg = cssHex(getComputedStyle(header).backgroundColor);
      if (bg) home["--navbar-bg"] = bg;
    }
  };
  /** Another scene holds the colours too. */
  const othersHold = () => { const was = holdsTheme(shell, owner); return was ? themeHeldBy(shell) > 1 : themeHeld(shell); };
  const wear = (seed: string, seconds = 0.7) => {
    const hex = normalHex(seed);
    if (!hex || document.documentElement.hasAttribute("data-visual-theme")) return;
    if (held && hex === last) return;
    last = hex;
    const values = storefrontPalette(hex);
    window.clearTimeout(backTimer);
    if (!held) {
      held = true;
      if (!themeHeld(shell)) remember(Object.keys(values));
      claimTheme(shell, owner, Object.keys(values));
    }
    follow.to(values, seconds);
    // The header's own colour rules apply while this mark is there.
    if (!shell.dataset.navbarColor) shell.dataset.navbarColor = hex;
  };
  /** `now`: no glide (the scene is going away). */
  const giveBack = (now = false) => {
    if (!held) return;
    held = false;
    last = "";
    window.clearTimeout(backTimer);
    // Glide to the page's own colours (or the shopper's pick), then let go: nothing jumps.
    const chosen = normalHex(shell.dataset.storefrontColor);
    const rest = chosen ? { ...home, ...storefrontPalette(chosen) } : home;
    if (!now && Object.keys(rest).length) {
      follow.to(rest, 0.8);
      backTimer = window.setTimeout(() => { if (!held) letGo(); }, 1300);
    } else letGo(now);
  };
  const letGo = (now = true) => {
    // With no colour picked and no other scene on stage the header goes back to its own look as the scene lets
    // go (kept until the shell's own hand-back ended, it showed no background for a moment).
    if (!shell.dataset.storefrontColor && !othersHold()) delete shell.dataset.navbarColor;
    follow.release(now ? 0 : 0.8, () => releaseTheme(shell, owner, {
      duration: 0.8,
      onComplete: () => {
        if (held || themeHeld(shell)) return; // a scene took the colours again meanwhile
        const chosen = shell.dataset.storefrontColor;
        if (chosen) shell.dataset.navbarColor = chosen;
        else delete shell.dataset.navbarColor;
      },
    }));
  };
  return { wear, giveBack, get held() { return held; } };
}

/**
 * A neighbour of a colour on the colour wheel (`degrees` round it), kept as lively and as light as a theme
 * colour should be: shades that sit well with the store's own colour, for scenes that change colour as they go.
 */
export function shiftHue(seed: string, degrees: number): string {
  const hex = normalHex(seed) ?? "#c97794";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const l0 = (max + min) / 2;
  const s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;
  const hue = (((h + degrees) % 360) + 360) % 360;
  const s = Math.min(0.62, Math.max(0.38, s0)), l = Math.min(0.62, Math.max(0.5, l0));
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round((l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255);
  return `#${[f(0), f(8), f(4)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
