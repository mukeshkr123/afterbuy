import { readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);

let email: string | null = null;
let token: string | null = process.env.LOCAL_AUTH_TOKEN ?? null;
let apiBaseUrl =
  process.env.LOCAL_API_BASE_URL?.trim() || "http://localhost:8787";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--email") {
    email = args[index + 1] ?? null;
    index += 1;
    continue;
  }
  if (arg === "--token") {
    token = args[index + 1] ?? null;
    index += 1;
    continue;
  }
  if (arg === "--api-base-url") {
    apiBaseUrl = args[index + 1] ?? apiBaseUrl;
    index += 1;
    continue;
  }
}

if (!email) {
  throw new Error(
    "Usage: pnpm seed:local:demo -- --email you@example.com [--token local-dev-token] [--api-base-url http://localhost:8787]"
  );
}

if (!token) {
  token = readLocalAuthToken();
}

if (!token) {
  throw new Error(
    "LOCAL_AUTH_TOKEN is required. Set it in apps/api/.dev.vars, export LOCAL_AUTH_TOKEN, or pass --token."
  );
}

const response = await fetch(
  `${apiBaseUrl.replace(/\/$/, "")}/dev/seed-demo-user`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-local-seed-token": token,
    },
    body: JSON.stringify({
      email,
      includeReceipts: true,
      mode: "append",
    }),
  }
);

const bodyText = await response.text();
let body: unknown = null;
try {
  body = bodyText ? JSON.parse(bodyText) : null;
} catch {
  body = bodyText;
}

if (!response.ok) {
  console.error(body);
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));

function readLocalAuthToken(): string | null {
  const devVarsPath = join(process.cwd(), "apps/api/.dev.vars");
  try {
    const source = readFileSync(devVarsPath, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex < 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key === "LOCAL_AUTH_TOKEN") {
        return value.replace(/^['"]|['"]$/g, "");
      }
    }
    return null;
  } catch {
    return null;
  }
}
