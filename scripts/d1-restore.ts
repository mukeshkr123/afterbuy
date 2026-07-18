import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { reorderD1Export } from "./d1-sql-reorder";

const databaseName = process.env.PRODUCTION_D1_DB_NAME;
const input = process.argv[2];

if (!databaseName) {
  throw new Error("PRODUCTION_D1_DB_NAME is required");
}

if (!input) {
  throw new Error("Usage: pnpm db:restore <backup.sql>");
}

const reordered = `${input}.d1-reordered.sql`;
writeFileSync(reordered, reorderD1Export(readFileSync(input, "utf8")));

const result = spawnSync(
  "pnpm",
  ["wrangler", "d1", "execute", databaseName, "--remote", "--file", reordered],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
