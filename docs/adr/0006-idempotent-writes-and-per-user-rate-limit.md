# ADR 0006: Idempotent writes and per-user rate limiting

## Context

`/v1` is the API surface for a single-tenant mobile app (Phase 5+). Writes
(`POST`, `PATCH`, `DELETE`) must be safely replayable: the mobile outbox
(Phase 8) retries on flaky networks, and the same logical action may arrive
at the server multiple times. Concurrent reads plus the per-user rate limit
on `/v1` must also share the same key space as the writes themselves.

Phase 1 left the rate-limit middleware IP-keyed and scoped only to the demo
`/jobs/example` route. With Phase 2, that route is gone and `/v1` is live
across NATs (cellular carriers, corporate networks, school campuses) where
many unrelated users share a single public IP.

## Decision

### Idempotency

All `/v1` `POST`, `PATCH`, `PUT`, `DELETE` requests require an
`Idempotency-Key: <UUIDv4/v7>` header. The middleware (`apps/api/src/idempotency.ts`)
runs after `authMiddleware`, hashes `method + path + body` with SHA-256, and
keys the cache as `idem:<user.id>:<key>` in `APP_KV` with a 24-hour TTL.

- **Replay (same key, same body-hash)** → cached response is returned
  verbatim (status, headers, body).
- **Conflict (same key, different body-hash)** → `409 conflict`.
- **Missing header on a write** → `400 validation_failed`.
- **GET / OPTIONS / HEAD** → middleware is a no-op.

### Rate limiting

The fixed-window limiter (`apps/api/src/rate-limit.ts`) now:

- defaults to **120 req/min** (up from 60).
- keys on `user:<id>` when `c.get("user")` is populated, falling back to
  `cf-connecting-ip` then `x-forwarded-for` for unauthenticated paths.
- is mounted on the `/v1` sub-app via `v1.use("*", rateLimitMiddleware)`,
  after `authMiddleware` and `idempotencyMiddleware`.

Response headers `x-ratelimit-remaining` and `x-ratelimit-reset` continue
to be emitted; they are now listed in `cors.ts`'s `exposeHeaders`.

### Operational consequences

- Each write hits `APP_KV` twice (read + put) plus the regular handler I/O.
  Acceptable: KV reads cost effectively nothing at our scale, and the cache
  is bounded by user activity × 24 hours.
- The `Idempotency-Key` header is now part of the CORS `exposeHeaders` list,
  so cross-origin SPA clients can read it on replays.
- Tests of write endpoints that do not supply an `Idempotency-Key` will now
  receive `400`. (We are skipping local tests in this repo per current
  policy; live verification is in Phase 9.)

## Alternatives considered

- **Postgres-style serializable transactions** — D1 is single-writer and
  serializable across the whole database, but using that to enforce
  idempotency on a per-key basis still requires a uniqueness constraint on
  `idempotency_key`, plus a separate store of the response body. KV is a
  better fit because we already have it bound.
- **HMAC request signatures** — overkill for an SPA backend. The client
  signs a request body with a shared secret; the server verifies and
  replays. Useful when the client is untrusted, which Phase 6+ won't be
  (mobile app + Clerk session).
- **Offset-based dedup window** — incorrect under concurrent writes. Two
  in-flight requests with the same logical key would each see a fresh
  window and double-write. KV + body-hash is the textbook approach.

## Follow-ups

- Phase 4 may need to extend idempotency to the `receipts.purge` queue
  message (already covered: `user.deleted` is a webhook with its own
  Svix dedup, not an idempotency-keyed write).
- A future admin endpoint should expose the per-user rate-limit window for
  debugging; out of scope for Phase 2.
