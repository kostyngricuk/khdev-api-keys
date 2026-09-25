import Content from "@theme-original/DocSidebar/Desktop/Content";
import type ContentType from "@theme/DocSidebar/Desktop/Content";
import type { WrapperProps } from "@docusaurus/types";
import SidebarFooter from "@site/src/components/SidebarFooter";

type Props = WrapperProps<typeof ContentType>;

/** Desktop docs sidebar with the language switch and version pinned to the bottom. */
export default function ContentWrapper(props: Props) {
  return (
    <>
      <Content {...props} />
      <SidebarFooter />
    </>
  );
}
