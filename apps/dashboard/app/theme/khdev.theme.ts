import { defineTheme } from "@astryxdesign/core";

/**
 * KHDev dashboard theme: indigo accent over cool (slate-like) neutrals, light only.
 *
 * Every color value is a single light value — never a `[light, dark]` tuple — so no
 * dark branch can activate. The app never sets `color-scheme: dark`.
 *
 * Built with `pnpm exec astryx theme build app/theme/khdev.ts -o app/theme/khdev.css`
 * (committed artifacts); the runtime-injection path is deliberately avoided so the
 * first server-rendered paint already carries the theme CSS.
 */
export const khdev = defineTheme({
  name: "khdev",
  color: {
    // Radix indigo-9 (#3b5bdb) was the brand/accent color of the old theme.
    accent: "#3b5bdb",
    neutralStyle: "cool",
  },
});
