import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    exclude: ["**/node_modules/**", "test/auth.test.ts"],
    server: {
      deps: {
        external: ["node-fetch"],
      },
    },
  },
  ssr: {
    external: ["cloudflare:test"],
  },
});
