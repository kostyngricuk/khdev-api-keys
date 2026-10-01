# Dashboard on Astryx Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the dashboard's UI layer on Astryx (React + StyleX, v0.6.x), removing all Radix packages, with no change to routes, i18n strings, data flow, or the recharts charts.

**Architecture:** `apps/dashboard` only. We adopt Astryx in **source + StyleX Vite plugin** mode: `@astryxdesign/core` ships `.tsx` source that the StyleX plugin transforms, and the emitted CSS flows through React Router's normal `<Links />` collection (no runtime injection → no FOUC). An indigo-accent, light-only theme is defined in code via `defineTheme`. During migration the Radix and Astryx design systems **coexist** (both themes + both stylesheets are loaded) so every commit renders correctly; the final task removes Radix. The hand-built sidebar/topbar/drawer become Astryx `AppShell`/`SideNav`/`TopNav`/mobile nav.

**Tech Stack:** React 19, React Router 8 (framework mode), Vite 8, pnpm 12 workspaces + Turborepo 2, TypeScript ~6.0. Astryx `@astryxdesign/core@^0.6.3`, `@stylexjs/stylex@^0.19` (peer), `lucide-react` for icons, `@stylexjs/unplugin` (dev, the Vite plugin), `@astryxdesign/cli` (dev, `astryx component <Name>` docs). Vitest 5 for lib tests.

**Spec:** `docs/superpowers/specs/2026-09-30-dashboard-astryx-design.md`

## Global Constraints

- Scope: `apps/dashboard` only. **No changes** to `apps/api`, `apps/docs`, `packages/*`, contracts, or CI.
- Light-only: **no dark mode.** Every Astryx color token we set is a **single value** (never a `[light, dark]` tuple). No `color-scheme: dark` anywhere.
- No new features, no route changes, no i18n string changes — all labels stay in `app/i18n/*`. recharts usage is untouched (Astryx chart packages are canary-only, out of scope).
- Icons: `lucide-react`, passed through Astryx `icon`/`Icon` props. Astryx `icon` props accept a React node or an SVG component type, so `<Button icon={<Plus size={16} />} />` works directly.
- The existing `useToast()` / `useActionToast(result)` API is **kept**; only the Toaster internals swap to Astryx. All call sites are unchanged.
- Every commit green in `apps/dashboard`: `pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm build` succeeds, plus a manual visual pass of the touched routes (RU and EN). Existing vitest tests (lib only) must pass untouched.
- Branch: `feat/astryx-dashboard`. Commit messages follow the repo convention (`feat(dashboard): …`, `refactor(dashboard): …`, `chore(dashboard): …`).
- Astryx is beta — when a component's exact prop differs from this plan, the **installed** type definitions are authoritative: read `node_modules/@astryxdesign/core/src/<Component>/*.d.ts` or run `pnpm exec astryx component <Name>` (from `@astryxdesign/cli`). Do not guess; verify against the installed version.

## Review Focus

Five input classes / failure modes the spec implies but no unit test exercises — most likely to bite a person using this software, most likely first:

1. **SSR / no-FOUC on first paint.** StyleX-emitted CSS must be present in the server-rendered HTML for every route (Astryx source is transformed by the Vite plugin and served via `<Links />`, `runtimeInjection: false`). A person loading any page cold must not see a flash of unstyled content. → Verified in Task 1 (spike) and re-checked on each migrated route's first paint in Task 7.
2. **Hydration mismatch from browser-only state.** Astryx components that read the viewport (AppShell mobile breakpoint, mobile nav open state) must render identical HTML server and client, or React logs hydration errors and can drop the tree. → AppShell `defaultIsMobile` seeds the initial layout; verified in Task 3 (no console hydration warnings on load at desktop and phone widths).
3. **GET-form filter submission.** `Selector`/`TextInput` used inside the native `<Form method="get">` must actually submit their value into the URL query so the loader reads it. A person applying a "Status = Active" filter must land on `?status=active` and see filtered rows. → Selector renders `<input type="hidden" name={htmlName} value={value}>`; verified in Task 1 (spike) and exercised in Task 4 (keys filters).
4. **OTP entry edge cases.** The 6-digit code field must auto-advance between boxes, accept a pasted 6-digit string, reject non-digits, and auto-submit the moment the 6th digit lands — with the value carried by a hidden `name="code"` input so the action reads it. A person pasting their code or typing fast must log in without pressing Enter, and a partial/invalid paste must not submit garbage. → Pure logic unit-tested in Task 2 (`app/lib/otp.ts`), component wired in the same task.
5. **Mobile nav lifecycle (≤1023px).** The drawer must open from the burger, close on route change, and never leak its overlay/backdrop at ≥1024px. A person navigating between pages on a phone must not be trapped behind a stale backdrop. → Controlled `isOpen` + effect closing on location change; verified in Task 3.

---

## File Map

```text
apps/dashboard/
  package.json                     add Astryx deps; remove Radix (Task 7)
  vite.config.ts                   StyleX plugin + alias + optimizeDeps.exclude (Task 1)
  app/theme/khdev.ts               NEW — defineTheme indigo accent, light-only (Task 1)
  app/root.tsx                     Astryx <Theme> + LinkProvider added (Task 1); Radix removed + ErrorBoundary re-expressed (Task 7)
  app/routes/spike.tsx             TEMP spike route (Task 1), deleted (Task 7)
  app/routes.ts                    spike route entry (Task 1), removed (Task 7)
  app/lib/otp.ts                   NEW — pure OTP logic (Task 2)
  test/otp.test.ts                 NEW — OTP unit tests (Task 2)
  app/components/OtpInput.tsx      NEW — 6-box code input (Task 2)
  app/routes/login.tsx             migrate to Astryx (Task 2)
  app/components/LanguageSwitcher.tsx   SegmentedControl (Task 2)
  app/routes/layout.tsx            AppShell + SideNav + TopNav + mobile nav (Task 3)
  app/components/Sidebar.tsx       DELETE (Task 3, content moves to layout.tsx)
  app/components/TopBar.tsx        DELETE (Task 3, content moves to layout.tsx)
  app/app.css                      delete Radix/drawer CSS (Task 3); re-tokenize + drop cursor overrides (Task 7)
  app/components/PageHeader.tsx    Astryx (Task 4)
  app/components/Filters.tsx       Selector htmlName / TextInput (Task 4)
  app/components/StatusBadge.tsx   Badge (Task 4)
  app/components/SolutionLabel.tsx HStack + Text (Task 4)
  app/components/PlatformIcon.tsx  Icon + Tooltip (Task 4)
  app/components/CopyButton.tsx    IconButton + Tooltip (Task 4)
  app/components/EmptyState.tsx   Astryx EmptyState (Task 4)
  app/components/Pagination.tsx    Astryx Pagination or Button pair (Task 4)
  app/components/KeyActions.tsx    Dialog + AlertDialog + DropdownMenu (Task 4)
  app/routes/keys.tsx              Table + Dialog (Task 4)
  app/components/AttachmentPicker.tsx   re-tokenize + IconButton (Task 5)
  app/routes/support.tsx           TextArea + Collapsible FAQ + Dialog (Task 5)
  app/components/Kpi.tsx           Card + Text (Task 6)
  app/components/ChartCard.tsx     SegmentedControl + Table (Task 6)
  app/routes/admin.dashboard.tsx   Grid + Kpi (Task 6)
  app/routes/admin.stats.tsx       Heading + Divider + ChartCard (Task 6)
  app/routes/admin.keys.tsx        Table (reuses Task 4 components) (Task 6)
  app/routes/admin.customers.tsx   DropdownMenu + AlertDialog (Task 6)
```

Components that are pure layout/text with no Radix-specific behavior (`Wordmark`, `ValidationMessages`, `Charts`, `Kpi` internals) are touched only where they import a Radix primitive. `lib/*` and `i18n/*` are never modified except the new `app/lib/otp.ts`.

---

> **Reconstruction note (2026-10-01):** This file originally ended at the File Map — the task sections it references were missing. Tasks 1–7 below were reconstructed from spec §8 sequencing, the File Map's task assignments, and a full read of the current `apps/dashboard` source; every Astryx API fact was verified against the published packages (`@astryxdesign/core@0.6.3`, `@stylexjs/unplugin@0.19.1`, `@stylexjs/babel-plugin@0.19.1`) before writing. Two assignments were judgment calls, flagged inline: **Toaster internals → Task 3** (it wraps the layout; not listed in the File Map) and **Charts.tsx tooltip chrome → Task 6** (imports Radix primitives; used only by admin.stats).

### Task 1: Astryx foundation — deps, Vite/StyleX wiring, theme, root providers, spike route

**Files:** `apps/dashboard/package.json`, `vite.config.ts`, `app/theme/khdev.ts` (NEW), `app/root.tsx`, `app/routes/spike.tsx` (TEMP NEW), `app/routes.ts`.

- [ ] Add to `apps/dashboard/package.json`: deps `@astryxdesign/core@^0.6.3`, `@stylexjs/stylex@^0.19`, `lucide-react@^1.49`; devDeps `@stylexjs/unplugin@^0.19`, `@astryxdesign/cli@^0.6.3`. **Keep** the three Radix packages (coexistence until Task 7). Run `pnpm install` from the repo root.
  - Expected: install succeeds; postinstall prints at most a one-line nudge and exits 0.
- [ ] `vite.config.ts`: add `stylex` from `@stylexjs/unplugin/vite` to plugins with `{ runtimeInjection: false, treeshakeCompensation: true, useCSSLayers: true, unstable_moduleResolution: { type: "commonJS", rootDir }, lightningcssOptions: { targets } }`, where `targets` pins chrome ≥123 / firefox ≥120 / safari ≥17.5 (so `light-dark()` is not lowered) and `rootDir` is the dashboard app directory; add `resolve.alias` mapping `@astryxdesign/core` → `node_modules/@astryxdesign/core/src`; add `optimizeDeps.exclude: ["@astryxdesign/core"]`.
- [ ] NEW `app/theme/khdev.ts`: `defineTheme({ name: "khdev", … })` with an **indigo accent** over neutral grays, every color token a **single light value** (never a `[light, dark]` tuple), no `color-scheme: dark`. Base the shape on Astryx's stock themes; verify the exact input surface against `node_modules/@astryxdesign/core/src/theme/defineTheme.ts` (`DefineThemeInput`: name, optional `typography` / `motion` / `radius` / `color` / `tokens`).
- [ ] `app/root.tsx`: wrap children in Astryx `<Theme theme={khdev}>` and `<LinkProvider component={Link}>` (react-router's `Link`) **inside** the existing Radix `<Theme>` (coexistence). `Meta`, `Links`, `I18nProvider`, `ScrollRestoration` unchanged.
- [ ] TEMP spike route `app/routes/spike.tsx` + entry in `routes.ts`: a battery of Astryx Button, TextInput, **Selector inside a native `<Form method="get">`**, Dialog, Table, toast via `useToast()`, SegmentedControl — enough to exercise every unknown at once.
- [ ] Verify the spike under BOTH `pnpm dev` and `pnpm build && pnpm start`:
  - Expected (dev + start): SSR HTML of `/spike` contains the Astryx/StyleX-emitted CSS (no flash of unstyled content on cold load); no hydration warnings in console; Dialog opens/closes; toast shows; SegmentedControl switches.
  - Expected (form): submitting the GET form with a Selector value lands on `?name=<value>` — i.e. Selector's hidden input (`htmlName`) participates in native submission. If it does not, rule per spec §5 fallback (styled native `<select>` or hidden-input sync) and ledger it.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green in `apps/dashboard`; `pnpm build` succeeds.
- [ ] Commit `chore(dashboard): add Astryx foundation and spike route`.

### Task 2: Login page + OTP input on Astryx

**Files:** `app/lib/otp.ts` (NEW), `test/otp.test.ts` (NEW), `app/components/OtpInput.tsx` (NEW), `app/routes/login.tsx`, `app/components/LanguageSwitcher.tsx`, `app/components/Wordmark.tsx`, `app/app.css`.

- [ ] TDD the pure OTP logic. Write `test/otp.test.ts` FIRST and watch it fail:
  - single digit input appends and advances to the next box; non-digit input is rejected (state unchanged)
  - backspace on an empty box clears the previous box; backspace at position 0 is a no-op
  - pasting a 6-digit string fills all six boxes; pasting fewer digits fills from the start; pasting a string with non-digits is rejected
  - completion: `isComplete` flips true exactly when the sixth digit lands (the auto-submit trigger)
  - Expected: `pnpm test` FAILS (module missing), then PASS after implementing `app/lib/otp.ts`.
- [ ] NEW `app/components/OtpInput.tsx`: six boxes using Astryx tokens; props `{ name, ariaLabels, onComplete }`; renders a hidden `<input type="hidden" name={name}>` carrying the current digits so a native form submission reads them; auto-advance, paste support, non-digit rejection, focus management — all driven by `app/lib/otp.ts`. Style per installed Astryx API (verify `TextInput` against installed types; plain inputs with Astryx tokens are acceptable).
- [ ] `app/routes/login.tsx`: migrate to Astryx — centered layout (Astryx Center/Card), email step: TextInput with start icon (lucide `Mail`), error/notice as Banner, Button; code step: OtpInput that **auto-submits when the sixth digit lands** (plus a visible submit button), resend countdown and back-to-email link kept. Loader/action logic, all i18n keys, and the two-step `intent` flow are unchanged.
- [ ] `app/components/LanguageSwitcher.tsx`: Astryx SegmentedControl (`value={locale}`, onValueChange → existing `/locale` submit).
- [ ] `app/components/Wordmark.tsx`: re-express with Astryx Text/HStack (consumed by login here and the sidebar in Task 3); keep both sizes.
- [ ] `app/app.css`: delete the `.otp-*` rules (replaced by OtpInput).
- [ ] Manual pass, RU and EN: request code → type six digits one by one (auto-submit on the sixth, no Enter needed) → login; fresh load → paste a 6-digit code → auto-submits; partial/invalid paste does not submit garbage; resend countdown disables then re-enables; back-to-email preserves the email.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green; `pnpm build` succeeds.
- [ ] Commit `feat(dashboard): login page on Astryx with OTP input`.

### Task 3: App shell — AppShell, SideNav, TopNav, mobile nav, Toaster internals

**Files:** `app/routes/layout.tsx`, `app/components/Sidebar.tsx` (DELETE), `app/components/TopBar.tsx` (DELETE), `app/components/Toaster.tsx`, `app/app.css`.

- [ ] Rewrite `layout.tsx` as one Astryx `AppShell`:
  - `sideNav`: SideNav — Wordmark header, role-based items (customer: keys, support; admin: dashboard, stats, keys, customers) with lucide icons, docs external link, version footer. Content from today's `SidebarContent`; active-item state via the installed SideNav API (verify its item/active props against installed types).
  - `topNav`: TopNav — LanguageSwitcher, role Badge, initials Avatar (`avatarLetter`), email, logout IconButton inside `<Form method="post" action="/logout">`.
  - `mobileNav`: AppShell auto-drawer with a breakpoint resolving to **1024px** (verify the named-breakpoint map in installed types; today's CSS switches at `max-width: 1023px`), controlled open state that **closes on route change** (`location.pathname` + `location.search` effect, same behavior as today's `MobileNav`).
- [ ] DELETE `Sidebar.tsx` and `TopBar.tsx` (content moved into `layout.tsx`).
- [ ] `Toaster.tsx` (judgment-call assignment — not in the File Map): keep the exported `useToast()` / `useActionToast(result)` API **byte-compatible for call sites**; swap internals to Astryx (`useToast(): ShowToastFn`, `ToastOptions { body, type: "info" | "error", … }` per installed types). Success notices: if the installed API cannot express a distinct success look, keep the green check via `endContent`/`renderContent`. All existing call sites (KeyActions, support dialog, customers) stay unchanged.
- [ ] `app/app.css`: delete `.sidebar-desktop`, `.topbar`, `.burger-button`, `.drawer-*`, drawer keyframes, and the `max-width: 1023px` / `min-width: 1024px` media blocks (AppShell owns them); keep `.page-content` padding only if AppShell `contentPadding` does not cover it.
- [ ] Manual pass: desktop ≥1024px — sidebar visible, no burger; phone/tablet ≤1023px — burger opens the drawer, drawer closes on route change, **no overlay/backdrop at ≥1024px**; logout works; language switcher works; no hydration warnings at desktop and phone widths (Review Focus #2).
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green; `pnpm build` succeeds.
- [ ] Commit `feat(dashboard): app shell on Astryx AppShell`.

### Task 4: Keys page + shared components

**Files:** `app/components/{PageHeader,Filters,StatusBadge,SolutionLabel,PlatformIcon,CopyButton,EmptyState,Pagination,KeyActions}.tsx`, `app/routes/keys.tsx`.

- [ ] Migrate the leaf components (spec §5 map; verify each API against installed types):
  - `PageHeader`: HStack + Heading + Text.
  - `StatusBadge`: Astryx Badge — map `KEY_STATUS_COLORS` / `USER_STATUS_COLORS` (gray/green/amber/red) onto Astryx's color API with the same visual semantics.
  - `SolutionLabel`: HStack + Text + PlatformIcon.
  - `PlatformIcon`: Astryx Tooltip + Icon; keep the cube SVG, brand colors, aria-label and `focusable` behavior.
  - `CopyButton`: IconButton + Tooltip (lucide `Copy`/`Check`), same copied-state timing.
  - `EmptyState`: Astryx EmptyState.
  - `Pagination`: Astryx Pagination or a Button pair — either way keep the existing href logic (page param preserved alongside other query params).
- [ ] `Filters.tsx`: date fields → TextInput `type="date"`; selects → Astryx **Selector with `htmlName`** so the native GET form submits each value into the URL query (the hidden-input behavior verified in Task 1); email field → TextInput with search icon; Apply/Reset buttons and the `key={location.search}` remount kept.
- [ ] `KeyActions.tsx`: Astryx DropdownMenu (row actions), AlertDialog (regenerate confirm), Dialog (activation-limit edit) with the `fetcher.Form` inside; intents, busy state and `useActionToast` unchanged.
- [ ] `keys.tsx`: Astryx Table + GetKeyDialog (Astryx Dialog, solution store links); loader/action untouched.
- [ ] Manual pass, RU and EN: table renders with badges/icons/copy; row actions work end-to-end (regenerate confirm → toast, activate/deactivate, extend for expired); **GET filter: applying "Status = Active" lands on `?status=active` and shows filtered rows** (Review Focus #3); reset clears the query; pagination keeps other filters; empty state shows when a filter matches nothing.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green; `pnpm build` succeeds.
- [ ] Commit `feat(dashboard): keys page on Astryx`.

### Task 5: Support page

**Files:** `app/routes/support.tsx`, `app/components/AttachmentPicker.tsx`, `app/app.css`.

- [ ] `support.tsx`: FAQ → Astryx **Collapsible** (single-collapsible behavior per installed API; chevron rotation from the component or re-tokenized `.faq-*` rules — decide from the installed API); AskQuestionDialog → Astryx Dialog with topic Selector (`htmlName="topic"` so the multipart submission carries it), TextArea, AttachmentPicker, Send button. Loader/action, limits and all i18n keys unchanged.
- [ ] `AttachmentPicker.tsx`: re-tokenize onto Astryx variables (drop zone, file list, lucide icons, remove IconButton); keep every limit/validation behavior (`addAttachments`), the drag state, and per-file error lines unchanged.
- [ ] `app/app.css`: re-tokenize the `.attach-*` rules onto Astryx variables; delete any rule a component now covers.
- [ ] Manual pass, RU and EN: FAQ expands/collapses (single-open behavior as today); ask-question dialog: topic select, description min-length validation message in the page language, add/remove/drag-drop attachments with per-file errors, send → success toast and dialog closes; cancelled dialog resets files.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green; `pnpm build` succeeds.
- [ ] Commit `feat(dashboard): support page on Astryx`.

### Task 6: Admin pages

**Files:** `app/components/{Kpi,ChartCard,Charts}.tsx`, `app/routes/{admin.dashboard,admin.stats,admin.keys,admin.customers}.tsx`.

- [ ] `Kpi.tsx`: Astryx Card + Text (number formatting unchanged).
- [ ] `ChartCard.tsx`: Astryx SegmentedControl chart/table switch + Astryx Table view; the recharts `children` contract and the post-hydration mount guard are **untouched**.
- [ ] `Charts.tsx` (judgment-call assignment — imports Radix primitives, used only here): re-express the `ChartTooltip` chrome (Card/Flex/Text) in Astryx; every recharts prop unchanged.
- [ ] `admin.dashboard.tsx`: Astryx Grid + Kpi tiles.
- [ ] `admin.stats.tsx`: Heading + Divider sections, Filters (reused), ChartCards; charts still render after hydration only.
- [ ] `admin.keys.tsx`: Astryx Table reusing Task 4 components; `KeyActions` with `canEditLimit` → limit dialog works from the admin table too.
- [ ] `admin.customers.tsx`: Astryx Table + UserStatusBadge; CustomerActions DropdownMenu (per-status items, separator before danger) + AlertDialog confirmations for block/remove; `ACTIONS`/`CONFIRM` maps and fetcher logic unchanged.
- [ ] Manual pass, RU and EN: KPI tiles; chart/table switch on every chart (table view shows the same rows); stats filters work; admin keys limit dialog saves → toast; customer status actions confirm → toast; blocked/removed states render correctly.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green; `pnpm build` succeeds.
- [ ] Commit `feat(dashboard): admin pages on Astryx`.

### Task 7: Remove Radix and finish

**Files:** `apps/dashboard/package.json`, `app/root.tsx`, `app/app.css`, `app/routes.ts`, `app/routes/spike.tsx` (DELETE), any file still importing Radix.

- [ ] Migrate every remaining Radix import — `grep -rn "radix" apps/dashboard/app` must return nothing.
- [ ] `root.tsx`: drop the Radix `<Theme>` and the `@radix-ui/themes/styles.css` import; re-express `ErrorBoundary` with Astryx Card/Text/Button (stack block kept in dev); loader/meta/links unchanged.
- [ ] DELETE `app/routes/spike.tsx` and its `routes.ts` entry.
- [ ] `package.json`: remove `radix-ui`, `@radix-ui/themes`, `@radix-ui/react-icons`; run `pnpm install`.
  - Expected: `grep -c "radix" pnpm-lock.yaml` is 0 (no radix occurrences at all).
- [ ] `app/app.css`: delete the Radix `--cursor-*` override block and any remaining Radix-variable references; re-tokenize what stays onto Astryx variables. Target: a small file of app-specific rules only.
- [ ] Full verification: dashboard `pnpm typecheck && pnpm lint && pnpm test` green; **full monorepo** `pnpm build` (api, dashboard, docs) succeeds; no console errors or hydration warnings on first paint of any route (Review Focus #1).
- [ ] Smoke pass, RU and EN: login flow incl. OTP auto-submit and paste → keys page (filters into URL query, row actions, copy, get-key dialog) → support (FAQ, ask question with attachments) → admin dashboard/stats/keys/customers → language switcher → logout.
- [ ] Commit `refactor(dashboard): remove Radix and finish Astryx migration`.
