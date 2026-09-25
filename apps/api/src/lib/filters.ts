const DAY_MS = 86_400_000;

export type DateRange = { from: Date | undefined; to: Date | undefined };

/** `dateTo` is inclusive in the API, so the returned `to` is the exclusive start of the next day. */
export function dateRange(query: { dateFrom?: string; dateTo?: string }): DateRange {
  return {
    from: query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : undefined,
    to: query.dateTo ? new Date(new Date(`${query.dateTo}T00:00:00.000Z`).getTime() + DAY_MS) : undefined,
  };
}

export function pageOffset(query: { page: number; pageSize: number }) {
  return { limit: query.pageSize, offset: (query.page - 1) * query.pageSize };
}
