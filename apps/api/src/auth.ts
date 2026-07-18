import type { Context, MiddlewareHandler } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { users, uuidv7 } from "@acme/db";
import type { DbClient } from "@acme/db";
import { createDbClient } from "@acme/db";
import type { Env } from "./env";
import { apiError } from "./errors";

export interface AuthedUser {
  id: string;
  clerkUserId: string;
}

export interface AuthedVariables {
  requestId: string;
  user: AuthedUser;
}

export type AuthedEnv = {
  Bindings: Env;
  Variables: AuthedVariables;
};

export type AuthedContext = Context<AuthedEnv>;

interface JwtVerifyOk {
  ok: true;
  payload: JWTPayload;
}

interface JwtVerifyErr {
  ok: false;
  reason: "missing_token" | "verification_failed" | "azp_denied";
}

const JWKS_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const USER_CACHE_TTL_SECONDS = 60 * 5;

function jwksFor(
  env: Pick<Env, "CLERK_JWKS_URL">
): ReturnType<typeof createRemoteJWKSet> {
  return createRemoteJWKSet(new URL(env.CLERK_JWKS_URL), {
    cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
    cooldownDuration: 30_000,
  });
}

export function extractBearerToken(request: Request): string | null {
  const header =
    request.headers.get("Authorization") ??
    request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? (match[1]?.trim() ?? null) : null;
}

export async function verifyJwt(
  env: Pick<
    Env,
    "CLERK_ISSUER" | "CLERK_JWKS_URL" | "CLERK_ALLOWED_AZP" | "APP_STAGE"
  >,
  token: string
): Promise<JwtVerifyOk | JwtVerifyErr> {
  if (!env.CLERK_ISSUER || !env.CLERK_JWKS_URL) {
    return { ok: false, reason: "missing_token" };
  }
  try {
    const jwks = jwksFor(env);
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.CLERK_ISSUER,
    });

    if (env.APP_STAGE !== "prod") {
      return { ok: true, payload };
    }

    const allowedAzp = parseAllowedAzp(env.CLERK_ALLOWED_AZP);
    const azp = typeof payload.azp === "string" ? payload.azp : null;
    if (!azp || !allowedAzp.has(azp)) {
      return { ok: false, reason: "azp_denied" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "verification_failed" };
  }
}

function parseAllowedAzp(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export async function findOrProvisionUser(
  db: DbClient,
  clerkUserId: string,
  payload: { email?: string | null; timezone?: string | null }
): Promise<AuthedUser> {
  const existing = await db
    .select({ id: users.id, clerkUserId: users.clerkUserId })
    .from(users)
    .where(and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)))
    .get();
  if (existing) {
    return { id: existing.id, clerkUserId: existing.clerkUserId };
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  // TODO(phase2): replace with uuidv7 once purchases need ordered cursors.
  try {
    await db.insert(users).values({
      id,
      clerkUserId,
      email: payload.email ?? null,
      reminderLeadDays: 7,
      pushEnabled: 1,
      timezone: payload.timezone ?? "UTC",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    return { id, clerkUserId };
  } catch {
    const winner = await db
      .select({ id: users.id, clerkUserId: users.clerkUserId })
      .from(users)
      .where(and(eq(users.clerkUserId, clerkUserId), isNull(users.deletedAt)))
      .get();
    if (winner) {
      return { id: winner.id, clerkUserId: winner.clerkUserId };
    }
    throw new Error("Failed to provision or find user");
  }
}

export async function cachedFindOrProvisionUser(
  env: Pick<Env, "APP_KV">,
  db: DbClient,
  clerkUserId: string,
  payload: { email?: string | null; timezone?: string | null }
): Promise<AuthedUser> {
  const cacheKey = `user:by-clerk-id:${clerkUserId}`;
  if (env.APP_KV) {
    const cached = await env.APP_KV.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AuthedUser;
        if (parsed.clerkUserId === clerkUserId) {
          return parsed;
        }
      } catch {
        // fall through to live lookup
      }
    }
  }

  const user = await findOrProvisionUser(db, clerkUserId, payload);

  if (env.APP_KV) {
    await env.APP_KV.put(cacheKey, JSON.stringify(user), {
      expirationTtl: USER_CACHE_TTL_SECONDS,
    });
  }

  return user;
}

export const authMiddleware: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  if (!c.env.CLERK_ISSUER || !c.env.CLERK_JWKS_URL) {
    return apiError(
      c,
      503,
      "auth_not_configured",
      "Authentication is not configured"
    );
  }

  const token = extractBearerToken(c.req.raw);
  if (!token) {
    return apiError(c, 401, "unauthenticated", "Missing bearer token");
  }

  const result = await verifyJwt(c.env, token);
  if (!result.ok) {
    if (result.reason === "azp_denied") {
      return apiError(c, 403, "forbidden", "Authorized party not allowed");
    }
    return apiError(c, 401, "unauthenticated", "Invalid or expired token");
  }

  const sub =
    typeof result.payload.sub === "string" ? result.payload.sub : null;
  if (!sub) {
    return apiError(c, 401, "unauthenticated", "Token missing subject");
  }

  const db = createDbClient(c.env.DB);
  const email =
    typeof result.payload.email === "string" ? result.payload.email : null;
  const tz =
    typeof (result.payload as { time_zone?: unknown }).time_zone === "string"
      ? (result.payload as { time_zone: string }).time_zone
      : null;

  const user = await cachedFindOrProvisionUser(c.env, db, sub, {
    email,
    timezone: tz,
  });
  c.set("user", user);

  await next();
  return;
};
