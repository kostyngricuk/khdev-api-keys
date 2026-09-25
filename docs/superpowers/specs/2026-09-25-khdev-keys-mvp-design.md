# KHDev Keys — MVP Phase 1 Design

Date: 2026-09-25
Status: Approved design, pending spec review

## 1. Purpose

An invite-only admin panel where customers who bought a KHDev plugin get and manage
their license (API) keys, and where admins manage customers, keys and see statistics.
Plugins installed on customer sites call the API to validate and apply keys.

Success criteria for Phase 1:

- An invited customer can sign in with email + 6-digit code, see their keys, regenerate/extend
  them, toggle their status and send a support question.
- An admin can see all customers and keys, change customer statuses, change key status and
  per-key activation limits, and see statistics.
- A plugin can validate and apply a key; a key can be applied on at most N (default 3) distinct domains.
- Nobody can self-register; nobody can create or delete keys through the UI.

## 2. Monorepo

pnpm workspaces + Turborepo.

```text
khdev-keys/
├── apps/
│   ├── api/          Fastify 5, Drizzle ORM, PostgreSQL (only app with DB access)
│   ├── dashboard/    React Router v7 framework mode (Remix successor), Radix Themes + Icons, Recharts
│   └── docs/         Docusaurus 3 (sections: Introducing, Authentication, Get Started)
├── packages/
│   ├── contracts/        Zod schemas + inferred TS types shared by api and dashboard
│   ├── eslint-config/    Shared ESLint flat configs (base, node, react)
│   └── typescript-config/ Shared tsconfig bases (base, node, react-router)
├── docs/
│   ├── api-contracts.md  Human-readable list of all API contracts
│   └── superpowers/      Specs and plans
├── docker-compose.yml    Postgres 17 + Mailpit
└── .github/workflows/    ci.yml, release.yml
```

UI components live inside each app (`apps/dashboard/app/components`, `apps/docs/src/components`);
they are not shared. There are no landing pages.

Local ports: dashboard 3000, api 3001, docs 3002, Postgres 5432, Mailpit SMTP 1025 / UI 8025.

## 3. Architecture

- **Dashboard is a BFF.** All data access happens in React Router loaders/actions on the server,
  which call the API over HTTP. The browser never calls the API directly.
- **Sessions.** On successful code verification the API returns an opaque random token
  (stored as SHA-256 hash in `sessions`, TTL 30 days). The dashboard stores it in an
  httpOnly, secure, sameSite=lax cookie session and forwards it as `Authorization: Bearer <token>`.
- **Authorization** is enforced in the API on every route (role + ownership). The dashboard also
  hides navigation and guards routes by role, for UX only.
- **Service token.** `POST /api/invites` also accepts `X-Service-Token` (env `SERVICE_TOKEN`) so an
  external shop or sales system can invite buyers.
- **Email** via Nodemailer over SMTP. Mailpit locally.
- **Validation** with Zod schemas from `@khdev/contracts`, wired into Fastify via
  `fastify-type-provider-zod`.
- **Errors** use one shape: `{ "error": { "code": "USER_BLOCKED", "message": "..." } }`.
- **Versions.** Git tags `vX.Y.Z` are the source of truth. `release.yml` builds on tag push and
  injects `APP_VERSION` and `GIT_SHA`. Locally the version falls back to `git describe --tags`,
  then to `0.0.0-dev`.

## 4. Data Model (PostgreSQL, Drizzle)

Enums:

- `user_role`: `customer`, `admin`
- `user_status`: `inactive`, `active`, `blocked`, `removed`
- `platform`: `bitrix`, `wordpress`, `opencart`, `shopify`
- `key_status`: `inactive`, `active`, `expired`

Tables:

| Table | Columns |
|-------|---------|
| `users` | `id` uuid pk, `email` citext, `role`, `status`, `invited_at`, `last_login_at` null, `created_at`, `updated_at` |
| `api_keys` | `id` uuid pk, `user_id` fk, `platform`, `key` unique, `status`, `activation_limit` int default 3, `expires_at`, `created_at`, `regenerated_at` null |
| `key_activations` | `id`, `key_id` fk cascade, `domain`, `activated_at`; unique (`key_id`, `domain`) |
| `login_codes` | `id`, `user_id` fk, `code_hash`, `expires_at`, `attempts` int, `consumed_at` null, `created_at` |
| `sessions` | `id`, `user_id` fk, `token_hash` unique, `expires_at`, `created_at` |
| `support_tickets` | `id`, `user_id` fk, `topic`, `description`, `created_at` |
| `ticket_attachments` | `id`, `ticket_id` fk cascade, `file_name`, `mime_type`, `size`, `storage_path` |

- `users.email` has a **partial unique index** `WHERE status <> 'removed'`, so a removed user can be
  re-invited as a new row (new id, status `inactive`) while the old row stays for history.
- Activation count for a key = number of `key_activations` rows.

## 5. Business Rules

### 5.1 Users

| Status | Set by | Sign-in behaviour |
|--------|--------|-------------------|
| `inactive` | Invite | Allowed; becomes `active` on first successful code verification |
| `active` | First login, or admin | Allowed |
| `blocked` | Admin | Request-code returns `403 USER_BLOCKED`; no code is sent |
| `removed` | Admin | Request-code returns `404 USER_NOT_FOUND` (same as unknown email) |

- Admin can set a customer to `inactive`, `active`, `blocked`, or `removed`. Admins cannot change
  other admins through the API. Blocking or removing deletes the user's sessions.
- Keys of `blocked` or `removed` users fail validate/apply with `USER_BLOCKED` / `KEY_NOT_FOUND`.

### 5.2 Invites

`POST /api/invites` `{ email, platforms: Platform[] (min 1) }`, auth: admin session or service token.

- No non-removed user with that email: create user (`customer`, `inactive`) and one `inactive` key
  per platform entry, then send the invite email.
- Existing `inactive`/`active` user: add one key per platform entry, then send the "new key"
  email (the invite email if still `inactive`).
- Existing `blocked` user: `409 USER_BLOCKED`.
- Invite email contains: login link (`DASHBOARD_URL/login?email=...`), short instructions,
  documentation link (`DOCS_URL`), welcome video link (`WELCOME_VIDEO_URL`).

### 5.3 Login Codes

- 6 random digits (crypto), stored hashed (SHA-256 with `AUTH_CODE_PEPPER`), TTL 10 min.
- Requesting a new code invalidates previous unconsumed codes. Resend is allowed after 60 s
  (`429 CODE_RESEND_TOO_SOON`).
- Max 5 wrong attempts per code, then `CODE_ATTEMPTS_EXCEEDED` and a new code is needed.
- Wrong code: `401 CODE_INVALID`; expired: `401 CODE_EXPIRED`.
- On success: consume the code; if the user is `inactive`, set them `active` and set all their
  `inactive` keys to `active` (first-login activation); set `last_login_at`; create a session.
- Keys added by an invite to a user who is already `active` are created `active`.

### 5.4 Dev Admin (local development only)

- `pnpm db:seed:dev` upserts `admin@khdev.by` (`admin`, `active`). It refuses to run unless
  `NODE_ENV=development`.
- When `NODE_ENV=development` and `DEV_ADMIN_ENABLED=true`, `/api/auth/verify-code` accepts the
  fixed code `123456` for `admin@khdev.by` only. Normal codes keep working.
- The API refuses to start if `DEV_ADMIN_ENABLED=true` and `NODE_ENV` is not `development`.
- An endpoint test asserts the fixed code is rejected when `NODE_ENV=production`.

### 5.5 API Keys

Format: `QQQQ-WWWW-EEEE-RRRR-TTTT-YYYY`, uppercase.

- `Q`, `W`, `E`, `R`: first 4 hex chars of 4 independent `crypto.randomUUID()` values.
- `T`: creation date, `Y`: expiry date. Each is a 4-char, zero-padded base36 count of days since
  1970-01-01 UTC (for example 2026-09-25 is `0FZL`).
- Masked form (admin views): first 4 and last 4 chars, for example `A1B2…0G3K`.

Rules:

- Term: fixed, `KEY_TERM_DAYS` (default 365). `expires_at = created_at + term`.
- Keys are created only by invites (purchase). No create or delete endpoints exist.
- Status transitions:
  - `inactive → active` on the customer's first login, or manually by the customer or admin.
  - `active ↔ inactive` manually by the customer (own keys) or admin.
  - `* → expired` automatically once `expires_at < now`. Expiry is materialized by an
    `UPDATE ... WHERE expires_at < now() AND status <> 'expired'` run before key reads and in
    validate/apply.
- **Regenerate** (owner or admin, any non-expired key): new Q/W/E/R and new T; Y and `expires_at`
  unchanged; deletes all activations (limit resets); sets `regenerated_at`.
- **Extend** (owner or admin, expired keys only): `expires_at = max(now, expires_at) + term`,
  key string gets a new Y segment, status becomes `active`.
- **Activation limit**: admin can set `activation_limit` (1–100) per key.
- **Validate** `POST /api/keys/validate` `{ key, domain }`, public, read-only:
  returns `{ valid, status, platform, expiresAt, activationsUsed, activationLimit, activatedOnDomain }`.
- **Apply** `POST /api/keys/apply` `{ key, domain }`, public:
  - Domain is normalized (lowercase, no scheme, no `www.`, no port, no path).
  - Key not found: `404 KEY_NOT_FOUND`. Inactive: `409 KEY_INACTIVE`. Expired: `409 KEY_EXPIRED`.
  - Domain already activated: `200` with no count change.
  - `activationsUsed >= activation_limit`: `409 ACTIVATION_LIMIT_REACHED`.
  - Otherwise insert the activation (in a transaction with row lock) and return the same shape as validate.
- Validate/apply are rate-limited per IP (`@fastify/rate-limit`, 60/min); auth endpoints 10/min.

### 5.6 Support

- FAQs are static content in the dashboard (`app/content/faqs.ts`).
- `POST /api/support/tickets` (multipart): `topic` (`installation`, `activation`, `billing`,
  `bug`, `other`), `description` (10–5000 chars), up to 3 files, 5 MB each, types
  png/jpeg/pdf/zip/txt. Files are stored under `UPLOAD_DIR`. The ticket is stored, and a
  notification email with attachments goes to `SUPPORT_EMAIL`.

## 6. API Endpoints

Prefix `/api`. Full request/response contracts live in `docs/api-contracts.md`.

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | public |
| GET | `/versions` | public |
| POST | `/auth/request-code` | public |
| POST | `/auth/verify-code` | public |
| POST | `/auth/logout` | session |
| GET | `/auth/me` | session |
| POST | `/invites` | admin or service token |
| GET | `/keys` | customer (own keys) |
| POST | `/keys/:id/regenerate` | owner or admin |
| POST | `/keys/:id/extend` | owner or admin |
| PATCH | `/keys/:id/status` | owner or admin |
| POST | `/keys/validate` | public (plugins) |
| POST | `/keys/apply` | public (plugins) |
| POST | `/support/tickets` | customer |
| GET | `/admin/keys` | admin |
| PATCH | `/admin/keys/:id/activation-limit` | admin |
| GET | `/admin/customers` | admin |
| PATCH | `/admin/customers/:id/status` | admin |
| GET | `/admin/stats` | admin |

List endpoints accept `dateFrom`, `dateTo` (ISO date, filters `created_at`, inclusive), `platform`,
`status`, `page` (default 1), `pageSize` (default 20, max 100). `/admin/customers` also accepts
`email` (substring, case-insensitive), where `platform` means "has a key for platform".
They return `{ items, total, page, pageSize }`.

`GET /versions` returns `{ api, dashboard, docs, commit, builtAt }`.

`GET /admin/stats` (with the same date/platform filters) returns: customers by status,
keys by status, keys by platform, total activations, keys created per month.

## 7. Dashboard

Routes (React Router v7, `app/routes.ts`):

| Route | Access | Content |
|-------|--------|---------|
| `/login` | guest | Email field. After a successful request-code, shows the 6-digit code input (Radix `OneTimePasswordField` or 6 inputs), a resend button with 60 s countdown, and an errors area |
| `/` | any user | Redirects to `/keys` (customer) or `/admin/keys` (admin) |
| `/keys` | customer | Filters + table (full key with copy button, platform, status, activations `n/limit`, created, expires) + row actions: Regenerate, Extend (expired only), Activate/Deactivate. The "+" button opens a "Get a new key" dialog with store links per platform (`STORE_URL_*` env) |
| `/support` | customer | FAQ accordion + "Ask Question" dialog (topic select, description, file attachments) |
| `/admin/keys` | admin | Filters + table (masked key, email, platform, status, activations, expires) + actions: Regenerate, Extend, change status, edit activation limit |
| `/admin/customers` | admin | Filters (with Email) + table (email, status, keys count, invited, last login) + status select |
| `/admin/stats` | admin | Filters + KPI tiles + charts: keys by platform (bar), keys by status (donut), customers by status (donut), keys created per month (line) |
| `/logout` | action | Calls API logout, destroys cookie |

Layout:

- Left sidebar: main navigation filtered by role. The "Documentation" link to `DOCS_URL`
  (opens in a new tab) is pinned to the bottom.
- Top bar, right corner: role badge, round avatar with the first letter of the email, full email,
  exit icon button.
- Filters: DateFrom, DateTo, Platform, Status, plus Email on the Customers page only. Filters are
  kept in URL search params, so loaders read them and pages can be shared.

Colors (defined once in `app/lib/colors.ts`):

- Platforms (brand): 1С-Битрикс `#E30613`, WordPress `#21759B`, OpenCart `#23A1D1`, Shopify `#95BF47`.
- User status: inactive gray, active green, blocked amber, removed red.
- Key status: inactive gray, active green, expired red.
- Radix Themes `Badge` colors are used for statuses; brand hex colors for platform badges and charts.

## 8. Docs App

Docusaurus 3, docs-only mode (`routeBasePath: '/'`, no blog, no landing page). Sidebar sections:

1. Introducing: what KHDev Keys is, roles, key lifecycle.
2. Authentication: the invite, email + 6-digit code sign-in, blocked/removed behaviour.
3. Get Started: find your key, apply it in the plugin, 3-domain activation limit, regenerate/extend.

## 9. Testing

- Vitest across the workspace (`turbo run test`).
- **Utils unit tests**: key generate/parse/mask, base36 date encode/decode, domain normalization,
  OTP generate/hash/compare, filter-to-query parsing, config guard (dev admin), dashboard
  formatters.
- **Endpoint tests**: one file per route module, covering every endpoint in section 6, via
  `app.inject()` against PGlite (in-memory Postgres through `drizzle-orm/pglite`). Migrations are
  applied per test file and the mailer is replaced with an in-memory fake. No Docker is needed for tests.
- No component or E2E tests in Phase 1.

## 10. Configuration (API env)

`NODE_ENV`, `PORT`, `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`MAIL_FROM`, `SUPPORT_EMAIL`, `DASHBOARD_URL`, `DOCS_URL`, `WELCOME_VIDEO_URL`, `SERVICE_TOKEN`,
`AUTH_CODE_PEPPER`, `KEY_TERM_DAYS`, `UPLOAD_DIR`, `DEV_ADMIN_ENABLED`, `APP_VERSION`, `GIT_SHA`.
Validated at startup with Zod; startup fails on invalid config.

Dashboard env: `API_URL`, `SESSION_SECRET`, `DOCS_URL`, `STORE_URL_BITRIX`, `STORE_URL_WORDPRESS`,
`STORE_URL_OPENCART`, `STORE_URL_SHOPIFY`.

## 11. CI/CD

- `ci.yml` on PR and push: pnpm install, lint, typecheck, test, build (Turbo cache).
- `release.yml` on tag `v*.*.*`: the same checks, then build with `APP_VERSION=${tag#v}` and
  `GIT_SHA`, then create a GitHub Release. Deployment targets are out of scope for Phase 1.

## 12. Out of Scope (Phase 1)

Payment or shop integration (beyond the invite endpoint), admin invite UI, ticket replies UI,
deactivating single domains, S3 storage, i18n, E2E tests, deployment.
