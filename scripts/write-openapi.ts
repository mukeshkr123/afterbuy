import { mkdirSync, writeFileSync } from "node:fs";
import { createApp } from "../apps/api/src/app";

const response = await createApp().request("/openapi.json", {}, {
  ALLOWED_ORIGINS: "",
  APP_STAGE: "local",
  CLERK_ISSUER: "",
  CLERK_JWKS_URL: "",
  CLERK_ALLOWED_AZP: "",
  CLERK_WEBHOOK_SECRET: "",
} as never);

if (!response.ok) {
  throw new Error(`OpenAPI generation failed with ${response.status}`);
}

mkdirSync("docs", { recursive: true });
writeFileSync(
  "docs/openapi.json",
  `${JSON.stringify(await response.json(), null, 2)}\n`
);
console.log("Wrote docs/openapi.json");
