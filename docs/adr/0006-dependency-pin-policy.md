# ADR 0006: Dependency Pin Policy

Cloudflare platform dependencies are pinned exactly: SST, Pulumi Cloudflare
provider, Wrangler, Workers types, Cloudflare Vitest pool, and TypeScript.

Renovate groups these updates and requires dashboard approval so schema/runtime
changes are reviewed together.
