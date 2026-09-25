# KHDev Keys MVP Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the invite-only license-key admin panel: a Turborepo with a Fastify API (Drizzle/Postgres), a React Router BFF dashboard (Radix Themes) and a Docusaurus docs site.

**Architecture:** `apps/api` owns the database and all business rules and exposes JSON endpoints under `/api`.
`apps/dashboard` is a server-rendered BFF: loaders/actions call the API with a Bearer session token kept in an httpOnly cookie.
`packages/contracts` holds the Zod schemas and types used by both.

**Tech Stack:** pnpm 12 workspaces, Turborepo 2, Node 24, TypeScript 6.0 (typescript-eslint caps TS below 6.1), Fastify 5,
fastify-type-provider-zod 7, Zod 4, Drizzle ORM 0.45 + drizzle-kit, postgres-js, PGlite (tests), Nodemailer, React Router 8
(framework mode, the Remix successor), Radix Themes 3 + Radix Icons, Recharts 3, Docusaurus 3, Vitest 5, ESLint 10 flat config.

**Spec:** `docs/superpowers/specs/2026-09-25-khdev-keys-mvp-design.md`

## Global Constraints

- API prefix `/api`. Error shape: `{ "error": { "code": "UPPER_SNAKE", "message": "..." } }`.
- Key format `QQQQ-WWWW-EEEE-RRRR-TTTT-YYYY`, uppercase; T/Y = 4-char zero-padded base36 days since 1970-01-01 UTC.
- Default activation limit 3 (admin-settable 1–100); `KEY_TERM_DAYS` default 365.
- Platforms: `bitrix` (label "1С-Битрикс", `#E30613`), `wordpress` (`#21759B`), `opencart` (`#23A1D1`), `shopify` (`#95BF47`).
- Login code: 6 digits, 10 min TTL, 60 s resend cooldown, 5 attempts.
- Dev admin `admin@khdev.by` with fixed code `123456` only when `NODE_ENV=development` and `DEV_ADMIN_ENABLED=true`.
- Only the API touches the DB; UI components stay inside each app, and no landing pages.
- Docs site sections: Introducing, Authentication, Get Started only. Contracts live in `docs/api-contracts.md`.
- Tests: utils + every endpoint. No component or E2E tests.
- Ports: dashboard 3000, api 3001, docs 3002.

## Review Focus

1. **Email case/whitespace:** `" Admin@KHDev.by "` must match `admin@khdev.by` everywhere (invite, login, filters). Normalized in contracts via `emailSchema`; tested in the auth and invite tests.
2. **Concurrent apply on the last free slot:** two domains racing for activation 3/3 must not both succeed. Handled with `SELECT ... FOR UPDATE` on the key row inside a transaction; tested by sequential apply beyond the limit, with the lock reviewed in code.
3. **Domain variants:** `https://www.Shop.com:443/path` and `shop.com` are the same activation. Tested in the `normalizeDomain` utils test and in the apply endpoint test (re-apply costs nothing).
4. **Re-invite after removal:** same email, removed row kept, new user row has a new id and is `inactive`, and old keys stay unreachable. Tested in the invites test.
5. **Customer tampering:** a customer regenerating or toggling another customer's key id must get `404 KEY_NOT_FOUND` (no existence leak). Tested in the keys test.

---

## File Map

```text
package.json, pnpm-workspace.yaml, turbo.json, .gitignore, .nvmrc, .env.example, docker-compose.yml, README.md
packages/typescript-config/{package.json,base.json,node.json,react-router.json}
packages/eslint-config/{package.json,base.js,node.js,react.js}
packages/contracts/src/{index.ts,enums.ts,common.ts,auth.ts,keys.ts,admin.ts,invites.ts,support.ts,system.ts}
apps/api/
  drizzle.config.ts, vitest.config.ts, drizzle/ (generated SQL)
  src/server.ts                 start the HTTP server
  src/app.ts                    buildApp(deps): FastifyInstance
  src/config.ts                 loadConfig(env): Config (+ dev-admin guard)
  src/db/{schema.ts,client.ts,types.ts}
  src/lib/{errors.ts,key.ts,domain.ts,otp.ts,filters.ts,version.ts,crypto.ts}
  src/mail/{mailer.ts,templates.ts}
  src/plugins/auth.ts           request.user, app.requireAuth / requireRole
  src/services/{users.ts,keys.ts,stats.ts}
  src/routes/{system.ts,auth.ts,invites.ts,keys.ts,plugin.ts,admin-keys.ts,admin-customers.ts,admin-stats.ts,support.ts}
  src/scripts/seed-dev.ts
  test/helpers.ts               createTestApp() with PGlite + fake mailer
  test/lib/*.test.ts            utils tests
  test/routes/*.test.ts         endpoint tests
apps/dashboard/
  react-router.config.ts, vite.config.ts, vitest.config.ts
  app/root.tsx, app/routes.ts, app/app.css
  app/lib/{api.server.ts,session.server.ts,auth.server.ts,colors.ts,format.ts,filters.ts,env.server.ts}
  app/components/{AppLayout.tsx,Sidebar.tsx,TopBar.tsx,Filters.tsx,StatusBadge.tsx,PlatformBadge.tsx,Pagination.tsx,KeyActions.tsx,EmptyState.tsx}
  app/content/faqs.ts
  app/routes/{login.tsx,logout.tsx,layout.tsx,home.tsx,keys.tsx,support.tsx,admin.keys.tsx,admin.customers.tsx,admin.stats.tsx}
  test/*.test.ts                utils tests
apps/docs/ (Docusaurus, docs-only)
docs/api-contracts.md
.github/workflows/{ci.yml,release.yml}
```

---

### Task 1: Monorepo foundation

**Files:** Create the root files, `packages/typescript-config/*` and `packages/eslint-config/*`.

- [ ] Root `package.json` (`private`, `packageManager: pnpm@12.6.0`, `engines.node >=22.22`), with scripts `dev`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:seed:dev`, all via `turbo run`.
- [ ] `pnpm-workspace.yaml` with `apps/*` and `packages/*`. `turbo.json` tasks: `build` (dependsOn `^build`, outputs `dist/**`, `build/**`), `dev` (persistent, no cache), `lint`, `typecheck` (dependsOn `^build`), `test`.
- [ ] `docker-compose.yml`: `postgres:17` (db `khdev_keys`, user/pass `khdev`) and `axllent/mailpit` (1025/8025).
- [ ] tsconfig bases: `base.json` (strict, ES2022, `moduleResolution: bundler`, `noUncheckedIndexedAccess`), `node.json` (NodeNext), `react-router.json` (jsx react-jsx, DOM libs).
- [ ] ESLint flat configs: `base.js` (js recommended + typescript-eslint recommended), `node.js`, `react.js` (react-hooks).
- [ ] `pnpm install` succeeds. Commit `chore: scaffold turborepo foundation`.

### Task 2: Contracts package

**Files:** `packages/contracts/src/*.ts`, `packages/contracts/package.json` (built with `tsc` to `dist`, exports `./dist/index.js`).

**Produces:**
- `PLATFORMS`, `platformSchema`, `USER_ROLES`, `USER_STATUSES`, `userStatusSchema`, `KEY_STATUSES`, `keyStatusSchema`, `SUPPORT_TOPICS`.
- `emailSchema` (trim + lowercase + email).
- `listQuerySchema` (`dateFrom`, `dateTo` as ISO date strings, `page`, `pageSize`), `paginated(item)`.
- `requestCodeBody`, `verifyCodeBody`, `authUser`, `verifyCodeResponse { token, user }`.
- `keyQuery`, `customerKey`, `adminKey`, `keyStatusBody`, `activationLimitBody`, `validateBody`, `validateResponse`.
- `customerQuery`, `adminCustomer`, `customerStatusBody`, `statsQuery`, `statsResponse`, `inviteBody`, `inviteResponse`, `versionsResponse`, `errorResponse`.
- All `z.infer` types, exported as PascalCase (`AuthUser`, `CustomerKey`, `AdminKey`, …).

- [ ] Write schemas. Build. Commit `feat(contracts): shared zod schemas`.

### Task 3: API utils (TDD)

**Files:** `apps/api/src/lib/{key,domain,otp,filters,crypto,errors,version}.ts`, `apps/api/test/lib/*.test.ts`.

**Produces:**
- `encodeDay(date): string`, `decodeDay(s): Date`.
- `generateKey(createdAt, expiresAt): string`, `rebuildKeyExpiry(key, expiresAt): string`.
- `parseKey(s): { random: string[]; createdAt: Date; expiresAt: Date } | null`, `isKeyFormat(s)`, `maskKey(key): string` (`ABCD…WXYZ`).
- `normalizeDomain(input): string | null`.
- `generateCode(): string` (6 digits), `hashSecret(value, pepper): string`, `safeEqual(a, b)`.
- `generateToken(): string` (32 random bytes, base64url).
- `AppError(status, code, message)` and helpers `notFound`, `forbidden`, `conflict`, `unauthorized`, `tooMany`.
- `resolveVersions(env): VersionsResponse`.

Tests (write first, see them fail, implement, see them pass):

- `encodeDay(new Date('2026-09-25'))` is `'0FZL'`, and a round-trip gives the same UTC day.
- `generateKey` matches `/^[0-9A-F]{4}(-[0-9A-F]{4}){3}-[0-9A-Z]{4}-[0-9A-Z]{4}$/`; 1000 keys are unique; T and Y decode to the input days.
- `maskKey('A1B2-...-0G3K')` is `'A1B2…0G3K'`.
- `parseKey` returns null for bad shapes and lowercase input is accepted (uppercased).
- `normalizeDomain`: `https://www.Shop.com:443/path?q` gives `shop.com`, `sub.shop.com` stays `sub.shop.com`, `''` and `'not a domain'` give null, `localhost` is allowed.
- `generateCode` is always 6 digits (1000 samples); `hashSecret` is deterministic and differs by pepper.
- `resolveVersions` uses `APP_VERSION`, otherwise falls back to `0.0.0-dev`.

- [ ] Commit `feat(api): core utils with tests`.

### Task 4: API config, DB schema, app factory, auth plugin, test harness

**Files:** `src/config.ts`, `src/db/*`, `drizzle.config.ts`, `drizzle/*` (generated), `src/mail/mailer.ts`, `src/plugins/auth.ts`, `src/app.ts`, `src/server.ts`, `test/helpers.ts`, `test/lib/config.test.ts`.

**Produces:**
- `loadConfig(env: NodeJS.ProcessEnv): Config`. It throws when `DEV_ADMIN_ENABLED=true` and `NODE_ENV !== 'development'`.
- `Database` type (`PgDatabase` union for postgres-js and PGlite).
- `Mailer { send(msg: MailMessage): Promise<void> }`, `createSmtpMailer(config)`, `createMemoryMailer()` (with `.sent: MailMessage[]`).
- `buildApp({ config, db, mailer }): Promise<FastifyInstance>`, which registers the zod compilers, error handler, rate-limit (disabled when `config.isTest`), multipart and all routes.
- Request decoration `request.user: { id, email, role, status } | null`. Pre-handlers `app.authenticate`, `app.requireRole('admin' | 'customer')`.
- `createTestApp(overrides?): Promise<{ app, db, mailer, config, login(email): Promise<string>, createUser(...), createKey(...) }>`.

Schema per spec §4, with the partial unique index `users_email_active_uq ON users(email) WHERE status <> 'removed'` and the unique `(key_id, domain)`.

- [ ] Config tests: the guard throws in production with the dev flag, `KEY_TERM_DAYS` defaults to 365, and invalid `DATABASE_URL` throws.
- [ ] `pnpm --filter api db:generate` creates the initial migration. The test helper applies it through `drizzle-orm/pglite/migrator`.
- [ ] Commit `feat(api): config, schema, app factory and test harness`.

### Task 5: System and auth endpoints

**Files:** `src/routes/system.ts`, `src/routes/auth.ts`, `src/services/users.ts`, `src/mail/templates.ts`, `test/routes/system.test.ts`, `test/routes/auth.test.ts`.

Behaviour per spec §5.1, §5.3 and §5.4. Tests:

- `GET /api/health` returns 200 `{status:'ok'}`. `GET /api/versions` returns `{api,dashboard,docs,commit,builtAt}`.
- request-code:
  - Unknown email: 404 `USER_NOT_FOUND`.
  - Removed: 404 `USER_NOT_FOUND`.
  - Blocked: 403 `USER_BLOCKED` and no mail is sent.
  - Inactive or active user: 200 and one mail containing a 6-digit code.
  - A second request within 60 s: 429 `CODE_RESEND_TOO_SOON`.
  - Email `" USER@X.COM "` matches.
- verify-code:
  - A wrong code gives 401 `CODE_INVALID`; after 5 wrong codes the response is 429 `CODE_ATTEMPTS_EXCEEDED`.
  - An expired code gives 401 `CODE_EXPIRED` (use fake timers or manipulate `expires_at` in the DB).
  - A correct code gives 200 `{token,user}`: the user becomes `active` with `last_login_at` set, inactive keys become active, and the code can't be reused.
  - Blocked user: 403.
- Dev admin: `123456` works for `admin@khdev.by` with a development config and fails with 401 under production config (built with `DEV_ADMIN_ENABLED=false`).
- `GET /api/auth/me` returns 401 without a token and the user with one. `POST /api/auth/logout` makes the token invalid afterwards.
- [ ] Commit `feat(api): auth and system endpoints`.

### Task 6: Invites

**Files:** `src/routes/invites.ts`, `src/services/keys.ts` (`createKeysForUser`), `src/mail/templates.ts` (invite/new-key), `test/routes/invites.test.ts`.

Tests:

- No auth: 401. Customer session: 403. Admin session or valid `X-Service-Token`: 201.
- A new email with `['wordpress','shopify']` creates an inactive user with 2 inactive keys, and the mail contains the login link, docs link and video link.
- An existing active user gets new keys created `active`. An existing blocked user gets 409 `USER_BLOCKED`.
- Removed then re-invited: new user id, old row still `removed`, and `GET /keys` of the new user shows only the new keys.
- An empty platforms list gives 400.
- [ ] Commit `feat(api): invite endpoint`.

### Task 7: Customer key endpoints

**Files:** `src/routes/keys.ts`, `src/services/keys.ts` (`listKeys`, `refreshExpired`, `regenerateKey`, `extendKey`, `setKeyStatus`, `findAccessibleKey`), `test/routes/keys.test.ts`.

Tests:

- `GET /api/keys` returns only the caller's keys with full key strings and `activationsUsed`. Filters `platform`, `status`, `dateFrom`/`dateTo` and pagination work. Admin token: 403.
- Regenerate: the key string changes (T updated, Y unchanged) and activations reset to 0. An expired key gives 409 `KEY_EXPIRED`. Another customer's key gives 404.
- Extend: a non-expired key gives 409 `KEY_NOT_EXPIRED`. An expired key gets `expiresAt = now + term`, becomes `active` and gets a new Y segment.
- Status: `active→inactive→active` works. Setting `expired` gives 400. An expired key gives 409. Admin can change any key.
- [ ] Commit `feat(api): customer key endpoints`.

### Task 8: Plugin validate and apply endpoints

**Files:** `src/routes/plugin.ts`, `src/services/keys.ts` (`validateKey`, `applyKey`), `test/routes/plugin.test.ts`.

Tests:

- Validate on an unknown key gives 404 `KEY_NOT_FOUND`. A valid key returns `{valid:true, activationsUsed:0, activationLimit:3, activatedOnDomain:false}`. An inactive key returns `valid:false,status:'inactive'`. An expired key returns `valid:false,status:'expired'`.
- Apply on 3 distinct domains succeeds, the 4th gives 409 `ACTIVATION_LIMIT_REACHED`, and re-applying `https://www.a.com` after `a.com` stays 200 with the count unchanged.
- Apply on an inactive key gives 409 `KEY_INACTIVE`, and on an expired key 409 `KEY_EXPIRED`. An owner who is blocked gives 403 `USER_BLOCKED`. A removed owner gives 404.
- After regenerate, the old key gives 404, and the new key can be applied 3 times again.
- An admin-raised limit of 5 allows a 5th domain.
- [ ] Commit `feat(api): key validate and apply endpoints`.

### Task 9: Admin endpoints

**Files:** `src/routes/admin-keys.ts`, `src/routes/admin-customers.ts`, `src/routes/admin-stats.ts`, `src/services/stats.ts`, `test/routes/admin-*.test.ts`.

Tests:

- All admin routes return 403 for a customer and 401 without a token.
- `GET /admin/keys` returns masked keys (`key` is never the full string) plus `email`, and supports filters.
- `PATCH /admin/keys/:id/activation-limit` accepts `{limit:5}`, returns 400 for 0 or 101, and 404 for an unknown id.
- `GET /admin/customers` supports the `email` substring (case-insensitive), `status` and `platform` (has key) filters and returns `keysCount`, excluding admins.
- `PATCH /admin/customers/:id/status`:
  - `blocked` deletes the customer's sessions (their old token then gets 401).
  - `removed` means a later login gets 404.
  - Targeting an admin id gives 404.
- `GET /admin/stats` returns counts by status and platform, total activations and keys per month, respecting `dateFrom`/`dateTo`.
- [ ] Commit `feat(api): admin endpoints`.

### Task 10: Support tickets and dev seed

**Files:** `src/routes/support.ts`, `src/scripts/seed-dev.ts`, `test/routes/support.test.ts`, `test/lib/seed.test.ts`.

Tests:

- Multipart with topic, description and 2 files gives 201 `{id}`: the ticket and attachments are stored in the DB, the files are written to a temp `UPLOAD_DIR`, and the support mail has 2 attachments.
- Invalid topic: 400. Short description: 400. 4 files: 400 `TOO_MANY_FILES`. A file over 5 MB: 413 `FILE_TOO_LARGE`. An `.exe` mime type: 400 `FILE_TYPE_NOT_ALLOWED`. An admin token: 403.
- `seedDevAdmin(db, config)` upserts the admin idempotently and throws when `NODE_ENV !== 'development'`.
- [ ] Commit `feat(api): support tickets and dev admin seed`.

### Task 11: Dashboard foundation, auth and layout

**Files:** the dashboard scaffold (React Router 8 framework template), `app/lib/*`, `app/components/{AppLayout,Sidebar,TopBar}.tsx`, `app/routes/{login,logout,layout,home}.tsx`, `app/routes.ts`, `app/root.tsx` (Radix `Theme`).

**Produces:**
- `api<T>(request, path, init?)`: server-side fetch to `API_URL` with Bearer from the session. It throws `ApiError {status, code, message}`, and a 401 redirects to `/login`.
- `getSession`/`commitSession`/`destroySession` (cookie `__khdev`).
- `requireUser(request): Promise<AuthUser>` and `requireRole(request, role)`.

Behaviour:

- Login is a two-step form driven by an action `intent` (`request-code` or `verify-code`), with error messages mapped from the API codes and a resend countdown.
- Layout: sidebar navigation by role, and the Documentation link pinned to the bottom. The top bar shows the role badge, avatar letter, email and logout icon.
- [ ] Commit `feat(dashboard): auth flow and app layout`.

### Task 12: Dashboard pages

**Files:** `app/routes/{keys,support,admin.keys,admin.customers,admin.stats}.tsx` and `app/components/{Filters,StatusBadge,PlatformBadge,Pagination,KeyActions,EmptyState}.tsx`, `app/content/faqs.ts`, `app/lib/{colors,format,filters}.ts`, `test/{format,filters,colors}.test.ts`.

- [ ] Filters component in URL search params (DateFrom, DateTo, Platform, Status, and Email only on Customers).
- [ ] Keys page: table, copy button, row actions (Regenerate, Extend, Activate/Deactivate) as `<Form method="post">` with `intent`. The "+" button opens the "Get a new key" dialog.
- [ ] Support: FAQ accordion (Radix Accordion primitive) and the Ask Question dialog, sending multipart through the action to the API.
- [ ] Admin keys: masked keys, email, actions, and an activation-limit dialog. Customers: status select. Stats: KPI tiles and Recharts charts in platform/status colours.
- [ ] Utils tests: `parseFilters(url)` and `toApiQuery(filters)` drop empty values and keep Email only when allowed; `formatDate`; `platformLabel`; the status colour map is complete for every enum value.
- [ ] Commit `feat(dashboard): customer and admin pages`.

### Task 13: Docs site, API contracts, CI and README

**Files:** `apps/docs/*` (Docusaurus, docs-only, port 3002), `docs/api-contracts.md`, `.github/workflows/{ci,release}.yml`, `README.md`.

- [ ] Docs: `docs/introducing.md`, `docs/authentication.md` and `docs/get-started.md` as the only sidebar items, with no blog and no landing page (`routeBasePath: '/'`).
- [ ] `api-contracts.md`: every endpoint from spec §6 with method, path, auth, request, response and errors, in plain tables and JSON examples.
- [ ] CI: install, lint, typecheck, test, build. Release on `v*.*.*`: build with `APP_VERSION`, `GIT_SHA`, then `gh release create`.
- [ ] README: setup (docker compose, env, migrate, seed, dev) and the dev admin login.
- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, all green. Commit `docs: docs site, api contracts, ci`.
