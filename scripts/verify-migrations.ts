import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const baseRef = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : "HEAD~1";

if (!existsSync(".git")) {
  console.log("Skipping migration history guard outside a git repository");
  process.exit(0);
}

try {
  execFileSync("git", ["rev-parse", "--verify", baseRef], {
    stdio: "ignore",
  });
} catch {
  console.log(`Skipping migration history guard; ${baseRef} is not available`);
  process.exit(0);
}

const changed = execFileSync(
  "git",
  ["diff", "--name-status", baseRef, "--", "packages/db/drizzle"],
  { encoding: "utf8" }
)
  .trim()
  .split("\n")
  .filter(Boolean);

// The journal and snapshot JSON files are updated by drizzle-kit on every
// new migration; only flag deletes or modifies of the SQL migration files
// themselves, which are the append-only records.
const forbidden = changed.filter((line) => {
  const m = /^[DM]\s+(.+)$/.exec(line);
  return m ? /\.sql$/.test(m[1]!) : false;
});

if (forbidden.length > 0) {
  throw new Error(
    `D1 migrations are append-only. Deleted/modified migrations:\n${forbidden.join("\n")}`
  );
}

console.log("Migration history guard passed");
