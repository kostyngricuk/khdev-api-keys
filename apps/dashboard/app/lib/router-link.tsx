import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Link as RRLink } from "react-router";

/**
 * Astryx's `<LinkProvider component={…}>` contract passes `href` to the link
 * component; react-router's `Link` takes `to`. This adapter bridges the two so
 * Astryx links navigate through the router (client-side, no full page load).
 * Anchor props (target, rel, onClick, className, aria-*, …) pass through.
 */
export function RouterLink({
  href,
  ref,
  children,
  ...props
}: {
  href?: string;
  ref?: Ref<HTMLAnchorElement>;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"a">, "children" | "href">) {
  return (
    <RRLink to={href ?? "#"} ref={ref} {...props}>
      {children}
    </RRLink>
  );
}
