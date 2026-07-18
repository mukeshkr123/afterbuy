import { readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

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

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    console.log(`Executing migration: ${file}`);
    execSync(
      `pnpm wrangler d1 execute DB --local --config ${wranglerConfig} --file=${filePath}`,
      {
        stdio: "inherit",
      }
    );
  }

  console.log("Local D1 schema initialized successfully.");
} catch (error) {
  console.error("Migration execution failed:", error);
  process.exit(1);
}
