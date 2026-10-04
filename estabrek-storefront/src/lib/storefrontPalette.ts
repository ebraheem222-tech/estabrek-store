import { mixHex } from "@/components/cinematic/roseDesign";

function luminance(hex: string) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

/** Light fabric-inspired surfaces and readable controls for any catalog swatch. */
export function storefrontPalette(seed: string): Record<string, string> {
  const page = mixHex("#fff8f4", seed, .14);
  const surface = mixHex("#ffffff", seed, .06);
  const soft = mixHex("#fff8f4", seed, .24);
  const line = mixHex("#ffffff", seed, .38);
  let controlLine = seed;
  for (let amount = .05; [page, surface, soft].some(background => contrast(controlLine, background) < 3) && amount <= 1; amount += .05) {
    controlLine = mixHex(seed, "#15131b", amount);
  }
  const ink = mixHex(seed, "#15131b", .82);
  const muted = mixHex(seed, "#15131b", .68);
  let accent = seed;
  for (let amount = .05; (contrast(accent, soft) < 4.5 || contrast(accent, "#ffffff") < 4.5) && amount <= 1; amount += .05) {
    accent = mixHex(seed, "#15131b", amount);
  }
  const dark = mixHex(accent, "#15131b", .22);
  const navbarInk = contrast(seed, ink) >= 4.5 ? ink : luminance(seed) > .179 ? "#000000" : "#ffffff";
  return {
    "--selection-page": page, "--selection-surface": surface,
    "--selection-soft": soft, "--selection-line": line, "--selection-control-line": controlLine,
    "--selection-ink": ink, "--selection-muted": muted,
    "--selection-accent": accent, "--selection-dark": dark,
    "--selection-decorative": mixHex("#ffffff", seed, .58),
    "--navbar-bg": seed, "--navbar-ink": navbarInk,
    "--atelier-bg": page, "--atelier-ink": ink,
    "--atelier-muted": muted, "--atelier-line": line,
    "--rose": accent, "--rose-dark": dark, "--rose-soft": soft, "--rose-border": line,
    "--bg": page, "--surface": surface, "--surface-2": soft,
    "--text": ink, "--muted": muted, "--border": controlLine,
    "--accent": accent, "--accent-1": accent, "--accent-2": dark, "--accent-3": dark,
    "--accent-soft": soft, "--accent-hover": dark, "--accent-contrast": "#ffffff",
    "--color-bg": page, "--color-bg-alt": soft,
    "--color-surface": surface, "--color-surface-hover": soft,
    "--color-text": ink, "--color-text-muted": muted, "--color-border": line,
    "--color-accent": accent, "--color-accent-hover": dark, "--color-accent-soft": soft,
    "--glass-bg": surface,
  };
}
