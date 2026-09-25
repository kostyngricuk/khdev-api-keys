import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { translate } from "@docusaurus/Translate";
import type { Props } from "@theme/Logo";
import clsx from "clsx";

/** Same wordmark as the dashboard ("KHDev" on the accent background + "API Keys"), with a small "Documentation" label. */
export default function Logo({ className }: Props) {
  const mark = translate({ id: "brand.mark", message: "KHDev", description: "Wordmark part on the accent background" });
  const name = translate({ id: "brand.name", message: "API Keys", description: "Wordmark part after the mark" });
  const docsLabel = translate({
    id: "brand.documentation",
    message: "Документация",
    description: "Small label next to the wordmark",
  });
  return (
    <Link to={useBaseUrl("/")} className={clsx("khdev-brand", className)} aria-label={`${mark} ${name} — ${docsLabel}`}>
      <span className="khdev-brand__mark">{mark}</span>
      <span className="khdev-brand__name">{name}</span>
      <span className="khdev-brand__sub">{docsLabel}</span>
    </Link>
  );
}
