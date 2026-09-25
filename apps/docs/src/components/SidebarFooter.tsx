import Translate from "@docusaurus/Translate";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useAlternatePageUtils } from "@docusaurus/theme-common/internal";
import clsx from "clsx";

/** Bottom of the docs sidebar: language switch (same page in the other language) and the docs version. */
export default function SidebarFooter() {
  const {
    siteConfig,
    i18n: { currentLocale, locales, localeConfigs },
  } = useDocusaurusContext();
  const alternatePage = useAlternatePageUtils();
  const version = String(siteConfig.customFields?.version ?? "0.0.0-dev");

  return (
    <div className="khdev-sidebar-footer">
      <nav className="khdev-locale-switch" aria-label="Language">
        {locales.map((locale) => (
          <a
            key={locale}
            href={alternatePage.createUrl({ locale, fullyQualified: false })}
            hrefLang={localeConfigs[locale]?.htmlLang}
            lang={localeConfigs[locale]?.htmlLang}
            aria-current={locale === currentLocale ? "true" : undefined}
            className={clsx("khdev-locale-switch__item", locale === currentLocale && "is-active")}
          >
            {localeConfigs[locale]?.label ?? locale}
          </a>
        ))}
      </nav>
      <div className="khdev-sidebar-footer__version">
        <Translate id="sidebar.version" values={{ version: `v${version}` }} description="Docs version in the sidebar">
          {"Документация {version}"}
        </Translate>
      </div>
    </div>
  );
}
