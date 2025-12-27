export type PageInput = { page?: number; pageSize?: number };
export type PageCalc = { skip: number; take: number; page: number; pageSize: number };

export function calcPage({ page = 1, pageSize = 20 }: PageInput): PageCalc {
  const p = Math.max(1, Math.floor(page));
  const s = Math.min(100, Math.max(1, Math.floor(pageSize)));
  return { skip: (p - 1) * s, take: s, page: p, pageSize: s };
}

export function buildPageMeta(total: number, c: PageCalc) {
  const totalPages = Math.max(1, Math.ceil(total / c.pageSize));
  return {
    page: c.page,
    pageSize: c.pageSize,
    total,
    totalPages,
    hasNext: c.page < totalPages,
    hasPrev: c.page > 1,
  };
}
