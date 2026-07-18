# Acme Cloudflare Stack Conventions

## Naming And Stages

`app.name` is `acme` only. Never embed a stage in the app name. SST scopes
state by `<app>/<stage>`, and Cloudflare resource names use
`${$app.name}-${$app.stage}-${base}` so `prod` and `staging` can share one
account without collisions.

## No Hardcoded Infrastructure IDs

Do not commit Cloudflare account IDs, database IDs, queue IDs, or generated
resource names. SST creates and owns resources by logical name. `wrangler.jsonc`
contains placeholders only for local development.

## State Drift

Do not use `opts.import`, `retainOnDelete`, or `ignoreChanges` to hide drift.
Fix state at the source, or rename the SST app to create a fresh empty state and
restore data into the new resources.

## Provider Pinning

Keep `sst.config.ts` `providers.cloudflare` pinned to the same version as the
root `@pulumi/cloudflare` devDependency. Version drift can create silent schema
errors in deploys.

## Compatibility Date

The SST Worker compatibility date and `apps/api/wrangler.jsonc`
`compatibility_date` must stay in sync. SST's internal default may lag
Cloudflare's current Worker runtime.

## GitHub Environments

The deploy job declares `environment: production`. GitHub Environment-scoped
vars and secrets override repo-level values there. Setting repo-level values is
a silent no-op for that job. Use:

```sh
gh variable set PRODUCTION_D1_DB_NAME --env production
gh secret set CLOUDFLARE_D1_DATABASE_ID --env production
```

## New Cloudflare Account Checklist

1. Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Deploy with `pnpm deploy`.
3. Capture the new D1 name and ID.
4. Set CI vars/secrets on the production GitHub Environment.
5. Restore data with `pnpm db:restore <backup.sql>`.
6. Cut DNS after smoke checks pass.

## Good-To-Have Guardrails

- Run `pnpm verify:template` after changing infra, package pins, or docs.
- Run `pnpm api:openapi` after changing public API routes or schemas.
- Keep PR preview stages disposable and stage-scoped as `pr-<number>`.
- Review Renovate updates for SST, Pulumi Cloudflare, Wrangler, Workers types,
  and TypeScript together.
- Update `docs/adr/` when changing the operating model, not just code.

## Agent Skills

Recommended project skills are vendored in `agent-skills/` and documented in
`docs/agent-skills.md`. Run `pnpm skills:install` after cloning to copy them
into the local agent skills directory, and run `pnpm verify:skills` before
removing or refreshing any vendored skill.

Default skill routing for this repo:

- Cloudflare infra or Worker code: use `cloudflare`, `wrangler`, and
  `workers-best-practices`.
- Security-sensitive changes: use `security-review`.
- UI polish or SPA interaction work: use `impeccable`,
  `vercel-react-best-practices`, and `webapp-testing`.
- New feature planning: use `grill-me`, `to-spec`, and `to-tickets`.
- Debugging: use `diagnosing-bugs`.
