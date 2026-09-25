import type { KeyStatus, Platform, UserStatus } from "@khdev/contracts";

/** Brand colors of the supported platforms. */
export const PLATFORM_COLORS: Record<Platform, string> = {
  bitrix: "#E30613",
  wordpress: "#21759B",
  opencart: "#23A1D1",
  shopify: "#95BF47",
};

/**
 * Order used in charts. The two blue brands (WordPress, OpenCart) are never adjacent, which keeps every
 * neighbouring pair distinguishable (validated with the dataviz palette checker). The brand blues are
 * low-chroma / low-contrast, so charts always carry direct labels and a table view as well.
 */
export const CHART_PLATFORM_ORDER: Platform[] = ["bitrix", "wordpress", "shopify", "opencart"];

export type StatusColor = "gray" | "green" | "amber" | "red";

export const USER_STATUS_COLORS: Record<UserStatus, StatusColor> = {
  inactive: "gray",
  active: "green",
  blocked: "amber",
  removed: "red",
};

export const KEY_STATUS_COLORS: Record<KeyStatus, StatusColor> = {
  inactive: "gray",
  active: "green",
  expired: "red",
};

/** Radix step-9 solid colors, so charts match the status badges. */
const STATUS_HEX: Record<StatusColor, string> = {
  gray: "#8d8d8d",
  green: "#30a46c",
  amber: "#ffb224",
  red: "#e5484d",
};

export const statusHex = (color: StatusColor) => STATUS_HEX[color];
