/**
 * Swizzled from @docusaurus/theme-classic (DocSidebar/Mobile, 3.10.2): identical, plus the
 * language switch and docs version below the items in the mobile menu.
 */
import { memo } from "react";
import clsx from "clsx";
import { NavbarSecondaryMenuFiller, type NavbarSecondaryMenuComponent, ThemeClassNames } from "@docusaurus/theme-common";
import { useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";
import DocSidebarItems from "@theme/DocSidebarItems";
import type { Props } from "@theme/DocSidebar/Mobile";
import SidebarFooter from "@site/src/components/SidebarFooter";

const DocSidebarMobileSecondaryMenu: NavbarSecondaryMenuComponent<Props> = ({ sidebar, path }) => {
  const mobileSidebar = useNavbarMobileSidebar();
  return (
    <>
      <ul className={clsx(ThemeClassNames.docs.docSidebarMenu, "menu__list")}>
        <DocSidebarItems
          items={sidebar}
          activePath={path}
          onItemClick={(item) => {
            // Mobile sidebar should only be closed if the category has a link
            if (item.type === "category" && item.href) mobileSidebar.toggle();
            if (item.type === "link") mobileSidebar.toggle();
          }}
          level={1}
        />
      </ul>
      <SidebarFooter />
    </>
  );
};

function DocSidebarMobile(props: Props) {
  return <NavbarSecondaryMenuFiller component={DocSidebarMobileSecondaryMenu} props={props} />;
}

export default memo(DocSidebarMobile);
