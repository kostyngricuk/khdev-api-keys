const LABEL_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/**
 * Reduces any site URL or host to a comparable domain:
 * lowercase, punycode, without scheme, `www.`, port, path or query.
 * Returns null when the input is not a usable host name.
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let hostname: string;
  try {
    hostname = new URL(withScheme).hostname;
  } catch {
    return null;
  }

  hostname = hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!hostname || hostname.length > 253) return null;
  if (hostname === "localhost") return hostname;

  const labels = hostname.split(".");
  if (labels.length < 2 || !labels.every((label) => LABEL_RE.test(label))) return null;
  return hostname;
}
