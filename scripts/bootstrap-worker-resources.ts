import { spawnSync } from "node:child_process";

const queues = ["afterbuy-prod-reminder-queue", "afterbuy-prod-reminder-dlq"];

const listed = run(["queues", "list"]);

for (const queue of queues) {
  if (new RegExp(`\\b${queue}\\b`).test(listed)) {
    console.log(`Queue already exists: ${queue}`);
    continue;
  }

  console.log(`Creating queue: ${queue}`);
  run(["queues", "create", queue]);
}

console.log("Production Worker queue bootstrap complete.");

function run(args: string[]): string {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    process.stderr.write(output);
    process.exit(result.status ?? 1);
  }

  return output;
}
