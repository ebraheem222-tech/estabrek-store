import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenTheme } from "@/lib/themeTween";
import {
  claimTheme,
  dropTheme,
  holdsTheme,
  releaseTheme,
} from "@/lib/themeBase";

/**
 * Hover previews must react quickly.
 *
 * 0.6s felt like lag because the entire storefront palette
 * was still moving long after the pointer entered the card.
 */
const HOVER_TWEEN_SECONDS = 0.18;

/**
 * Enough intent to avoid recolouring the site when the
 * mouse simply passes over a Quick Add button.
 */
const HOVER_INTENT_MS = 120;

let saved: {
  shell: HTMLElement;
  navbar?: string;
} | null = null;

let lastSeed = "";

const RANDOM_SEEDS = [
  "#c97794",
  "#a08cbd",
  "#7d8ec4",
  "#e9a27c",
  "#8ea58a",
  "#c4a266",
  "#e59b9b",
  "#9b6b4e",
  "#5f8f9b",
  "#b5658f",
];

export function randomThemeSeed() {
  const pool = RANDOM_SEEDS.filter(
    (seed) => seed !== lastSeed,
  );

  return pool[
    Math.floor(Math.random() * pool.length)
  ];
}

export function shellOf(
  el: Element | null | undefined,
) {
  return (
    el?.closest<HTMLElement>(
      ".cinematic-shell",
    ) ?? null
  );
}

export function previewTheme(
  shell: HTMLElement | null,
  seed: string,
) {
  if (!shell || shell.dataset.season) {
    return;
  }

  const values =
    storefrontPalette(seed);

  if (
    !saved ||
    saved.shell !== shell ||
    !holdsTheme(shell, "preview")
  ) {
    if (
      saved &&
      saved.shell !== shell
    ) {
      dropTheme(
        saved.shell,
        "preview",
      );
    }

    saved = {
      shell,
      navbar:
        shell.dataset.navbarColor,
    };

    claimTheme(
      shell,
      "preview",
      Object.keys(values),
    );
  }

  lastSeed = seed;

  shell.dataset.themePreview =
    "true";

  shell.dataset.navbarColor =
    seed;

  /**
   * IMPORTANT:
   *
   * Do NOT use View Transition here.
   *
   * Hover is interactive and needs immediate feedback.
   * The root View Transition snapshot was hiding the
   * actual recoloured page for ~550ms.
   */
  tweenTheme(shell, values, {
    duration: HOVER_TWEEN_SECONDS,
    ease: "power2.out",
  });
}

export function endThemePreview(
  shell: HTMLElement | null,
) {
  if (
    !shell ||
    !saved ||
    saved.shell !== shell
  ) {
    return;
  }

  const previous = saved;

  saved = null;

  releaseTheme(
    shell,
    "preview",
    {
      duration:
        HOVER_TWEEN_SECONDS,

      onComplete: () => {
        /**
         * Another hover may have started
         * while this one was returning.
         */
        if (saved) {
          return;
        }

        delete shell.dataset
          .themePreview;

        const chosen =
          shell.dataset
            .storefrontColor;

        if (chosen) {
          shell.dataset
            .navbarColor = chosen;
        } else if (
          previous.navbar
        ) {
          shell.dataset
            .navbarColor =
            previous.navbar;
        } else {
          delete shell.dataset
            .navbarColor;
        }
      },
    },
  );
}

/**
 * A permanent colour choice replaces
 * the temporary hover preview.
 */
export function discardThemePreview() {
  if (saved) {
    delete saved.shell.dataset
      .themePreview;

    dropTheme(
      saved.shell,
      "preview",
    );
  }

  saved = null;
}

let cycle: {
  timer: number;
  source: HTMLElement;
  started: boolean;
} | null = null;

export function startThemeCycle(
  source: HTMLElement,
  everyMs = 2200,
) {
  const shell =
    shellOf(source);

  if (!shell) {
    return;
  }

  /**
   * Touch screens do not have real hover.
   */
  if (
    window.matchMedia?.(
      "(hover: none)",
    ).matches &&
    !source.matches(
      ":focus-visible",
    )
  ) {
    return;
  }

  stopThemeCycle(null);

  const state = {
    timer: 0,
    source,
    started: false,
  };

  state.timer =
    window.setTimeout(() => {
      if (cycle !== state) {
        return;
      }

      if (
        !source.isConnected ||
        !shell.isConnected
      ) {
        stopThemeCycle(source);
        return;
      }

      state.started = true;

      previewTheme(
        shell,
        randomThemeSeed(),
      );

      state.timer =
        window.setInterval(() => {
          if (
            !source.isConnected ||
            !shell.isConnected
          ) {
            stopThemeCycle(
              source,
            );
            return;
          }

          previewTheme(
            shell,
            randomThemeSeed(),
          );
        }, everyMs);
    }, HOVER_INTENT_MS);

  cycle = state;
}

export function stopThemeCycle(
  source: HTMLElement | null,
) {
  if (
    !cycle ||
    (source &&
      cycle.source !== source)
  ) {
    return;
  }

  window.clearTimeout(
    cycle.timer,
  );

  window.clearInterval(
    cycle.timer,
  );

  const { started } = cycle;

  const shell =
    shellOf(cycle.source);

  cycle = null;

  if (
    source &&
    started
  ) {
    endThemePreview(shell);
  }
}
