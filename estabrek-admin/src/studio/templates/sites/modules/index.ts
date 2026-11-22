/**
 * Every module a site can use, in the order a site's tables and functions are written (the order of
 * the pages is each page's own `order`), and each archetype's home.
 */
import type { Archetype } from "../blueprint";
import { BOOKING, CONTACT, NOTIFY } from "./inbox";
import { BRANCHES, NEWS, OFFERS, QUESTIONS, REVIEWS, TEAM } from "./lists";
import { STORY, frontHome } from "./front";
import type { Built, Part, SiteModule } from "./kit";

export const MODULES: SiteModule[] = [OFFERS, TEAM, STORY, REVIEWS, QUESTIONS, NEWS, BRANCHES, CONTACT, BOOKING, NOTIFY];

/** Each archetype's home page; one with none can't be built yet. */
export const HOMES: Partial<Record<Archetype, (b: Built) => Part[]>> = { front: frontHome };

export type { Built, Part, SiteFile, SiteModule, SitePage, SiteTable, Slugs } from "./kit";
