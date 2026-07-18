import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const migrationsDir = "packages/db/drizzle";
const wranglerConfig = "apps/api/wrangler.jsonc";

try {
  // Read and sort migrations
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    process.exit(0);
  }

  console.log(
    `Found ${files.length} migrations. Applying to local D1 store...`
  );

  const tempDir = mkdtempSync(join(tmpdir(), "acme-local-d1-"));
  const tempFile = join(tempDir, "local-init.sql");
  const sql = files
    .map((file) => {
      const filePath = join(migrationsDir, file);
      console.log(`Preparing migration: ${file}`);
      return `-- ${file}\n${makeIdempotent(readFileSync(filePath, "utf8"))}`;
    })
    .join("\n--> statement-breakpoint\n");

  try {
    writeFileSync(tempFile, sql);
    executeMigrationFile(tempFile);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("Local D1 schema initialized successfully.");
} catch (error) {
  console.error("Migration execution failed:", error);
  process.exit(1);
}

function executeMigrationFile(filePath: string): void {
  const result = spawnSync(
    "pnpm",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      wranglerConfig,
      "--file",
      filePath,
    ],
    { stdio: "inherit" }
  );

  if (result.status === 0) {
    return;
  }

  throw new Error(`Local D1 migration file failed: ${filePath}`);
}

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
