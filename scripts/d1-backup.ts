import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const databaseName = process.env.PRODUCTION_D1_DB_NAME;

if (!databaseName) {
  throw new Error("PRODUCTION_D1_DB_NAME is required");
}

mkdirSync("backups", { recursive: true });
const out = join("backups", `${databaseName}-${new Date().toISOString()}.sql`);
const result = spawnSync(
  "pnpm",
  ["wrangler", "d1", "export", databaseName, "--remote", "--output", out],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
