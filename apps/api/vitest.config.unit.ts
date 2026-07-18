import { defineConfig } from "vitest/config";

// Separate config so auth tests run under Node directly, avoiding
// workerd/Node 22 crypto mismatches in @cloudflare/vitest-pool-workers
// (private key exports return Promises that the pool runtime mishandles).
export default defineConfig({
  test: {
    include: ["test/auth.test.ts"],
    environment: "node",
  },
});
