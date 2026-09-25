import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { translate } from "@docusaurus/Translate";
import type { Props } from "@theme/Logo";
import clsx from "clsx";

/** Same wordmark as the dashboard ("KHDev" on the accent background + "API Keys"), with a small "Documentation" label. */
export default function Logo({ className }: Props) {
  const docsLabel = translate({ id: "brand.documentation", message: "Документация", description: "Small label next to the wordmark" });
  return (
    <Link to={useBaseUrl("/")} className={clsx("khdev-brand", className)} aria-label={`KHDev API Keys — ${docsLabel}`}>
      <span className="khdev-brand__mark">KHDev</span>
      <span className="khdev-brand__name">API Keys</span>
      <span className="khdev-brand__sub">{docsLabel}</span>
    </Link>
  );
}
