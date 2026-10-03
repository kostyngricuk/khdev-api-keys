import { fileURLToPath } from "node:url";
import stylex from "@stylexjs/unplugin/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// lightningcss encodes target versions as (major << 16) | (minor << 8). Plain
// small numbers (e.g. `chrome: 123`) are misread as ancient builds and trigger
// feature lowering — including rewriting light-dark() into polyfill variables,
// which would break the theme's light/dark token resolution. Pack explicitly so
// modern targets are recognized and light-dark() is preserved verbatim.
const target = (major: number, minor = 0) => (major << 16) | (minor << 8);

export default defineConfig(({ mode }) => {
  // Server code (loaders/actions) reads process.env; load apps/dashboard/.env for local runs.
  // Variables that are already set (CI, hosting) win over the file.
  Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ""), ...process.env });

  return {
    plugins: [
      reactRouter(),
      // Astryx ships .tsx source that must pass through the StyleX transform;
      // emitted CSS flows into React Router's stylesheet collection (no runtime injection).
      stylex({
        runtimeInjection: false,
        treeshakeCompensation: true,
        useCSSLayers: true,
        unstable_moduleResolution: { type: "commonJS", rootDir },
        // Pin modern targets so light-dark() is not lowered into polyfill variables.
        lightningcssOptions: {
          targets: { chrome: target(123), firefox: target(120), safari: target(17, 5) },
        },
      }),
    ],
    resolve: {
      tsconfigPaths: true,
      alias: {
        // Locale catalogs live at the package root, outside src/; must precede the src alias below.
        "@astryxdesign/core/locales": fileURLToPath(new URL("./node_modules/@astryxdesign/core/locales", import.meta.url)),
        // Consume Astryx from source so the StyleX transform sees its stylex.create calls.
        "@astryxdesign/core": fileURLToPath(new URL("./node_modules/@astryxdesign/core/src", import.meta.url)),
      },
    },
    optimizeDeps: {
      // esbuild pre-bundling strips stylex.create calls; keep Astryx out of the dep scan.
      exclude: ["@astryxdesign/core"],
    },
    // Vite 8 minifies CSS with lightningcss using `build.cssTarget` (defaults to
    // `build.target`, which lacks light-dark() support and rewrites it into
    // polyfill variables that switch on prefers-color-scheme — defeating the
    // theme's light-only color-scheme pin). Target esnext so the minifier lowers
    // nothing and light-dark() reaches the browser verbatim.
    build: {
      cssTarget: "esnext",
    },
    server: {
      port: Number(process.env.PORT ?? 3000),
      strictPort: true,
    },
  };
});
