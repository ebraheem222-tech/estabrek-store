import { beforeEach, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ row: null as any, revalidate: vi.fn(), clear: vi.fn(), db: { page: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() } } }));
vi.mock("../lib/prisma.js", () => ({ prisma: m.db }));
vi.mock("../lib/cache.js", () => ({ cacheDel: m.clear, cacheDelPrefix: m.clear }));
vi.mock("../lib/storefrontRevalidate.js", () => ({ revalidateStorefront: m.revalidate }));
import { attemptPublicationDelivery, newPublicationDelivery, retryPublicationDeliveries } from "../lib/pagePublicationDelivery.js";
const now = new Date("2026-11-07T10:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  m.row = { id: "page", slug: "/t", publicationDelivery: null };
  m.db.page.findUnique.mockImplementation(async () => structuredClone(m.row));
  m.db.page.updateMany.mockImplementation(async ({ where, data }) => {
    const id = where.AND?.find((part: any) => part.publicationDelivery?.path?.[0] === "id")?.publicationDelivery.equals;
    const attempts = where.AND?.find((part: any) => part.publicationDelivery?.path?.[0] === "attempts")?.publicationDelivery.equals;
    if (id !== m.row.publicationDelivery?.id || attempts !== m.row.publicationDelivery?.attempts) return { count: 0 };
    Object.assign(m.row, data); return { count: 1 };
  });
  m.db.page.findMany.mockImplementation(async () => [structuredClone(m.row)]);
  m.clear.mockResolvedValue(undefined);
  m.revalidate.mockResolvedValue({ state: "success", targets: [{ origin: "https://one.example.test", ok: true }] });
});

test("successful propagation is persisted separately from the publication", async () => {
  m.row.publicationDelivery = newPublicationDelivery(now);
  const result = await attemptPublicationDelivery("page", m.row.publicationDelivery, now);
  expect(result).toMatchObject({ state: "delivered", attempts: 1, retryAt: null, targets: [{ origin: "https://one.example.test", ok: true }] });
  expect(m.row.publicationDelivery.state).toBe("delivered");
});

test("partial target failure remains durable and is retried on the next due job", async () => {
  m.row.publicationDelivery = newPublicationDelivery(now);
  m.revalidate.mockResolvedValueOnce({ state: "failed", targets: [{ origin: "https://one.example.test", ok: true }, { origin: "https://two.example.test", ok: false }] });
  const result = await attemptPublicationDelivery("page", m.row.publicationDelivery, now);
  expect(result).toMatchObject({ state: "pending", attempts: 1 });
  expect(new Date(result!.retryAt!).getTime()).toBeGreaterThan(now.getTime());
  const counts = await retryPublicationDeliveries(new Date("2026-11-07T10:10:00Z"));
  expect(counts.delivered).toBe(1); expect(m.row.publicationDelivery.state).toBe("delivered");
});

test("an older delivery cannot acknowledge or replace a newer publication", async () => {
  const old = newPublicationDelivery(now), newer = newPublicationDelivery(now);
  m.row.publicationDelivery = old;
  m.revalidate.mockImplementationOnce(async () => { m.row.publicationDelivery = newer; return { state: "success", targets: [] }; });
  await attemptPublicationDelivery("page", old, now);
  expect(m.row.publicationDelivery).toEqual(newer);
});

test("unconfigured propagation is reported honestly and never called delivered", async () => {
  m.row.publicationDelivery = newPublicationDelivery(now);
  m.revalidate.mockResolvedValue({ state: "not_configured", targets: [] });
  expect(await attemptPublicationDelivery("page", m.row.publicationDelivery, now)).toMatchObject({ state: "not_configured", targets: [] });
});

test("automatic retries are bounded and a future retry does not run early", async () => {
  m.row.publicationDelivery = { ...newPublicationDelivery(now), retryAt: "2026-11-07T10:20:00.000Z" };
  expect(await retryPublicationDeliveries(now)).toMatchObject({ checked: 0 }); expect(m.revalidate).not.toHaveBeenCalled();
  m.row.publicationDelivery.attempts = 5; m.row.publicationDelivery.retryAt = now.toISOString();
  m.revalidate.mockResolvedValue({ state: "failed", targets: [{ origin: "https://one.example.test", ok: false }] });
  expect(await attemptPublicationDelivery("page", m.row.publicationDelivery, now)).toMatchObject({ state: "failed", attempts: 6, retryAt: null });
});
