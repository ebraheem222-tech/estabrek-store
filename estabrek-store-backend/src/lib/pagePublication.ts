/** Page availability and explicit publication choices; no storage or network effects. */
export type PublicationSnapshot = { status: string; slug: string; publishAt: string | null; unpublishAt: string | null };
export type PublicationPage = { status: string; slug: string; publishAt?: Date | string | null; unpublishAt?: Date | string | null; kind?: string };
export type PublicationOptions = { mode?: "keep_schedule" | "now"; republishArchived?: boolean };
export type PublicationState = PublicationSnapshot & { state: "draft" | "archived" | "scheduled" | "expired" | "live"; public: boolean };

export class PublicationError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

const date = (value: Date | string | null | undefined): Date | null => {
  if (value == null) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new PublicationError("PUBLICATION_DATE_INVALID", 400);
  return parsed;
};

export function publicationSnapshot(page: PublicationPage): PublicationSnapshot {
  return { status: page.status, slug: page.slug, publishAt: date(page.publishAt)?.toISOString() ?? null, unpublishAt: date(page.unpublishAt)?.toISOString() ?? null };
}

export function samePublication(expected: PublicationSnapshot, page: PublicationPage): boolean {
  const a = publicationSnapshot(expected), b = publicationSnapshot(page);
  return a.status === b.status && a.slug === b.slug && a.publishAt === b.publishAt && a.unpublishAt === b.unpublishAt;
}

export function publicationState(page: PublicationPage, now = new Date()): PublicationState {
  const snapshot = publicationSnapshot(page);
  const state = page.status === "ARCHIVED" ? "archived" : page.status !== "PUBLISHED" ? "draft"
    : snapshot.unpublishAt && new Date(snapshot.unpublishAt) <= now ? "expired"
    : snapshot.publishAt && new Date(snapshot.publishAt) > now ? "scheduled" : "live";
  return { ...snapshot, state, public: state === "live" && (!page.kind || page.kind === "page") };
}

export function publicationChange(page: PublicationPage, options: PublicationOptions = {}, _now = new Date()): { status: "PUBLISHED"; publishAt: Date | null; unpublishAt: Date | null } {
  if (page.status === "ARCHIVED" && options.republishArchived !== true) throw new PublicationError("ARCHIVED_CONFIRMATION_REQUIRED", 409);
  const publishAt = options.mode === "now" ? null : date(page.publishAt);
  const unpublishAt = options.mode === "now" ? null : date(page.unpublishAt);
  if (publishAt && unpublishAt && unpublishAt <= publishAt) throw new PublicationError("PUBLICATION_WINDOW_INVALID", 400);
  return { status: "PUBLISHED", publishAt, unpublishAt };
}
