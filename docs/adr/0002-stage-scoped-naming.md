# ADR 0002: Stage-Scoped Naming

`app.name` stays as the project slug, `acme`. Stages provide the environment
suffix.

Every named resource uses `${$app.name}-${$app.stage}-${base}` so `prod`,
`staging`, and PR stages can coexist in one Cloudflare account without name
collisions.
