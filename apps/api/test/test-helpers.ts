import { env } from "cloudflare:test";
import { createApp } from "../src/app";
import type { Env } from "../src/env";

import sqlLaunchBaseline from "../../../packages/db/drizzle/0000_launch_baseline.sql?raw";

let initPromise: Promise<void> | null = null;

function makeIdempotent(sql: string): string {
  return sql
    .replace(
      /\bCREATE\s+TABLE\s+(\x60[a-zA-Z0-9_$-]+\x60)/gi,
      "CREATE TABLE IF NOT EXISTS $1"
    )
    .replace(
      /\bCREATE\s+UNIQUE\s+INDEX\s+(\x60[a-zA-Z0-9_$-]+\x60)/gi,
      "CREATE UNIQUE INDEX IF NOT EXISTS $1"
    )
    .replace(
      /\bCREATE\s+INDEX\s+(\x60[a-zA-Z0-9_$-]+\x60)/gi,
      "CREATE INDEX IF NOT EXISTS $1"
    )
    .replace(
      /\bDROP\s+TABLE\s+(\x60[a-zA-Z0-9_$-]+\x60)/gi,
      "DROP TABLE IF EXISTS $1"
    );
}

export function initTestDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const migrations = [sqlLaunchBaseline];
      for (const sql of migrations) {
        const statements = sql.split("--> statement-breakpoint");
        for (const stmt of statements) {
          const cleaned = makeIdempotent(
            stmt.replace(/\n/g, " ").replace(/\s+/g, " ").trim()
          );
          if (cleaned) {
            try {
              await env.DB.exec(cleaned);
            } catch (err) {
              console.error(
                "Migration execution failed for statement:",
                cleaned,
                err
              );
              throw err;
            }
          }
        }
      }
    })();
  }
  return initPromise;
}

export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    ...env,
    APP_STAGE: "local",
    LOCAL_AUTH_ENABLED: "true",
    LOCAL_AUTH_TOKEN: "test-token",
    RATE_LIMIT_ENABLED: "false",
    CLERK_WEBHOOK_SECRET: "clerk-secret",
    DAILY_CRON_EXPRESSION: "0 2 * * *",
    ALLOWED_ORIGINS: "*",
    ...overrides,
  };
}

export async function requestApp(
  path: string,
  method: string = "GET",
  body: unknown = null,
  headers: Record<string, string> = {}
) {
  await initTestDb();
  const init: RequestInit = {
    method,
    headers: {
      Authorization: "Bearer test-token",
      ...headers,
    },
  };

  const writeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
  const normalizedHeaders = init.headers as Record<string, string>;
  const hasIdempotencyHeader = Object.keys(normalizedHeaders).some(
    (h) => h.toLowerCase() === "idempotency-key"
  );
  if (writeMethods.has(method.toUpperCase()) && !hasIdempotencyHeader) {
    normalizedHeaders["Idempotency-Key"] = crypto.randomUUID();
  }

  if (body) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      normalizedHeaders["Content-Type"] = "application/json";
    }
  }

  const app = createApp();
  const res = await app.request(path, init, testEnv());
  return res;
}
