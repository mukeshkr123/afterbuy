# Agent Guide

This repository is a reusable Cloudflare full-stack template. Keep it
infrastructure-neutral, provider-neutral above Cloudflare, and safe to copy into
new projects.

## Project Skills

Reusable agent skills are vendored in `agent-skills/`. Install them into your
agent's local skills directory with:

```sh
pnpm skills:install
```

The default target is `~/.agents/skills`. Use `AGENT_SKILLS_DIR` for another
agent layout:

```sh
AGENT_SKILLS_DIR="$HOME/.codex/skills" pnpm skills:install
```

Verify the vendored pack with:

```sh
pnpm verify:skills
```

Read `docs/agent-skills.md` for the full skill list and routing guide.

## Core Guardrails

- Do not hardcode Cloudflare account IDs, database IDs, queue IDs, or generated
  resource names.
- Keep `app.name` exactly `acme`.
- Keep deployable resource names stage-scoped through
  `${$app.name}-${$app.stage}-${base}`.
- Do not use `opts.import`, `retainOnDelete`, or `ignoreChanges` as state drift
  band-aids.
- Keep the SST Cloudflare provider pin synced with `@pulumi/cloudflare`.
- Keep Worker compatibility dates synced between SST infra and Wrangler config.
- Prefer `sst deploy` for real infrastructure; committed Wrangler config is
  local/direct-Wrangler only.

## Checks

Run the full local gate before handing off:

```sh
pnpm run ci
```
