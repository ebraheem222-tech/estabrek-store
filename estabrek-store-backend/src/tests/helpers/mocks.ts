// tests/helpers/mocks.ts
import { vi } from "vitest";

export function mockPrisma(overrides: Partial<typeof import("@prisma/client").PrismaClient> = {}) {
  const prisma = {
    // add only the models you touch in tests; each is a jest/vi mock fn group
    product: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn() },
    size: { findMany: vi.fn() },
    productItem: { findMany: vi.fn() },
    productItemImage: { findMany: vi.fn() },
    productVariant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    review: { create: vi.fn() },
    productComment: { create: vi.fn() },
    orderRequest: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
    orderRequestHistory: { create: vi.fn() },
    outboxMessage: { create: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn((cb: any) => cb(prisma)),
    ...overrides,
  } as any;

  // wire the app’s prisma import to our mock
  vi.mock("../../src/lib/prisma.js", () => ({ prisma }));

  return prisma;
}
