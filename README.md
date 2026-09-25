# KHDev Keys

Invite-only admin panel for the license keys of KHDev plugins (1С-Битрикс, WordPress, OpenCart, Shopify).

| App              | Stack                                             | Port |
| ---------------- | ------------------------------------------------- | ---- |
| `apps/api`       | Fastify 5, Drizzle ORM, PostgreSQL                 | 3001 |
| `apps/dashboard` | React Router 8 (Remix successor, BFF), Radix Themes | 3000 |
| `apps/docs`      | Docusaurus 3                                      | 3002 |

Shared packages: `packages/contracts` (Zod schemas and types), `packages/eslint-config`, `packages/typescript-config`.

- API contracts: [docs/api-contracts.md](docs/api-contracts.md)
- Design: [docs/superpowers/specs/2026-09-25-khdev-keys-mvp-design.md](docs/superpowers/specs/2026-09-25-khdev-keys-mvp-design.md)

## Requirements

- Node.js 24 (`.nvmrc`), pnpm 12
- Docker (for PostgreSQL and Mailpit)

## Local setup

```bash
pnpm install
docker compose up -d                  # Postgres on 5432, Mailpit on 1025 (UI: http://localhost:8025)

cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env

pnpm db:migrate
pnpm db:seed:dev                      # creates the local admin
pnpm dev                              # api, dashboard and docs
```

Open <http://localhost:3000>.

### Local admin

Local development only (`NODE_ENV=development` and `DEV_ADMIN_ENABLED=true` in `apps/api/.env`):

- Email: `admin@khdev.by`
- Code: `123456`

The API refuses to start if `DEV_ADMIN_ENABLED=true` is set in any other environment.

### Invite a customer

```bash
curl -X POST http://localhost:3001/api/invites \
  -H "X-Service-Token: dev-service-token-change-me" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@shop.com","platforms":["wordpress","shopify"]}'
```

The invitation and the sign-in codes arrive in Mailpit (<http://localhost:8025>).
Without Mailpit, set `MAIL_TRANSPORT=log` in `apps/api/.env` to print emails to the API log.

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Run all apps in watch mode            |
| `pnpm build`       | Build all apps                        |
| `pnpm lint`        | ESLint                                |
| `pnpm typecheck`   | TypeScript                            |
| `pnpm test`        | Vitest (API utils + every endpoint, dashboard utils) |
| `pnpm db:generate` | Generate a migration from the Drizzle schema |
| `pnpm db:migrate`  | Apply migrations                      |
| `pnpm db:seed:dev` | Create the local admin                |

API tests run against an in-memory PostgreSQL (PGlite), so they need no database or Docker.

## Versions and releases

Versions come from git tags. Pushing a tag such as `v1.2.0` runs `.github/workflows/release.yml`, which builds every
app with `APP_VERSION=1.2.0`, packages the build output and creates a GitHub release.
`GET /api/versions` returns the version, commit and build time.

```bash
git tag v1.2.0
git push origin v1.2.0
```
