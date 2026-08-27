const environment = process.argv[2] ?? "production";

const secrets = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLERK_WEBHOOK_SECRET",
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
  "IOS_DIST_CERT_BASE64",
  "IOS_DIST_CERT_PASSWORD",
  "IOS_PROVISIONING_PROFILE_BASE64",
];

const variables = [
  "PRODUCTION_D1_DB_NAME",
  "API_SMOKE_URL",
  "CLERK_ISSUER",
  "CLERK_JWKS_URL",
  "CLERK_ALLOWED_AZP",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_PUSH_ENABLED",
  "EXPO_PUBLIC_SUPPORT_EMAIL",
  "IOS_TEAM_ID",
  "IOS_PROVISIONING_PROFILE_NAME",
  "IOS_EXPORT_METHOD",
];

console.log(`# GitHub Environment bootstrap for ${environment}`);
console.log("# Run these commands and provide values interactively.");

for (const secret of secrets) {
  console.log(`gh secret set ${secret} --env ${environment}`);
}

for (const variable of variables) {
  console.log(`gh variable set ${variable} --env ${environment}`);
}
