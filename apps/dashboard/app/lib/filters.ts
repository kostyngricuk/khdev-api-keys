import { PLATFORMS, type Platform } from "@khdev/contracts";

export type Filters = {
  dateFrom?: string;
  dateTo?: string;
  platform?: Platform;
  status?: string;
  email?: string;
  page: number;
};

type ParseOptions = {
  allowEmail?: boolean;
  statuses?: readonly string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const clean = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "all" ? trimmed : undefined;
};

/** Filters live in the URL so loaders can read them and links stay shareable. */
export function parseFilters(url: URL, options: ParseOptions = {}): Filters {
  const params = url.searchParams;
  const filters: Filters = { page: 1 };

  const dateFrom = clean(params.get("dateFrom"));
  if (dateFrom && DATE_RE.test(dateFrom)) filters.dateFrom = dateFrom;
  const dateTo = clean(params.get("dateTo"));
  if (dateTo && DATE_RE.test(dateTo)) filters.dateTo = dateTo;

  const platform = clean(params.get("platform"));
  if (platform && (PLATFORMS as readonly string[]).includes(platform)) filters.platform = platform as Platform;

  const status = clean(params.get("status"));
  if (status && (!options.statuses || options.statuses.includes(status))) filters.status = status;

  const email = clean(params.get("email"));
  if (options.allowEmail && email) filters.email = email;

  const page = Number(params.get("page"));
  if (Number.isInteger(page) && page > 1) filters.page = page;

  return filters;
}

export function toApiQuery(filters: Filters): string {
  const params = new URLSearchParams();
  for (const key of ["dateFrom", "dateTo", "platform", "status", "email"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  params.set("page", String(filters.page));
  return params.toString();
}
