import { cldUrl } from "@/lib/cloudinary";
import { sampleImageColor } from "@/lib/collectionTheme";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { claimTheme, releaseTheme, themeHeld } from "@/lib/themeBase";
import { themeFollower } from "@/lib/themeTween";

/** `#abc` / `#aabbccdd` → `#aabbcc`; anything else → null. */
export function normalHex(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(v)) return v.slice(0, 7);
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
  const wear = (seed: string, seconds = 0.7) => {
    const hex = normalHex(seed);
    if (!hex || document.documentElement.hasAttribute("data-visual-theme")) return;
    if (held && hex === last) return;
    last = hex;
    const values = storefrontPalette(hex);
    if (!held) {
      held = true;
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
