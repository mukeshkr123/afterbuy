# Acme Cloudflare Stack

Production-ready Cloudflare full-stack monorepo template for future projects.
The SST app name is `acme`; stages supply the environment suffix.

## Stack

- pnpm workspaces, Node 22, TypeScript strict ESM
- SST v3 with `home: "cloudflare"` and Pulumi Cloudflare provider
- Hono API Worker, Vite React SPA Worker, D1, Drizzle, R2, KV, Queues, Cron
- Vitest, Cloudflare Workers test pool, ESLint 9, Prettier, Husky, GitHub Actions

## Local Development

```sh
pnpm install
pnpm skills:install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:skills
pnpm verify:template
pnpm --filter @acme/api dev
pnpm --filter @acme/web dev
```

`apps/api/wrangler.jsonc` is only for local development or direct Wrangler
testing. SST is the deployment path and creates all real infrastructure.

## First Deploy

```sh
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
pnpm validate:config
pnpm build
pnpm deploy
```

After the first deploy, copy the D1 database name and ID from Cloudflare or SST
outputs into GitHub Environment-scoped values for `production`.

## GitHub Production Values

Set these on the `production` GitHub Environment, not repo scope:

```sh
gh secret set CLOUDFLARE_ACCOUNT_ID --env production
gh secret set CLOUDFLARE_API_TOKEN --env production
gh secret set CLOUDFLARE_D1_DATABASE_ID --env production
gh variable set PRODUCTION_D1_DB_NAME --env production
gh variable set API_SMOKE_URL --env production
gh variable set WEB_SMOKE_URL --env production
```

Jobs declaring `environment: production` use Environment-scoped values. Repo
level values with the same names are ignored there.

Generate the commands for another environment:

```sh
pnpm bootstrap:github-env preview
```

## Preview Deploys

Pull requests deploy to `pr-<number>` stages through
`.github/workflows/preview.yml`. Closing the PR removes that stage. Preview
jobs use the `preview` GitHub Environment and the same Cloudflare secret names
as production.

## Stages

Production deploy:

```sh
pnpm deploy
```

Another stage:

```sh
pnpm deploy:stage staging
```

Every named resource is stage scoped through
`${$app.name}-${$app.stage}-${base}`. `sst deploy --stage staging` creates a
parallel resource set in the same Cloudflare account.

## Adding Resources

Add Cloudflare infrastructure in `infra/`, expose it through SST links or
environment variables, and avoid committed provider IDs. If a resource needs a
name, use `resourceName(base)` from `infra/env.ts`.

## Adding Secrets

Use `sst.Secret` for runtime secrets. Critical deploy-time values use
`requireEnv(name)` so deploys fail before shipping an empty binding.

## D1 Migrations

Generate append-only migrations with:

```sh
pnpm --filter @acme/db db:generate
```

CI rejects deleted or modified existing migration files. The deploy workflow
generates a temporary Wrangler config from GitHub values for D1 migration
application; no real database ID is committed.

Backup and restore drills:

```sh
pnpm db:backup
pnpm db:restore-drill backups/example.sql
pnpm db:verify-restore backups/example.sql
```

The restore drill writes reordered SQL plus a verification plan with expected
table counts and deterministic INSERT checksums.

## API Contract

Generate the OpenAPI document from the Hono routes and shared Zod schemas:

```sh
pnpm api:openapi
```

The API also serves the document at `/openapi.json`.

## Agent Skills

This template vendors its recommended agent skill pack in `agent-skills/`.
After cloning, install it into your local agent skills directory:

```sh
pnpm skills:install
pnpm verify:skills
```

See [`docs/agent-skills.md`](docs/agent-skills.md) for the skill list, usage
map, and refresh commands.

## Security Defaults

The web Worker ships strict static headers, including CSP, frame protections,
HSTS, referrer policy, and permissions policy. Review CSP before adding OAuth
providers, analytics, or third-party assets.

The API includes a small KV-backed rate-limit example on `/jobs/example`.
Disable locally with `RATE_LIMIT_ENABLED=false` only when testing the producer.

## Moving Cloudflare Accounts

1. Set a Cloudflare API token and account ID for the new account.
2. Deploy with the same app/stage or rename the SST app for a fresh state.
3. Capture the new D1 database name and ID.
4. Set production GitHub Environment vars/secrets.
5. Restore data with `pnpm db:restore <backup.sql>`.
6. Cut DNS once smoke checks pass.

Changing `app.name` creates a brand-new SST state namespace. Use that only as
the escape hatch for unrecoverable state drift.
