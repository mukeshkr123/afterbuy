// Auth tests run under plain Node (not the workerd pool) to avoid the
// Node 22 / workerd crypto runtime mismatch where private-key exports
// come back as Promises and PrivateKeyObject instances that the worker
// runtime's crypto.sign rejects.
//
// The middleware under test runs in the worker at deploy time, where
// `jose` uses Web Crypto. Here we exercise the verification logic by
// importing the same `jose`-based JWKS path directly with a KeyObject.

import { createHash, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SignJWT, exportJWK, jwtVerify, createRemoteJWKSet } from "jose";
import { Webhook } from "svix";
import type { Env } from "../src/env";
import { createApp } from "../src/app";

interface FakeUserRow {
  id: string;
  clerkUserId: string;
  email: string | null;
  reminderLeadDays: number;
  pushEnabled: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const userStore = new Map<string, FakeUserRow>();

interface FakeD1Prepared {
  bind(...args: unknown[]): FakeD1Prepared;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface FakeD1Statement {
  prepare(sql: string): FakeD1Prepared;
}

function makePrepared(sql: string): FakeD1Prepared {
  let boundArgs: unknown[] = [];
  const exec = async <T>(): Promise<{ results: T[] }> => {
    if (/FROM\s+users/i.test(sql) && /WHERE/i.test(sql)) {
      const where =
        sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+RETURNING|$)/i)?.[1] ??
        "";
      const results = Array.from(userStore.values()).filter((row) =>
        matchesWhere(row, where, boundArgs)
      );
      return { results: results as unknown as T[] };
    }
    if (/INSERT\s+INTO\s+users/i.test(sql)) {
      const cols = (sql.match(/\(([^)]+)\)\s*VALUES/i)?.[1] ?? "")
        .split(",")
        .map((c) => c.trim());
      const row = Object.fromEntries(
        cols.map((c, i) => [c, boundArgs[i]])
      ) as FakeUserRow;
      if (!userStore.has(row.clerkUserId)) {
        userStore.set(row.clerkUserId, row);
      }
      return { results: [] as T[] };
    }
    if (/UPDATE\s+users\s+SET/i.test(sql)) {
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE\s+(.+)/i);
      if (!setMatch) return { results: [] as T[] };
      const setClause = setMatch[1] ?? "";
      const whereClause = setMatch[2] ?? "";
      const setParts = setClause.split(",").map((p) => p.trim());
      const updates: Record<string, unknown> = {};
      let setArgIndex = 0;
      for (const part of setParts) {
        const eq = /^([\w_]+)\s*=\s*\?$/i.exec(part);
        if (eq) {
          updates[eq[1]!] = boundArgs[setArgIndex++];
        }
      }
      const whereArgs = boundArgs.slice(setArgIndex);
      for (const row of userStore.values()) {
        if (matchesWhere(row, whereClause, whereArgs)) {
          Object.assign(row, updates);
        }
      }
      return { results: [] as T[] };
    }
    return { results: [] as T[] };
  };
  return {
    bind(...args: unknown[]) {
      boundArgs = args;
      return this;
    },
    async first() {
      const { results } = await exec<{ [k: string]: unknown }>();
      return (results[0] ?? null) as never;
    },
    async all() {
      return exec();
    },
    async run() {
      await exec();
      return { success: true };
    },
  };
}

function matchesWhere(
  row: FakeUserRow,
  where: string,
  args: unknown[]
): boolean {
  const conds = where.split(/\s+AND\s+/i);
  let argIdx = 0;
  for (const condRaw of conds) {
    const cond = condRaw.trim();
    const eq = /^([\w_]+)\s*=\s*\?$/i.exec(cond);
    const isNull = /([\w_]+)\s+IS\s+NULL/i.exec(cond);
    if (eq) {
      const col = eq[1]!;
      const arg = args[argIdx++];
      if ((row as unknown as Record<string, unknown>)[col] !== arg)
        return false;
    } else if (isNull) {
      const col = isNull[1]!;
      if ((row as unknown as Record<string, unknown>)[col] !== null)
        return false;
    } else {
      return false;
    }
  }
  return true;
}

function fakeDb(): D1Database {
  return {
    prepare(sql: string) {
      return makePrepared(sql) as unknown as D1PreparedStatement;
    },
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    withSession: () => fakeDb(),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

function fakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({
      value: null,
      metadata: null,
      cacheStatus: null,
    }),
  } as unknown as KVNamespace;
}

function envForAuth(overrides: Partial<Env> = {}): Env {
  return {
    DB: fakeDb(),
    STORAGE: {} as R2Bucket,
    APP_KV: fakeKv(),
    REMINDER_QUEUE: { send: vi.fn(async () => undefined) } as unknown as Queue,
    REMINDER_DLQ: { send: vi.fn(async () => undefined) } as unknown as Queue,
    ALLOWED_ORIGINS: "https://example.com",
    APP_STAGE: "test",
    REMINDER_QUEUE_NAME: "acme-test-example-queue",
    REMINDER_DLQ_NAME: "acme-test-example-dlq",
    DAILY_CRON_EXPRESSION: "0 2 * * *",
    CLERK_ISSUER: "https://clerk.test",
    CLERK_JWKS_URL: "https://clerk.test/.well-known/jwks.json",
    CLERK_ALLOWED_AZP: "",
    CLERK_WEBHOOK_SECRET: WEBHOOK_SECRET,
    ...overrides,
  };
}

const WEBHOOK_SECRET = `whsec_${createHash("sha256")
  .update("test_secret_for_svix")
  .digest("base64")
  .replace(/=+$/, "")}`;

interface TestKeys {
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
  publicJwk: Awaited<ReturnType<typeof exportJWK>>;
  kid: string;
}

let keys: TestKeys;

beforeEach(async () => {
  userStore.clear();
  const kp = generateKeyPairSync("ec", { namedCurve: "P-256" });
  // exportJWK on a public key is sync-ish in Node; await to be safe.
  const jwk = await exportJWK(kp.publicKey);
  jwk.kid = "test-key-1";
  jwk.alg = "ES256";
  jwk.use = "sig";
  keys = { privateKey: kp.privateKey, publicJwk: jwk, kid: "test-key-1" };
  const jwksBody = JSON.stringify({ keys: [jwk] });
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.href;
      } else if (input && typeof input === "object" && "url" in input) {
        url = (input as any).url;
      } else {
        url = String(input);
      }
      if (url === "https://clerk.test/.well-known/jwks.json") {
        return new Response(jwksBody, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return originalFetch(input as RequestInfo);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Helper to wait for the async beforeEach to populate `keys`.
async function ensureKeys(): Promise<TestKeys> {
  for (let i = 0; i < 50; i++) {
    if (keys) return keys;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("keys never initialised");
}

async function signJwt(
  payload: Record<string, unknown>,
  overrides: Partial<{ expiresIn: string; issuedAtOffset: number }> = {}
): Promise<string> {
  const k = await ensureKeys();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", kid: k.kid })
    .setIssuer("https://clerk.test")
    .setAudience("test-audience")
    .setIssuedAt(
      Math.floor(Date.now() / 1000) + (overrides.issuedAtOffset ?? 0)
    )
    .setExpirationTime(overrides.expiresIn ?? "5m")
    .sign(k.privateKey);
}

describe("auth middleware", () => {
  test("returns 401 when Authorization header is missing", async () => {
    const res = await createApp().request("/v1/me", {}, envForAuth());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
  });

  test("returns 503 auth_not_configured when Clerk env is empty", async () => {
    const res = await createApp().request(
      "/v1/me",
      {},
      envForAuth({ CLERK_ISSUER: "", CLERK_JWKS_URL: "" })
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("auth_not_configured");
  });

  test("returns 401 for an expired token", async () => {
    const token = await signJwt(
      { sub: "user_expired" },
      { issuedAtOffset: -3600, expiresIn: "-60s" }
    );
    const res = await createApp().request(
      "/v1/me",
      { headers: { authorization: `Bearer ${token}` } },
      envForAuth()
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
  });

  test("returns 401 for a token with the wrong issuer", async () => {
    const k = await ensureKeys();
    const token = await new SignJWT({ sub: "user_wrong_iss" })
      .setProtectedHeader({ alg: "ES256", kid: k.kid })
      .setIssuer("https://evil.example")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(k.privateKey);
    const res = await createApp().request(
      "/v1/me",
      { headers: { authorization: `Bearer ${token}` } },
      envForAuth()
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
  });

  test("provisions a user on first valid call and returns it on second call without re-inserting", async () => {
    const token = await signJwt({ sub: "user_jit_1", email: "jit1@test" });
    const env = envForAuth();

    const first = await createApp().request(
      "/v1/me",
      { headers: { authorization: `Bearer ${token}` } },
      env
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.clerkUserId).toBe("user_jit_1");
    expect(firstBody.email).toBe("jit1@test");
    expect(firstBody.reminderLeadDays).toBe(7);
    expect(userStore.size).toBe(1);

    const second = await createApp().request(
      "/v1/me",
      { headers: { authorization: `Bearer ${token}` } },
      env
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.id).toBe(firstBody.id);
    expect(userStore.size).toBe(1);
  });

  test("returns 403 when APP_STAGE=prod and azp is not in CLERK_ALLOWED_AZP", async () => {
    const token = await signJwt({ sub: "user_prod_azp", azp: "evil-frontend" });
    const res = await createApp().request(
      "/v1/me",
      { headers: { authorization: `Bearer ${token}` } },
      envForAuth({
        APP_STAGE: "prod",
        CLERK_ALLOWED_AZP: "good-frontend,other-good",
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
  });

  test("returns 200 in prod when azp is in CLERK_ALLOWED_AZP", async () => {
    const token = await signJwt({ sub: "user_prod_ok", azp: "good-frontend" });
    const res = await createApp().request(
      "/v1/me",
      { headers: { authorization: `Bearer ${token}` } },
      envForAuth({
        APP_STAGE: "prod",
        CLERK_ALLOWED_AZP: "good-frontend,other-good",
      })
    );
    expect(res.status).toBe(200);
  });

  test("jose jwtVerify is the integration point: a real key + JWKS path round-trips", async () => {
    const k = await ensureKeys();
    const jwks = createRemoteJWKSet(
      new URL("https://clerk.test/.well-known/jwks.json")
    );
    const token = await signJwt({ sub: "round_trip" });
    const { payload } = await jwtVerify(token, jwks, {
      issuer: "https://clerk.test",
    });
    expect(payload.sub).toBe("round_trip");
  });
});

describe("Clerk webhook", () => {
  test("returns 401 when Svix headers are missing", async () => {
    const res = await createApp().request(
      "/v1/webhooks/clerk",
      { method: "POST", body: "{}" },
      envForAuth()
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
  });

  test("returns 200 on user.deleted with valid signature and soft-deletes the user", async () => {
    userStore.set("user_to_delete", {
      id: "id_1",
      clerkUserId: "user_to_delete",
      email: "x@y.com",
      reminderLeadDays: 7,
      pushEnabled: 1,
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    const payload = JSON.stringify({
      type: "user.deleted",
      data: { id: "user_to_delete", deleted: true },
    });
    const wh = new Webhook(WEBHOOK_SECRET);
    const headers = wh.sign("msg_id_1", new Date(), payload);

    const res = await createApp().request(
      "/v1/webhooks/clerk",
      {
        method: "POST",
        body: payload,
        headers: {
          "content-type": "application/json",
          ...headers,
        },
      },
      envForAuth()
    );

    expect(res.status).toBe(200);
    expect(userStore.get("user_to_delete")?.deletedAt).not.toBeNull();
  });

  test("returns 401 when the body is tampered after signing", async () => {
    const payload = JSON.stringify({
      type: "user.updated",
      data: { id: "user_tamper" },
    });
    const wh = new Webhook(WEBHOOK_SECRET);
    const headers = wh.sign("msg_id_2", new Date(), payload);
    const tampered = payload + " ";

    const res = await createApp().request(
      "/v1/webhooks/clerk",
      {
        method: "POST",
        body: tampered,
        headers: {
          "content-type": "application/json",
          ...headers,
        },
      },
      envForAuth()
    );

    expect(res.status).toBe(401);
  });

  test("returns 200 on unknown event types (ack-and-ignore)", async () => {
    const payload = JSON.stringify({
      type: "session.created",
      data: { id: "session_xyz" },
    });
    const wh = new Webhook(WEBHOOK_SECRET);
    const headers = wh.sign("msg_id_3", new Date(), payload);

    const res = await createApp().request(
      "/v1/webhooks/clerk",
      {
        method: "POST",
        body: payload,
        headers: {
          "content-type": "application/json",
          ...headers,
        },
      },
      envForAuth()
    );

    expect(res.status).toBe(200);
  });
});
