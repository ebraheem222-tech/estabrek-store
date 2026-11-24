import { expect, test } from "@playwright/test";
import { DEFAULT_THEME, ROSE_THEME_ID, roseDesignOn, roseOwned, storeThemeOf } from "../src/storeThemes";

// The rose design (the hijab film, seasons, fabric story and the guide) is one store's own theme:
// it shows only where that store picked it, and nothing falls back to it.

test("only the store that picked the rose design wears it; every other store gets a theme", () => {
  // The owner (its migration writes both): the rose design, no library theme on top.
  const owner = { identity: { industry: "fashion", audience: "women" }, storeTheme: { id: ROSE_THEME_ID }, privateThemes: [ROSE_THEME_ID] };
  expect(roseDesignOn(owner)).toBe(true);
  expect(roseOwned(owner)).toBe(true);
  expect(storeThemeOf(owner)).toBeNull();

  // Another hijab shop with no theme picked: its kind's theme, never the rose design.
  const otherHijabShop = { identity: { industry: "fashion", audience: "women" } };
  expect(roseDesignOn(otherHijabShop)).toBe(false);
  expect(roseOwned(otherHijabShop)).toBe(false);
  expect(storeThemeOf(otherHijabShop)?.theme.id).toBe(DEFAULT_THEME.fashion);

  // A store with nothing set at all (a fresh copy, a game server site…): the general theme.
  expect(roseDesignOn({})).toBe(false);
  expect(storeThemeOf({})?.theme.id).toBe(DEFAULT_THEME.general);
  expect(storeThemeOf(null)?.theme.id).toBe(DEFAULT_THEME.general);

  // The owner on another theme for a while: that theme, not the rose design.
  const away = { ...owner, storeTheme: { id: "circuit" } };
  expect(roseDesignOn(away)).toBe(false);
  expect(roseOwned(away)).toBe(true);
  expect(storeThemeOf(away)?.theme.id).toBe("circuit");

  // The owner's own design pages (cms) aren't the rose design either.
  expect(roseDesignOn({ ...owner, storeDesign: { mode: "cms" } })).toBe(false);

  // No kind of store falls back to it.
  for (const [kind, id] of Object.entries(DEFAULT_THEME)) {
    expect(id, kind).not.toBe(ROSE_THEME_ID);
    for (const audience of ["women", "men", "everyone"]) {
      expect(storeThemeOf({ identity: { industry: kind, audience } })?.theme.id, `${kind} ${audience}`).toBe(id);
    }
  }
});
