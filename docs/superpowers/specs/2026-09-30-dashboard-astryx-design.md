# Dashboard on Astryx — Design

Date: 2026-09-30
Status: Approved design, pending spec review

## 1. Purpose

Rewrite the dashboard app's UI layer on [Astryx](https://github.com/facebook/astryx)
(Facebook's React + StyleX design system, v0.6.x) and remove all Radix packages from
the project. Behavior, routes, i18n strings, data flow (BFF loaders/actions), and the
recharts charts are unchanged — only the presentation layer and its build wiring move.

Locked decisions (brainstormed 2026-09-30):

| Decision | Choice |
| --- | --- |
| Integration mode | **Source + StyleX Vite plugin** (not pre-built CSS) |
| Theming | Custom indigo-accent theme via in-code `defineTheme` (light values only) |
| App shell | Adopt Astryx `AppShell` / `TopNav` / `SideNav` / mobile nav (replace hand-built sidebar/topbar/drawer) |
| Dark mode | **No** — light only |
| Icons | `lucide-react`, rendered through Astryx `Icon` / icon props |

## 2. Integration & build

Scope: `apps/dashboard` only. No changes to api, docs, or shared packages.

Dependencies:

- Add: `@astryxdesign/core`, `@stylexjs/stylex` (peer), `lucide-react`
- Dev-add: `@stylexjs/unplugin`, `@astryxdesign/cli` (component docs for agent/human lookup; also enables `astryx init`)
- Remove (at the end, once nothing imports them): `radix-ui`, `@radix-ui/themes`, `@radix-ui/react-icons`

`vite.config.ts` gains the StyleX plugin per Astryx's Vite recipe:

- `stylex.vite({ dev, runtimeInjection: false, treeshakeCompensation: true, useCSSLayers: true, unstable_moduleResolution: { type: 'commonJS', rootDir }, lightningcssOptions: { targets } })`
  with explicit lightningcss targets (chrome ≥123, firefox ≥120, safari ≥17.5) so
  `light-dark()` is not lowered into polyfill variables
- `resolve.alias`: `@astryxdesign/core` → `node_modules/@astryxdesign/core/src`
- `optimizeDeps.exclude`: `['@astryxdesign/core']` (Astryx ships source that must go
  through the StyleX transform; esbuild pre-bundling strips `stylex.create` calls)

No other build changes. `react-router build` compiles client + server via Vite; the
StyleX-emitted CSS enters React Router's normal stylesheet collection and is served
through `<Links />`. `@astryxdesign/core`'s `postinstall` script only prints a setup
nudge and always exits 0 — no `allowBuilds` entry needed.

## 3. Theme

- New file `apps/dashboard/app/theme/khdev.ts`: `defineTheme` with an **indigo accent**
  over neutral grays (the current Radix look: indigo accent, slate gray). Based on the
  shape of Astryx's stock themes (typography scale, spacing, radius, status colors).
- **Light-only enforcement:** Astryx encodes light/dark pairs via CSS `light-dark()`.
  We define every color token as a **single value** (the light one), so no dark branch
  can activate. No `color-scheme: dark` anywhere.
- `app/root.tsx`: replace the Radix `<Theme>` with Astryx
  `<Theme theme={khdev}>` wrapping `<LinkProvider component={Link}>` (react-router's
  `Link`, so Astryx link-capable components navigate client-side). The rest of the
  root layout (`Meta`, `Links`, `I18nProvider`, `ScrollRestoration`) is unchanged.

## 4. Shell & layout

`routes/layout.tsx` (currently Toaster → Sidebar + TopBar + Outlet) becomes one
`AppShell`:

- `sideNav`: Astryx SideNav — Wordmark header, role-based nav items (customer: keys,
  support; admin: dashboard, stats, keys, customers), docs link (external), version
  footer. Content comes from today's `SidebarContent`.
- `topNav`: Astryx TopNav — user email chip, language switcher, logout action
  (content from today's `TopBar`).
- `mobileNav`: AppShell auto-drawer with a named breakpoint resolving to **1024px**
  (today's CSS switches at `max-width: 1023px`; pick the theme width-breakpoint that
  maps to it — verify against Astryx's default map during implementation), controlled
  open state that closes on route change (same behavior as the current hand-built drawer).
- The desktop/tablet/mobile media queries, drawer overlay/content CSS and burger button
  in `app.css` are deleted — AppShell owns all of it.

`routes/login.tsx` stays shell-less: centered card layout (Astryx `Center`/`Card`).
The root `ErrorBoundary` is re-expressed with Astryx Card/Text/Button.

## 5. Component migration map

| Today (Radix) | Astryx | Notes |
| --- | --- | --- |
| Box / Flex / Grid | Stack / HStack / VStack / Grid | layout primitives |
| TextField (+Slot icon) | TextInput (start icon) | login email, filters |
| Select (in GET filter form) | Selector **if** it participates in native form submission (`name`); otherwise styled native `<select>` or hidden-input sync | ⚠️ must be verified in the spike; filters are a plain GET form read by the loader |
| TextArea | TextArea | support form |
| Table | Table | keys, admin tables |
| Badge | Badge | statuses |
| Tooltip | Tooltip | copy button, platform icon |
| SegmentedControl | SegmentedControl | language switcher, chart range |
| Avatar | Avatar | topbar: role Badge + initials Avatar + email + logout icon button (all kept) |
| Callout | Banner | login error/notice |
| Dialog / AlertDialog | Dialog / AlertDialog | KeyActions, admin.customer actions; `fetcher.Form` stays inside Astryx Dialog |
| DropdownMenu | DropdownMenu (or MoreMenu) | row actions |
| Separator | Divider | sidebar, stats page |
| radix-ui Toast + local queue | Astryx `showToast` **behind the existing** `useToast()` / `useActionToast(result)` API | all call sites unchanged; only Toaster internals swap |
| `unstable_OneTimePasswordField` | small custom 6-input component: auto-advance, paste support, auto-submit on completion, hidden input carrying `name="code"` | styled with Astryx tokens; replaces `.otp-*` CSS |
| @radix-ui/react-icons | lucide-react via Astryx `Icon` / icon props | e.g. LogOut, Mail, Send, Plus, File, Image, Archive, ArrowLeft, HelpCircle |

recharts usage is untouched (Astryx's chart packages are canary-only; out of scope).

## 6. CSS changes (`app/app.css`)

- Delete: Radix `--cursor-*` overrides, drawer overlay/content + keyframes, burger
  button rules, `.nav-link` (replaced by SideNav item styling), `.otp-*` (replaced by
  the new OTP component styles).
- Keep and re-tokenize onto Astryx variables (`--spacing-*`, `--color-*`,
  `--radius-*`): page-content padding (if not covered by AppShell `contentPadding`),
  attachment picker styles, `.key-mono`, FAQ trigger styles.
- Result target: a small file of app-specific rules only; everything else is Astryx's.

## 7. Out of scope

- No new features, no route changes, no i18n string changes (all labels stay in
  `app/i18n/*`).
- No dark mode.
- No changes to api, docs, contracts, or CI.
- No adoption of Astryx templates/patterns beyond the shell components named above.

## 8. Testing & sequencing

1. **Spike (throwaway, first step):** add a temporary route rendering a battery of
   Astryx components (Button, TextInput, Selector-in-a-GET-form, Dialog, Table, Toast,
   SegmentedControl) and verify under `react-router dev` **and** `build` + `start`:
   SSR HTML contains the styles (no FOUC), hydration is clean, dialogs/toasts work.
   Delete the spike route before merging the rewrite. This de-risks the two biggest
   unknowns: StyleX inside React Router's dual build, and form-embedded selects.
2. **Route-by-route migration** on branch `feat/astryx-dashboard`, each commit green
   (`pnpm typecheck && pnpm lint && pnpm test` in dashboard) plus a manual visual pass:
   theme + root wiring → login → shell/layout (AppShell) → keys → support → admin pages.
3. **Finish:** remove the three Radix packages, confirm zero `radix` occurrences in
   `pnpm-lock.yaml`, full monorepo build, and a smoke pass of every route in RU and EN
   (login flow incl. OTP auto-submit, key actions, filters, support form with
   attachments, admin tables, language switcher).

Existing vitest tests cover lib logic only (filters, i18n, validation, format,
attachments, body-limit, colors, meta) and must pass untouched.

## 9. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Astryx is beta; real APIs may differ from docs/README | Spike first; use `astryx component <Name>` CLI docs as the authoritative API reference during migration |
| StyleX plugin inside `react-router build` (client + server) unproven for this stack | Spike verifies before any real code is migrated; fallback is pre-built CSS mode (documented Astryx path, no plugin) |
| Selector may not submit inside a native GET form | Spike checks it explicitly; fallbacks defined in §5 |
| pnpm build-script policy vs `@astryxdesign/core` postinstall | Script is nudge-only, always exits 0 (verified in source); no allowlist needed |
