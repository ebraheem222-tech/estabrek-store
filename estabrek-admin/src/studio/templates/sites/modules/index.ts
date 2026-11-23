/**
 * Every module a site can use, in the order a site's tables and functions are written (the order of
 * the pages is each page's own `order`), and each archetype's home.
 */
import type { Archetype, PanelBits, SiteBlueprint, SiteSetting } from "../blueprint";
import { STATUS, serverHome, serverPanel, serverSettings } from "./server";
import { BOOKING, CONTACT, NOTIFY } from "./inbox";
import { BRANCHES, NEWS, OFFERS, QUESTIONS, REVIEWS, TEAM } from "./lists";
import { STORY, frontHome, frontPanel, frontSettings } from "./front";
import { APPLY, RULES } from "./apply";
import { APPEALS } from "./appeals";
import { PACKAGES } from "./packages";
import { MCSTORE } from "./mcstore";
import { LINK } from "./link";
import { RANKING } from "./ranking";
import { WIPE } from "./wipe";
import { STREAMERS } from "./streamers";
import { SERVERS } from "./servers";
import { BANS } from "./bans";
import type { Built, Part, SiteModule } from "./kit";

export const MODULES: SiteModule[] = [STATUS, OFFERS, TEAM, STORY, REVIEWS, QUESTIONS, NEWS, BRANCHES, RULES, APPLY, APPEALS, PACKAGES, MCSTORE, LINK, RANKING, WIPE, STREAMERS, SERVERS, BANS, CONTACT, BOOKING, NOTIFY];

/** Each archetype's home page; one with none can't be built yet. */
export const HOMES: Partial<Record<Archetype, (b: Built) => Part[]>> = { front: frontHome, server: serverHome };
/** Each archetype's own settings (before its modules'). */
export const HOME_SETTINGS: Partial<Record<Archetype, (bp: SiteBlueprint) => SiteSetting[]>> = { front: frontSettings, server: serverSettings };
/** Each archetype's own bits of the panel (before its modules'). */
export const HOME_PANEL: Partial<Record<Archetype, (bp: SiteBlueprint) => PanelBits>> = { front: frontPanel, server: serverPanel };

export type { Built, Part, SiteFile, SiteModule, SitePage, SiteTable, Slugs } from "./kit";
