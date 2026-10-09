import { storefrontPalette } from "@/lib/storefrontPalette";

import {
  stopThemeTween,
  tweenTheme,
  tweenThemeBack,
} from "@/lib/themeTween";

import { themeHeld } from "@/lib/themeBase";

/**
 * Hover theme previews.
 *
 * IMPORTANT:
 *
 * Never animate the palette on .cinematic-shell.
 *
 * CSS variables on the shell are inherited by practically the
 * entire storefront. Updating them every animation frame forces
 * a huge style recalculation.
 *
 * Instead we animate only:
 *
 *  - the section containing the hovered element
 *  - the header
 *  - the announcement bar
 *
 * The permanent storefront theme remains on the shell.
 */

const HOVER_TWEEN_SECONDS = 0.28;
const RESTORE_TWEEN_SECONDS = 0.22;
const HOVER_INTENT_MS = 120;

type TargetSnapshot = {
  element: HTMLElement;
  inlineValues: Map<string, string>;
};

type PreviewState = {
  shell: HTMLElement;
  section: HTMLElement;
  targets: TargetSnapshot[];
};

let saved: PreviewState | null = null;

let lastSeed = "";

/**
 * Used to invalidate completion callbacks belonging to an
 * older restore animation.
 */
let generation = 0;

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
  element: Element | null | undefined,
) {
  return (
    element?.closest<HTMLElement>(
      ".cinematic-shell",
    ) ?? null
  );
}

/**
 * Find the smallest useful rendering area.
 *
 * The expensive old implementation animated .cinematic-shell.
 *
 * We intentionally stop at the section.
 */
function sectionOf(
  source: Element | null | undefined,
) {
  return (
    source?.closest<HTMLElement>("section") ??
    null
  );
}

function uniqueElements(
  elements: Array<HTMLElement | null>,
) {
  return Array.from(
    new Set(
      elements.filter(
        (element): element is HTMLElement =>
          element !== null,
      ),
    ),
  );
}

/**
 * Capture ONLY inline values.
 *
 * If an inline value was empty, removing the temporary value later
 * makes the target inherit the latest permanent storefront theme.
 */
function snapshot(
  element: HTMLElement,
  names: string[],
): TargetSnapshot {
  const inlineValues =
    new Map<string, string>();

  for (const name of names) {
    inlineValues.set(
      name,
      element.style.getPropertyValue(name),
    );
  }

  return {
    element,
    inlineValues,
  };
}

/**
 * Restore without animation.
 *
 * Used when changing preview ownership or navigating away.
 */
function restoreImmediately(
  state: PreviewState,
) {
  for (const target of state.targets) {
    stopThemeTween(target.element);

    for (const [
      name,
      previous,
    ] of target.inlineValues) {
      if (previous) {
        target.element.style.setProperty(
          name,
          previous,
        );
      } else {
        target.element.style.removeProperty(
          name,
        );
      }
    }
  }

  delete state.shell.dataset.themePreview;
}

/**
 * Local hover preview.
 *
 * `source` should be the actual hovered card/button.
 */
export function previewTheme(
  source: HTMLElement | null,
  seed: string,
) {
  if (!source) {
    return;
  }

  const shell = shellOf(source);

  if (!shell) {
    return;
  }

  /**
   * Don't fight scenes that currently own the theme.
   */
  if (
    shell.dataset.season ||
    themeHeld(shell)
  ) {
    return;
  }

  const section = sectionOf(source);

  if (!section) {
    return;
  }

  const values =
    storefrontPalette(seed);

  const names =
    Object.keys(values);

  const header =
    shell.querySelector<HTMLElement>(
      ".atelier-header",
    );

  const announcement =
    shell.querySelector<HTMLElement>(
      ".atelier-announcement",
    );

  /**
   * Keep the animation local.
   *
   * NO shell here.
   */
  const elements =
    uniqueElements([
      section,
      header,
      announcement,
    ]);

  /**
   * New animation invalidates any previous restore callback.
   */
  generation++;

  /**
   * If we entered a completely different section before the
   * previous preview cleaned itself up, restore the old section
   * immediately.
   */
  if (
    saved &&
    (
      saved.shell !== shell ||
      saved.section !== section
    )
  ) {
    restoreImmediately(saved);
    saved = null;
  }

  /**
   * Capture base values only on the FIRST preview in this section.
   *
   * Moving:
   *
   * category A → category B → category C
   *
   * must keep the original resting theme, not save A as B's base.
   */
  if (!saved) {
    saved = {
      shell,
      section,
      targets: elements.map(
        (element) =>
          snapshot(
            element,
            names,
          ),
      ),
    };
  }

  lastSeed = seed;

  shell.dataset.themePreview =
    "true";

  /**
   * Critical difference:
   *
   * OLD:
   *
   * tweenTheme(shell, values)
   *
   * NEW:
   *
   * section
   * header
   * announcement
   *
   * only.
   */
  for (const target of saved.targets) {
    if (!target.element.isConnected) {
      continue;
    }

    tweenTheme(
      target.element,
      values,
      {
        duration:
          HOVER_TWEEN_SECONDS,

        ease:
          "power2.out",
      },
    );
  }
}

/**
 * Return the local elements to the permanent storefront theme.
 */
export function endThemePreview(
  source: HTMLElement | null,
) {
  if (!source || !saved) {
    return;
  }

  const shell =
    shellOf(source);

  if (
    !shell ||
    shell !== saved.shell
  ) {
    return;
  }

  const state = saved;

  saved = null;

  const myGeneration =
    ++generation;

  let remaining =
    state.targets.length;

  if (!remaining) {
    delete shell.dataset.themePreview;
    return;
  }

  const finishedOne = () => {
    remaining--;

    if (remaining > 0) {
      return;
    }

    /**
     * Ignore a stale restore completion if another hover
     * began while we were returning.
     */
    if (
      generation !== myGeneration ||
      saved
    ) {
      return;
    }

    delete shell.dataset.themePreview;
  };

  for (const target of state.targets) {
    if (!target.element.isConnected) {
      finishedOne();
      continue;
    }

    tweenThemeBack(
      target.element,
      target.inlineValues,
      {
        duration:
          RESTORE_TWEEN_SECONDS,

        onComplete:
          finishedOne,
      },
    );
  }
}

/**
 * A real navigation/click should abandon the temporary preview.
 */
export function discardThemePreview() {
  generation++;

  if (!saved) {
    return;
  }

  const state = saved;

  saved = null;

  restoreImmediately(state);
}

/**
 * Quick Add hover cycle.
 *
 * Keep the existing behavior, but previews now affect only
 * the section containing this button.
 */

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
   * Phones/tablets don't have real hover.
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

      /**
       * Pass SOURCE now.
       *
       * Do not pass the shell.
       */
      previewTheme(
        source,
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
            source,
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
    (
      source &&
      cycle.source !== source
    )
  ) {
    return;
  }

  window.clearTimeout(
    cycle.timer,
  );

  window.clearInterval(
    cycle.timer,
  );

  const {
    started,
    source: cycleSource,
  } = cycle;

  cycle = null;

  /**
   * null means another cycle is taking ownership.
   * Don't restore between Quick Add buttons.
   */
  if (
    source &&
    started
  ) {
    endThemePreview(
      cycleSource,
    );
  }
}
